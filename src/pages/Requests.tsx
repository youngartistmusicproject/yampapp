import { useState } from "react";
import { Plus, Filter, Search, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestDialog } from "@/components/requests/RequestDialog";
import { Request } from "@/types";
import { format } from "date-fns";

const sampleRequests: Request[] = [
  {
    id: "1",
    type: "time-off",
    title: "Vacation Request - Spring Break",
    description: "Requesting time off from March 15-22 for family vacation.",
    status: "pending",
    requestedBy: { id: "1", name: "Sarah Miller", email: "sarah@example.com", role: "faculty" },
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "2",
    type: "supplies",
    title: "New Piano Books Order",
    description: "Need to order intermediate level piano books for spring semester. Estimated cost: $150",
    status: "approved",
    requestedBy: { id: "2", name: "John Davis", email: "john@example.com", role: "faculty" },
    createdAt: new Date("2024-01-08"),
  },
  {
    id: "3",
    type: "lesson-change",
    title: "Reschedule Tuesday Lessons",
    description: "Need to move all Tuesday afternoon lessons to Thursday due to doctor appointment.",
    status: "pending",
    requestedBy: { id: "3", name: "Emily Chen", email: "emily@example.com", role: "faculty" },
    createdAt: new Date("2024-01-12"),
  },
  {
    id: "4",
    type: "other",
    title: "Room Temperature Issue",
    description: "Studio B has been consistently too cold. Can we have the heating checked?",
    status: "completed",
    requestedBy: { id: "4", name: "Mike Johnson", email: "mike@example.com", role: "staff" },
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "5",
    type: "time-off",
    title: "Sick Leave - January 15",
    description: "Not feeling well, need to take the day off.",
    status: "approved",
    requestedBy: { id: "1", name: "Sarah Miller", email: "sarah@example.com", role: "faculty" },
    createdAt: new Date("2024-01-14"),
  },
];

const statusConfig = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  approved: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Rejected" },
  completed: { icon: CheckCircle, color: "bg-blue-100 text-blue-700", label: "Completed" },
};

const typeLabels = {
  "time-off": "Time Off",
  supplies: "Supplies",
  "lesson-change": "Lesson Change",
  other: "Other",
};

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>(sampleRequests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || request.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleAddRequest = (newRequest: Omit<Request, 'id' | 'createdAt' | 'status'>) => {
    const request: Request = {
      ...newRequest,
      id: Date.now().toString(),
      status: "pending",
      createdAt: new Date(),
    };
    setRequests([request, ...requests]);
    setDialogOpen(false);
  };

  const handleStatusChange = (requestId: string, newStatus: Request["status"]) => {
    setRequests(requests.map(r =>
      r.id === requestId ? { ...r, status: newStatus } : r
    ));
  };

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
          <p className="text-muted-foreground mt-1">Manage time off, supplies, and other requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.all}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const StatusIcon = statusConfig[request.status].icon;
              return (
                <Card key={request.id} className="shadow-card hover:shadow-elevated transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-secondary">
                          {request.requestedBy.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{request.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {request.description}
                            </p>
                          </div>
                          <Badge className={statusConfig[request.status].color} variant="secondary">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[request.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>{request.requestedBy.name}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[request.type]}
                          </Badge>
                          <span>•</span>
                          <span>{format(request.createdAt, "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(request.id, "rejected")}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(request.id, "approved")}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <RequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddRequest}
      />
    </div>
  );
}
