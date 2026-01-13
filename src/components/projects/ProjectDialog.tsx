import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Project, User, Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Users, Crown } from "lucide-react";
import { SearchableUserMultiSelect } from "@/components/projects/SearchableUserMultiSelect";
import { useTeamMembers } from "@/hooks/useWorkManagement";
import { teamMembers as allTeamMembers } from "@/data/workManagementConfig";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  availableMembers: User[];
  teams: Team[];
  selectedTeamId?: string;
  project?: Project; // If provided, we're editing
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

export function ProjectDialog({ open, onOpenChange, onSubmit, availableMembers, teams, selectedTeamId, project }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(projectColors[0]);
  const [selectedOwners, setSelectedOwners] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [teamId, setTeamId] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isEditing = !!project;

  // Fetch team members for the selected team
  const { data: teamMembersData } = useTeamMembers(teamId || null);

  // Convert team members to User objects
  const filteredMembers = useMemo(() => {
    if (!teamMembersData || teamMembersData.length === 0) return [];
    
    return teamMembersData.map(tm => {
      // Find matching user from allTeamMembers config
      const found = allTeamMembers.find(m => m.name === tm.userName || m.name.startsWith(tm.userName.split(' ')[0]));
      if (found) return found;
      
      // Create a basic user object for unknown names
      return {
        id: tm.userName.toLowerCase().replace(/\s+/g, '-'),
        name: tm.userName,
        email: `${tm.userName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
        role: (tm.role === 'super-admin' ? 'super-admin' : tm.role === 'admin' ? 'admin' : 'staff') as User['role'],
      };
    });
  }, [teamMembersData]);

  // Populate form when editing or reset when creating
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setColor(project.color || projectColors[0]);
      setSelectedOwners(project.owners || []);
      setSelectedMembers(project.members || []);
      setTeamId(project.teamId || "");
    } else {
      setName("");
      setDescription("");
      setColor(projectColors[0]);
      setSelectedOwners([]);
      setSelectedMembers([]);
      setTeamId(selectedTeamId || teams[0]?.id || "");
    }
    setHasAttemptedSubmit(false);
  }, [project, open, selectedTeamId, teams]);

  // Clear selected owners and members when team changes (unless editing)
  useEffect(() => {
    if (!isEditing && teamId) {
      setSelectedOwners([]);
      setSelectedMembers([]);
    }
  }, [teamId, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    // Validate required fields - at least one owner required
    if (!teamId || selectedOwners.length === 0) {
      return;
    }
    
    onSubmit({
      name,
      description,
      color,
      owners: selectedOwners,
      members: selectedMembers,
      teamId,
    });
    
    // Reset form
    setName("");
    setDescription("");
    setColor(projectColors[0]);
    setSelectedOwners([]);
    setSelectedMembers([]);
    setTeamId(selectedTeamId || teams[0]?.id || "");
    setHasAttemptedSubmit(false);
    onOpenChange(false);
  };

  const toggleOwner = (member: User) => {
    // If already an owner, remove from owners
    if (selectedOwners.find(m => m.id === member.id)) {
      setSelectedOwners(prev => prev.filter(m => m.id !== member.id));
    } else {
      // Add as owner, remove from members if present
      setSelectedOwners(prev => [...prev, member]);
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const toggleMember = (member: User) => {
    // If already a member, remove from members
    if (selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    } else {
      // Add as member, remove from owners if present
      setSelectedMembers(prev => [...prev, member]);
      setSelectedOwners(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const removeOwner = (memberId: string) => {
    setSelectedOwners(prev => prev.filter(m => m.id !== memberId));
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const selectAllAsOwners = () => {
    setSelectedOwners(filteredMembers);
    setSelectedMembers([]);
  };

  const selectAllAsMembers = () => {
    // Add all team members as members, EXCEPT those already assigned as leads
    const nonLeadMembers = filteredMembers.filter(
      (m) => !selectedOwners.find((o) => o.id === m.id)
    );
    setSelectedMembers(nonLeadMembers);
  };

  // Get available members for each role (excluding those already selected in the other role)
  const availableForOwner = filteredMembers.filter(m => !selectedMembers.find(sm => sm.id === m.id));
  const availableForMember = filteredMembers.filter(m => !selectedOwners.find(so => so.id === m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 top-[10%] translate-y-0 data-[state=open]:slide-in-from-top-[5%] data-[state=closed]:slide-out-to-top-[5%]">
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
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Team <span className="text-destructive">*</span></Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className={cn(
                    "h-9 text-sm border-border/50 bg-transparent flex-1",
                    hasAttemptedSubmit && !teamId && "border-destructive"
                  )}>
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

              {/* Lead */}
              <div className="flex items-start gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0 pt-1">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Lead <span className="text-destructive">*</span>
                  </span>
                </Label>
                <div className="flex-1">
                  <SearchableUserMultiSelect
                    items={availableForOwner.filter(
                      (m) => !selectedOwners.find((o) => o.id === m.id),
                    )}
                    selected={selectedOwners}
                    onToggle={toggleOwner}
                    disabled={!teamId || filteredMembers.length === 0}
                    placeholder={
                      !teamId
                        ? "Select a team first"
                        : filteredMembers.length === 0
                          ? "No members in team"
                          : "Add lead..."
                    }
                    searchPlaceholder="Search leads..."
                  />

                  {hasAttemptedSubmit && selectedOwners.length === 0 && (
                    <p className="mt-1 text-xs text-destructive">Lead is required.</p>
                  )}

                  {selectedOwners.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {selectedOwners.map((owner) => (
                        <Badge
                          key={owner.id}
                          variant="secondary"
                          className="gap-1 pr-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        >
                          <Crown className="w-3 h-3" />
                          {owner.name}
                          <button
                            type="button"
                            onClick={() => removeOwner(owner.id)}
                            className="ml-0.5 hover:bg-amber-500/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="flex items-start gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0 pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Members
                  </span>
                </Label>
                <div className="flex-1">
                  <SearchableUserMultiSelect
                    items={availableForMember}
                    selected={selectedMembers}
                    onToggle={toggleMember}
                    disabled={!teamId || filteredMembers.length === 0}
                    placeholder={
                      !teamId
                        ? "Select a team first"
                        : filteredMembers.length === 0
                          ? "No members in team"
                          : "Add member..."
                    }
                    searchPlaceholder="Search members..."
                    prependItem={{
                      value: "__all__",
                      onSelect: selectAllAsMembers,
                      label: (
                        <span className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          All Team Members
                        </span>
                      ),
                    }}
                  />

                  {selectedMembers.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {selectedMembers.map((member) => (
                        <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
                          {member.name}
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Create Project'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}