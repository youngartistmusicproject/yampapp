import { format } from "date-fns";
import { Calendar, Clock, Tag, User, FileText, Repeat } from "lucide-react";
import { Task } from "@/types";
import { UserAvatarGroup } from "@/components/ui/user-avatar";
import { getTagById } from "@/data/workManagementConfig";

interface TaskPreviewCardProps {
  task: Task;
}

export function TaskPreviewCard({ task }: TaskPreviewCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div className="w-72 bg-popover border rounded-lg shadow-lg p-4 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
      {/* Title */}
      <div className="flex items-start gap-2">
        <h4 className="font-medium text-sm leading-snug flex-1">{task.title}</h4>
        {task.isRecurring && (
          <Repeat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Meta info grid */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {format(task.dueDate, "EEEE, MMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Estimated Time */}
        {task.estimatedTime && (
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{formatTime(task.estimatedTime)}</span>
          </div>
        )}

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <UserAvatarGroup users={task.assignees} max={4} size="sm" />
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map(tagId => {
                const tag = getTagById(tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                );
              })}
              {task.tags.length > 3 && (
                <span className="text-muted-foreground">+{task.tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Effort & Importance */}
        {(task.effort || task.importance) && (
          <div className="flex items-center gap-3 text-xs pt-1">
            {task.effort && (
              <span className="text-muted-foreground">
                Effort: <span className="capitalize font-medium text-foreground">{task.effort}</span>
              </span>
            )}
            {task.importance && (
              <span className="text-muted-foreground">
                Importance: <span className="capitalize font-medium text-foreground">{task.importance}</span>
              </span>
            )}
          </div>
        )}

        {/* Progress - always visible */}
        <div className="flex items-center gap-2 text-xs pt-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-muted-foreground font-medium w-8 text-right">{task.progress}%</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
}
