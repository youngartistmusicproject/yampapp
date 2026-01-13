import { useState } from "react";
import { ChevronDown, Users, FolderKanban } from "lucide-react";
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
  completedStatusId: string;
}

export function TeamsProjectsHeader({
  teams,
  projects,
  tasks,
  selectedTeam,
  selectedProject,
  onTeamSelect,
  onProjectSelect,
  completedStatusId,
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
      (t) => t.status === completedStatusId || t.completedAt
    ).length;
    
    return {
      progress: Math.round((completed / projectTasks.length) * 100),
      completed,
      total: projectTasks.length,
    };
  };

  // Get filtered projects for a team
  const getTeamProjects = (teamId: string) => {
    if (teamId === "all") return projects;
    return projects.filter((p) => p.teamId === teamId);
  };

  const isTeamExpanded = (teamId: string) => expandedTeams.has(teamId);

  return (
    <div className="space-y-2">
      {/* Teams Row */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-1">
          {/* All Teams */}
          <button
            onClick={() => {
              onTeamSelect("all");
              onProjectSelect("all");
              toggleTeamExpand("all");
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors",
              selectedTeam === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All</span>
          </button>

          {teams.map((team) => {
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
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors",
                  selectedTeam === team.id
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                style={
                  selectedTeam === team.id
                    ? { backgroundColor: team.color }
                    : {}
                }
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: selectedTeam === team.id ? "white" : team.color,
                  }}
                />
                <span>{team.name}</span>
                <span className={cn(
                  "text-xs",
                  selectedTeam === team.id ? "text-white/70" : "text-muted-foreground"
                )}>
                  {teamProjects.length}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Projects Row */}
      {(isTeamExpanded(selectedTeam) || selectedTeam === "all") && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            {/* All Projects */}
            <button
              onClick={() => onProjectSelect("all")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors",
                selectedProject === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>All Projects</span>
            </button>

            {getTeamProjects(selectedTeam).map((project) => {
              const projectProgress = getProjectProgress(project.id);
              
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors",
                    selectedProject === project.id
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  style={
                    selectedProject === project.id
                      ? { backgroundColor: project.color }
                      : {}
                  }
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: selectedProject === project.id ? "white" : project.color,
                    }}
                  />
                  <span>{project.name}</span>
                  
                  {/* Progress bar */}
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="h-1 w-12 rounded-full overflow-hidden"
                      style={{ 
                        backgroundColor: selectedProject === project.id ? "rgba(255,255,255,0.3)" : "hsl(var(--border))" 
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
                        "text-xs tabular-nums",
                        selectedProject === project.id ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {projectProgress.progress}%
                    </span>
                  </div>
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
