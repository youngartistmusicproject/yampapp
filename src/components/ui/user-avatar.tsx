import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
  isTeamLeader?: boolean;
}

const sizeClasses = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-7 w-7 text-xs",
  lg: "h-9 w-9 text-sm",
};

const leaderBadgeSizes = {
  sm: "w-3 h-3 -top-0.5 -right-0.5",
  md: "w-3.5 h-3.5 -top-0.5 -right-0.5",
  lg: "w-4 h-4 -top-1 -right-1",
};

const leaderIconSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function UserAvatar({ user, size = "md", showTooltip = true, className, isTeamLeader }: UserAvatarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatar = (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], "border-2 border-background", className)}>
        {user.avatar && (
          <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
        )}
        <AvatarFallback className="bg-primary/20 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {isTeamLeader && (
        <div className={cn(
          "absolute rounded-full bg-amber-500 flex items-center justify-center",
          leaderBadgeSizes[size]
        )}>
          <Star className={cn("text-white fill-white", leaderIconSizes[size])} />
        </div>
      )}
    </div>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{user.name}</p>
        {isTeamLeader && (
          <p className="text-xs text-amber-500">Team Leader</p>
        )}
        <p className="text-xs text-muted-foreground capitalize">{user.role.replace('-', ' ')}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UserAvatarGroupProps {
  users: User[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  teamLeaderIds?: string[];
}

export function UserAvatarGroup({ users, max = 3, size = "md", className, teamLeaderIds = [] }: UserAvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  if (users.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleUsers.map((user) => (
        <UserAvatar 
          key={user.id} 
          user={user} 
          size={size} 
          isTeamLeader={teamLeaderIds.includes(user.id) || teamLeaderIds.includes(user.name)}
        />
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                sizeClasses[size],
                "rounded-full bg-muted border-2 border-background flex items-center justify-center font-medium cursor-default"
              )}
            >
              +{remainingCount}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              {users.slice(max).map((user) => (
                <p key={user.id} className="text-sm">
                  {user.name}
                  {(teamLeaderIds.includes(user.id) || teamLeaderIds.includes(user.name)) && (
                    <span className="text-amber-500 ml-1">★</span>
                  )}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
