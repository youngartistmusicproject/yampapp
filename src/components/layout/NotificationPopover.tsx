import { Bell, Settings, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export function NotificationPopover() {
  const { preferences, isLoading } = useNotificationPreferences();
  const navigate = useNavigate();

  const enabledNotifications = preferences
    ? [
        preferences.email_notifications && "Email notifications",
        preferences.push_notifications && "Push notifications",
        preferences.task_reminders && "Task reminders",
        preferences.calendar_alerts && "Calendar alerts",
        preferences.chat_messages && "Chat messages",
        preferences.request_updates && "Request updates",
      ].filter(Boolean)
    : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          {enabledNotifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="end">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Your notification center
          </p>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* No notifications message */}
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  You're all caught up!
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  No new notifications
                </p>
              </div>

              <Separator />

              {/* Enabled notifications summary */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Enabled Notifications
                </p>
                {enabledNotifications.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {enabledNotifications.map((notif) => (
                      <span
                        key={notif as string}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                      >
                        {notif}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No notifications enabled
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs gap-2"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-3.5 h-3.5" />
            Manage notification settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
