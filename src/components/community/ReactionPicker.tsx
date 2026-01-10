import React, { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ReactionType = "like" | "love" | "care" | "congrats" | "celebrate" | "insightful";

export interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

export const REACTIONS: Reaction[] = [
  { type: "like", emoji: "👍", label: "Like", color: "text-primary" },
  { type: "love", emoji: "❤️", label: "Love", color: "text-red-500" },
  { type: "care", emoji: "🤗", label: "Care", color: "text-yellow-500" },
  { type: "congrats", emoji: "👏", label: "Congrats", color: "text-green-500" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate", color: "text-purple-500" },
  { type: "insightful", emoji: "💡", label: "Insightful", color: "text-amber-500" },
];

export function getReactionByType(type: string): Reaction {
  return REACTIONS.find((r) => r.type === type) || REACTIONS[0];
}

interface ReactionPickerProps {
  hasReacted: boolean;
  userReaction?: ReactionType;
  onReact: (reactionType: ReactionType) => void;
  onRemoveReaction: () => void;
}

export function ReactionPicker({
  hasReacted,
  userReaction,
  onReact,
  onRemoveReaction,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const currentReaction = userReaction ? getReactionByType(userReaction) : null;

  const handleReactionClick = (reaction: Reaction) => {
    if (hasReacted && userReaction === reaction.type) {
      onRemoveReaction();
    } else {
      onReact(reaction.type);
    }
    setOpen(false);
  };

  const handleButtonClick = () => {
    if (hasReacted) {
      onRemoveReaction();
    } else {
      onReact("like");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-2 relative group ${
            hasReacted && currentReaction
              ? `${currentReaction.color} hover:${currentReaction.color}`
              : "text-muted-foreground"
          }`}
          onClick={handleButtonClick}
          onMouseEnter={() => setOpen(true)}
        >
          {hasReacted && currentReaction ? (
            <>
              <span className="text-lg leading-none">{currentReaction.emoji}</span>
              {currentReaction.label}
            </>
          ) : (
            <>
              <ThumbsUp className="w-5 h-5" />
              Like
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1.5 flex gap-1"
        side="top"
        align="start"
        sideOffset={4}
        onMouseLeave={() => setOpen(false)}
      >
        {REACTIONS.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => handleReactionClick(reaction)}
            className={`flex flex-col items-center p-1.5 rounded-lg transition-all hover:scale-125 hover:bg-secondary ${
              userReaction === reaction.type ? "bg-secondary scale-110" : ""
            }`}
            title={reaction.label}
          >
            <span className="text-2xl leading-none">{reaction.emoji}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface ReactionSummaryProps {
  reactions: Record<string, number>;
  totalCount: number;
}

export function ReactionSummary({ reactions, totalCount }: ReactionSummaryProps) {
  if (totalCount === 0) return null;

  // Get top 3 reactions by count
  const sortedReactions = Object.entries(reactions)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {sortedReactions.map(([type]) => {
          const reaction = getReactionByType(type);
          return (
            <span
              key={type}
              className="w-[18px] h-[18px] rounded-full bg-secondary flex items-center justify-center text-xs border border-background"
            >
              {reaction.emoji}
            </span>
          );
        })}
      </div>
      <span className="ml-1">{totalCount}</span>
    </div>
  );
}
