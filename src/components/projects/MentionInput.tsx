import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Textarea } from "@/components/ui/textarea";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { useOrganizationProfiles, PublicProfileWithRoles } from "@/hooks/useProfiles";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

export interface MentionInputRef {
  focus: () => void;
}

interface MentionSuggestion {
  id: string;
  name: string;
  avatar?: string | null;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  ({ value, onChange, onKeyDown, placeholder, className }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStartPos, setMentionStartPos] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const { data: profiles = [] } = useOrganizationProfiles();

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    // Filter suggestions based on query
    const suggestions: MentionSuggestion[] = profiles
      .filter((p) => {
        const fullName = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
        return fullName.includes(mentionQuery.toLowerCase());
      })
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: `${p.first_name}${p.last_name ? " " + p.last_name : ""}`,
        avatar: p.avatar_url,
      }));

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      onChange(newValue);

      // Check if we're typing a mention
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionStartPos(cursorPos - mentionMatch[0].length);
        setMentionQuery(mentionMatch[1]);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionQuery("");
        setMentionStartPos(-1);
      }
    };

    const insertMention = (suggestion: MentionSuggestion) => {
      if (mentionStartPos === -1) return;

      const beforeMention = value.slice(0, mentionStartPos);
      const afterMention = value.slice(
        mentionStartPos + mentionQuery.length + 1 // +1 for the @
      );

      // Insert mention in format @[Name](user_id) - this format is parsed by the trigger
      const mentionText = `@[${suggestion.name}](${suggestion.id}) `;
      const newValue = beforeMention + mentionText + afterMention;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartPos(-1);

      // Focus back and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = beforeMention.length + mentionText.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }

      onKeyDown?.(e);
    };

    // Click outside to close suggestions
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Render display value with styled mentions
    const renderDisplayValue = (text: string) => {
      // Replace @[Name](id) pattern with just @Name for display
      return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
    };

    return (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={renderDisplayValue(value)}
          onChange={(e) => {
            // Need to track the raw value internally but display clean version
            // For simplicity, we store the raw format and display replaces it
            handleInputChange(e);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("resize-none", className)}
        />

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 bottom-full mb-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  index === selectedIndex && "bg-muted"
                )}
                onClick={() => insertMention(suggestion)}
              >
                {suggestion.avatar ? (
                  <img
                    src={suggestion.avatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {suggestion.name.charAt(0)}
                  </div>
                )}
                <span>{suggestion.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = "MentionInput";

// Helper to render comment content with styled mentions and hover profile
export function renderMentionContent(content: string, profiles?: PublicProfileWithRoles[]) {
  // Replace @[Name](id) pattern with styled spans
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      const name = mentionMatch[1];
      const userId = mentionMatch[2];
      const profile = profiles?.find(p => p.id === userId);
      
      return (
        <MentionBadge key={index} name={name} userId={userId} profile={profile} />
      );
    }
    return part;
  });
}

// Separate component for mention badge with hover card
function MentionBadge({ 
  name, 
  userId, 
  profile 
}: { 
  name: string; 
  userId: string; 
  profile?: PublicProfileWithRoles;
}) {
  const user = profile ? {
    id: profile.id,
    name: `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`,
    avatarUrl: profile.avatar_url,
  } : null;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="text-primary font-semibold cursor-pointer hover:underline">
          @{name}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" side="top" align="start">
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <UserAvatar 
                user={{ id: user.id, name: user.name, email: '', role: 'staff', avatar: user.avatarUrl }} 
                size="md" 
                showTooltip={false} 
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                {profile?.roles && profile.roles.length > 0 && (
                  <p className="text-xs text-muted-foreground capitalize">{profile.roles[0]}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{name}</p>
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
