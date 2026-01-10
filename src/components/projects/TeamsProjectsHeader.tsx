import { useState } from "react";
import { ChevronDown, ChevronRight, Users, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Project, Task, Team } from "@/types";

interface TeamsProjectsHeaderProps {
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  selectedTeam: string;
  selectedProject: string;
  onTeamSelect: (teamId: string) => void;
  onProjectSelect: (projectId: string) => void;
  doneStatusId: string;
}

export function TeamsProjectsHeader({
  teams,
  projects,
  tasks,
  selectedTeam,
  selectedProject,
  onTeamSelect,
  onProjectSelect,
  doneStatusId,
}: TeamsProjectsHeaderProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set(["all"]));

  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  // Calculate project progress
  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    if (projectTasks.length === 0) return { progress: 0, completed: 0, total: 0 };
    
    const completed = projectTasks.filter(
      (t) => t.status === doneStatusId || t.completedAt
    ).length;
    
    return {
      progress: Math.round((completed / projectTasks.length) * 100),
      completed,
      total: projectTasks.length,
    };
  };

  // Calculate team progress (aggregate of all projects)
  const getTeamProgress = (teamId: string) => {
    const teamProjects = projects.filter((p) => p.teamId === teamId);
    const teamProjectIds = teamProjects.map((p) => p.id);
    const teamTasks = tasks.filter((t) => t.projectId && teamProjectIds.includes(t.projectId));
    
    if (teamTasks.length === 0) return { progress: 0, completed: 0, total: 0 };
    
    const completed = teamTasks.filter(
      (t) => t.status === doneStatusId || t.completedAt
    ).length;
    
    return {
      progress: Math.round((completed / teamTasks.length) * 100),
      completed,
      total: teamTasks.length,
    };
  };

  // Get filtered projects for a team
  const getTeamProjects = (teamId: string) => {
    if (teamId === "all") return projects;
    return projects.filter((p) => p.teamId === teamId);
  };

  const isTeamExpanded = (teamId: string) => expandedTeams.has(teamId);

  return (
    <div className="space-y-3">
      {/* Teams Row */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {/* All Teams */}
          <button
            onClick={() => {
              onTeamSelect("all");
              onProjectSelect("all");
              toggleTeamExpand("all");
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all flex-shrink-0",
              selectedTeam === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-secondary border-border"
            )}
          >
            <Users className="w-4 h-4" />
            <span className="font-medium text-sm">All Teams</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isTeamExpanded("all") ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>

          {teams.map((team) => {
            const teamProgress = getTeamProgress(team.id);
            const teamProjects = getTeamProjects(team.id);
            
            return (
              <button
                key={team.id}
                onClick={() => {
                  onTeamSelect(team.id);
                  onProjectSelect("all");
                  toggleTeamExpand(team.id);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all flex-shrink-0 min-w-[140px]",
                  selectedTeam === team.id
                    ? "border-transparent"
                    : "bg-card hover:bg-secondary border-border"
                )}
                style={
                  selectedTeam === team.id
                    ? { backgroundColor: team.color, color: "white" }
                    : {}
                }
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: selectedTeam === team.id ? "white" : team.color,
                    opacity: selectedTeam === team.id ? 0.9 : 1,
                  }}
                />
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                  <span className="font-medium text-sm truncate">{team.name}</span>
                  <div className="flex items-center gap-1.5 w-full">
                    <div 
                      className="h-1 flex-1 rounded-full overflow-hidden min-w-[40px]"
                      style={{ 
                        backgroundColor: selectedTeam === team.id ? "rgba(255,255,255,0.3)" : "hsl(var(--secondary))" 
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${teamProgress.progress}%`,
                          backgroundColor: selectedTeam === team.id ? "white" : team.color,
                        }}
                      />
                    </div>
                    <span 
                      className={cn(
                        "text-[10px] tabular-nums",
                        selectedTeam === team.id ? "text-white/80" : "text-muted-foreground"
                      )}
                    >
                      {teamProgress.progress}%
                    </span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 px-1.5 text-[10px] ml-1",
                    selectedTeam === team.id && "bg-white/20 text-white border-0"
                  )}
                >
                  {teamProjects.length}
                </Badge>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform flex-shrink-0",
                    isTeamExpanded(team.id) ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Projects Row - Show when team is expanded */}
      {(isTeamExpanded(selectedTeam) || selectedTeam === "all") && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {/* All Projects */}
            <button
              onClick={() => onProjectSelect("all")}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all flex-shrink-0",
                selectedProject === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-secondary border-border"
              )}
            >
              <FolderKanban className="w-4 h-4" />
              <span className="font-medium text-sm">All Projects</span>
            </button>

            {getTeamProjects(selectedTeam).map((project) => {
              const projectProgress = getProjectProgress(project.id);
              
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className={cn(
                    "group flex flex-col gap-1.5 px-3 py-2 rounded-lg border transition-all flex-shrink-0 min-w-[160px] text-left",
                    selectedProject === project.id
                      ? "border-transparent"
                      : "bg-card hover:bg-secondary border-border"
                  )}
                  style={
                    selectedProject === project.id
                      ? { backgroundColor: project.color, color: "white" }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: selectedProject === project.id ? "white" : project.color,
                      }}
                    />
                    <span className="font-medium text-sm truncate flex-1">{project.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full">
                    <div 
                      className="h-1.5 flex-1 rounded-full overflow-hidden"
                      style={{ 
                        backgroundColor: selectedProject === project.id ? "rgba(255,255,255,0.3)" : "hsl(var(--secondary))" 
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${projectProgress.progress}%`,
                          backgroundColor: selectedProject === project.id ? "white" : project.color,
                        }}
                      />
                    </div>
                    <span 
                      className={cn(
                        "text-xs tabular-nums font-medium min-w-[32px] text-right",
                        selectedProject === project.id ? "text-white/90" : "text-muted-foreground"
                      )}
                    >
                      {projectProgress.progress}%
                    </span>
                  </div>
                  
                  <span 
                    className={cn(
                      "text-[10px]",
                      selectedProject === project.id ? "text-white/70" : "text-muted-foreground"
                    )}
                  >
                    {projectProgress.completed}/{projectProgress.total} tasks
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
