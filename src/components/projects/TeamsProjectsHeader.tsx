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
  selectedTeam,
  selectedProject,
  onTeamSelect,
  onProjectSelect,
}: TeamsProjectsHeaderProps) {
  // Get filtered projects for a team
  const getTeamProjects = (teamId: string) => {
    if (teamId === "all") return projects;
    return projects.filter((p) => p.teamId === teamId);
  };

  const filteredProjects = getTeamProjects(selectedTeam);

  return (
    <div className="space-y-3">
      {/* Teams Row - Minimal text tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            onTeamSelect("all");
            onProjectSelect("all");
          }}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
            selectedTeam === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          All Teams
        </button>

        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => {
              onTeamSelect(team.id);
              onProjectSelect("all");
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              selectedTeam === team.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            {team.name}
          </button>
        ))}
      </div>

      {/* Projects Row - Subtle underline style */}
      {filteredProjects.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none">
          <button
            onClick={() => onProjectSelect("all")}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap relative",
              selectedProject === "all"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Projects
            {selectedProject === "all" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => onProjectSelect(project.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap relative",
                selectedProject === project.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
              {selectedProject === project.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
