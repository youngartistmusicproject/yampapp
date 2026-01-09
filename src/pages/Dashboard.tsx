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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Section */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your assigned and recent tasks</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'done' ? 'bg-green-500' :
                      task.status === 'in-progress' ? 'bg-primary' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{task.assignee}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Upcoming Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3">
                  <div className="w-12 text-center">
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                    <p className="text-sm font-medium">{event.time}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <p className="text-sm">{event.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-secondary">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects Progress */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Project Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Spring Recital Planning", progress: 75, tasks: "15/20 tasks" },
              { name: "Curriculum Update", progress: 45, tasks: "9/20 tasks" },
              { name: "Student Enrollment", progress: 90, tasks: "18/20 tasks" },
            ].map((project) => (
              <div key={project.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{project.tasks}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
