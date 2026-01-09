import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-7 w-7 text-xs",
  lg: "h-9 w-9 text-sm",
};

export function UserAvatar({ user, size = "md", showTooltip = true, className }: UserAvatarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatar = (
    <Avatar className={cn(sizeClasses[size], "border-2 border-background", className)}>
      {user.avatar && (
        <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
      )}
      <AvatarFallback className="bg-primary/20 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UserAvatarGroupProps {
  users: User[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatarGroup({ users, max = 3, size = "md", className }: UserAvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  if (users.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleUsers.map((user) => (
        <UserAvatar key={user.id} user={user} size={size} />
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
                <p key={user.id} className="text-sm">{user.name}</p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
