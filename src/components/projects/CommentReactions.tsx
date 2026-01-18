import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

// Quick emoji options for fast access
const QUICK_EMOJIS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🎉", label: "Party" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "👀", label: "Eyes" },
];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[];
}

interface CommentReactionsProps {
  reactions: Reaction[];
  onToggleReaction: (emoji: string) => void;
  size?: "sm" | "default";
}

export function CommentReactions({
  reactions,
  onToggleReaction,
  size = "default",
}: CommentReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleQuickReaction = (emoji: string) => {
    onToggleReaction(emoji);
    setPickerOpen(false);
    setShowFullPicker(false);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onToggleReaction(emojiData.emoji);
    setPickerOpen(false);
    setShowFullPicker(false);
  };

  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggleReaction(reaction.emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border transition-colors",
            isSmall ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
            reaction.hasReacted
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-muted/50 hover:bg-muted"
          )}
          title={reaction.users.join(", ")}
        >
          <span className={isSmall ? "text-sm" : "text-base"}>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={pickerOpen} onOpenChange={(open) => {
        setPickerOpen(open);
        if (!open) setShowFullPicker(false);
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full hover:bg-muted",
              isSmall ? "h-6 w-6" : "h-7 w-7"
            )}
          >
            <Smile className={cn("text-muted-foreground", isSmall ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn("p-0", showFullPicker ? "w-[350px]" : "w-auto p-2")} 
          side="top" 
          align="start"
        >
          {showFullPicker ? (
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={Theme.AUTO}
              width="100%"
              height={350}
              searchPlaceHolder="Search emoji..."
              previewConfig={{ showPreview: false }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {QUICK_EMOJIS.map((option) => (
                  <button
                    key={option.emoji}
                    onClick={() => handleQuickReaction(option.emoji)}
                    className="p-1.5 rounded hover:bg-muted transition-colors hover:scale-110"
                    title={option.label}
                  >
                    <span className="text-xl leading-none">{option.emoji}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFullPicker(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border-t border-border"
              >
                More emojis...
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Compact inline reaction display (for list views)
export function InlineReactions({
  reactions,
  maxDisplay = 3,
}: {
  reactions: Reaction[];
  maxDisplay?: number;
}) {
  if (reactions.length === 0) return null;

  const displayed = reactions.slice(0, maxDisplay);
  const remaining = reactions.length - maxDisplay;
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {displayed.map((r) => (
          <span
            key={r.emoji}
            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs border border-background"
          >
            {r.emoji}
          </span>
        ))}
        {remaining > 0 && (
          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs border border-background font-medium">
            +{remaining}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{totalCount}</span>
    </div>
  );
}
