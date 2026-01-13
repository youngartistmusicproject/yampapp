import { useState } from "react";
import { cn } from "@/lib/utils";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (team: Omit<Team, 'id'>) => void;
}

const teamColors = [
  "#6366f1", // indigo
  "#eb5c5c", // coral
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
];

export function TeamDialog({ open, onOpenChange, onSubmit }: TeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(teamColors[0]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    if (!name.trim()) {
      return;
    }
    
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
    
    // Reset form
    setName("");
    setDescription("");
    setColor(teamColors[0]);
    setHasAttemptedSubmit(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          {/* Header area - matches TaskDialog */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              className={cn(
                "w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/60",
                hasAttemptedSubmit && !name.trim() && "placeholder:text-destructive/60"
              )}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full mt-2 text-sm text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Form fields */}
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              {/* Team Color */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Color</Label>
                <div className="flex gap-2 flex-wrap flex-1">
                  {teamColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Team</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}