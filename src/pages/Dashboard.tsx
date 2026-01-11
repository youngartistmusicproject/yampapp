import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  MessageSquare,
  FileText,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const stats = [
  { label: "Tasks Due Today", value: "8", icon: Clock, trend: "+2 from yesterday" },
  { label: "Completed This Week", value: "24", icon: CheckCircle2, trend: "+12% vs last week" },
  { label: "Pending Requests", value: "5", icon: AlertCircle, trend: "3 awaiting review" },
  { label: "Active Projects", value: "12", icon: TrendingUp, trend: "2 near deadline" },
];

const recentTasks = [
  { id: 1, title: "Review lesson plans for next week", status: "in-progress", priority: "high", assignee: "Sarah M." },
  { id: 2, title: "Update student progress reports", status: "todo", priority: "medium", assignee: "You" },
  { id: 3, title: "Schedule parent-teacher meetings", status: "todo", priority: "high", assignee: "John D." },
  { id: 4, title: "Order new music books", status: "done", priority: "low", assignee: "Admin" },
];

const upcomingEvents = [
  { id: 1, title: "Staff Meeting", time: "10:00 AM", date: "Today" },
  { id: 2, title: "Piano Recital Practice", time: "2:00 PM", date: "Today" },
  { id: 3, title: "New Student Orientation", time: "9:00 AM", date: "Tomorrow" },
];

const recentActivity = [
  { id: 1, user: "Sarah M.", action: "completed task", target: "Update curriculum guide", time: "5 min ago" },
  { id: 2, user: "John D.", action: "submitted request", target: "Time Off Request", time: "1 hour ago" },
  { id: 3, user: "Admin", action: "added document", target: "2024 Schedule", time: "2 hours ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid - stack on mobile */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Tasks Section */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
            <div>
              <CardTitle className="text-base sm:text-lg">Recent Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your assigned and recent tasks</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm">
              View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'done' ? 'bg-green-500' :
                      task.status === 'in-progress' ? 'bg-primary' : 'bg-muted-foreground'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs sm:text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{task.assignee}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-[10px] sm:text-xs ml-2 flex-shrink-0"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar - horizontal scroll on mobile */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming Events */}
          <Card className="shadow-card">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm sm:text-base">Upcoming Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 sm:w-12 text-center flex-shrink-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{event.date}</p>
                    <p className="text-xs sm:text-sm font-medium">{event.time}</p>
                  </div>
                  <div className="h-8 w-px bg-border flex-shrink-0" />
                  <p className="text-xs sm:text-sm truncate">{event.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm sm:text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 sm:gap-3">
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                    <AvatarFallback className="text-[10px] sm:text-xs bg-secondary">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium truncate">{activity.target}</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects Progress */}
      <Card className="shadow-card">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm sm:text-base">Project Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              { name: "Spring Recital Planning", progress: 75, tasks: "15/20 tasks" },
              { name: "Curriculum Update", progress: 45, tasks: "9/20 tasks" },
              { name: "Student Enrollment", progress: 90, tasks: "18/20 tasks" },
            ].map((project) => (
              <div key={project.name} className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="font-medium truncate">{project.name}</span>
                  <span className="text-muted-foreground flex-shrink-0 ml-2">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{project.tasks}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
