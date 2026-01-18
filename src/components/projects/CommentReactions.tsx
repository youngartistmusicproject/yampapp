import { useState } from "react";
import { Smile, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Common emoji reactions for task comments
const EMOJI_OPTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🎉", label: "Party" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "✅", label: "Check" },
  { emoji: "💡", label: "Idea" },
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

  const handleReactionClick = (emoji: string) => {
    onToggleReaction(emoji);
    setPickerOpen(false);
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
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
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
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((option) => (
              <button
                key={option.emoji}
                onClick={() => handleReactionClick(option.emoji)}
                className="p-1.5 rounded hover:bg-muted transition-colors hover:scale-110"
                title={option.label}
              >
                <span className="text-xl leading-none">{option.emoji}</span>
              </button>
            ))}
          </div>
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
