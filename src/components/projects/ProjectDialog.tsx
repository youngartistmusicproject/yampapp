import { useState } from "react";
import { Project, User, Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  availableMembers: User[];
  teams: Team[];
  selectedTeamId?: string;
}

const projectColors = [
  "#eb5c5c", // primary coral
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function ProjectDialog({ open, onOpenChange, onSubmit, availableMembers, teams, selectedTeamId }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(projectColors[0]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [teamId, setTeamId] = useState(selectedTeamId || teams[0]?.id || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      color,
      members: selectedMembers,
      teamId,
    });
    // Reset form
    setName("");
    setDescription("");
    setColor(projectColors[0]);
    setSelectedMembers([]);
    setTeamId(selectedTeamId || teams[0]?.id || "");
  };

  const toggleMember = (member: User) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
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
              placeholder="Project name"
              className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/60"
              required
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
              {/* Team */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent flex-1">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Color */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Color</Label>
                <div className="flex gap-2 flex-wrap flex-1">
                  {projectColors.map((c) => (
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

              {/* Members */}
              <div className="flex items-start gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0 pt-2">Members</Label>
                <div className="flex-1 space-y-2">
                  {selectedMembers.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedMembers.map((member) => (
                        <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
                          {member.name}
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="border border-border/50 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                    {availableMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                          selectedMembers.find((m) => m.id === member.id)
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{member.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
