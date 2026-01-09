import { useState } from "react";
import { Plus, Search, Filter, Mail, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "parent" | "guardian" | "prospect";
  stage?: "lead" | "contacted" | "qualified" | "enrolled";
  students?: { name: string; instrument: string }[];
  lastContact?: Date;
}

const sampleContacts: Contact[] = [
  {
    id: "1",
    name: "Jennifer Wilson",
    email: "jennifer.w@email.com",
    phone: "(555) 123-4567",
    type: "parent",
    stage: "enrolled",
    students: [
      { name: "Emma Wilson", instrument: "Piano" },
      { name: "James Wilson", instrument: "Violin" },
    ],
    lastContact: new Date("2024-01-10"),
  },
  {
    id: "2",
    name: "Michael Brown",
    email: "m.brown@email.com",
    phone: "(555) 234-5678",
    type: "parent",
    stage: "enrolled",
    students: [{ name: "Sophia Brown", instrument: "Guitar" }],
    lastContact: new Date("2024-01-12"),
  },
  {
    id: "3",
    name: "Sarah Thompson",
    email: "sarah.t@email.com",
    phone: "(555) 345-6789",
    type: "prospect",
    stage: "qualified",
    lastContact: new Date("2024-01-14"),
  },
  {
    id: "4",
    name: "David Martinez",
    email: "d.martinez@email.com",
    phone: "(555) 456-7890",
    type: "prospect",
    stage: "contacted",
    lastContact: new Date("2024-01-08"),
  },
  {
    id: "5",
    name: "Lisa Anderson",
    email: "lisa.a@email.com",
    phone: "(555) 567-8901",
    type: "prospect",
    stage: "lead",
    lastContact: new Date("2024-01-15"),
  },
];

const stageConfig = {
  lead: { label: "Lead", color: "bg-gray-100 text-gray-700" },
  contacted: { label: "Contacted", color: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualified", color: "bg-yellow-100 text-yellow-700" },
  enrolled: { label: "Enrolled", color: "bg-green-100 text-green-700" },
};

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>(sampleContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pipeline = {
    lead: contacts.filter((c) => c.stage === "lead"),
    contacted: contacts.filter((c) => c.stage === "contacted"),
    qualified: contacts.filter((c) => c.stage === "qualified"),
    enrolled: contacts.filter((c) => c.stage === "enrolled"),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
          <p className="text-muted-foreground mt-1">Manage parents, guardians, and prospects</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="contacts">All Contacts</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-4 gap-4">
            {(["lead", "contacted", "qualified", "enrolled"] as const).map((stage) => (
              <div key={stage} className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{stageConfig[stage].label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {pipeline[stage].length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {pipeline[stage].map((contact) => (
                    <Card
                      key={contact.id}
                      className="cursor-pointer hover:shadow-elevated transition-shadow"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {contact.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.email}
                            </p>
                          </div>
                        </div>
                        {contact.students && contact.students.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {contact.students.map((student) => (
                              <Badge
                                key={student.name}
                                variant="outline"
                                className="text-xs"
                              >
                                {student.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Contacts List View */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex gap-6">
            {/* List */}
            <Card className="flex-1 shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
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
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      className={`w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors ${
                        selectedContact?.id === contact.id ? "bg-secondary" : ""
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {contact.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{contact.name}</p>
                          {contact.stage && (
                            <Badge
                              className={stageConfig[contact.stage].color}
                              variant="secondary"
                            >
                              {stageConfig[contact.stage].label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card className="w-96 shadow-card">
              {selectedContact ? (
                <>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {selectedContact.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{selectedContact.name}</CardTitle>
                        <Badge
                          className={stageConfig[selectedContact.stage || "lead"].color}
                          variant="secondary"
                        >
                          {stageConfig[selectedContact.stage || "lead"].label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedContact.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedContact.phone}</span>
                      </div>
                    </div>

                    {selectedContact.students && selectedContact.students.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Students</h4>
                        <div className="space-y-2">
                          {selectedContact.students.map((student) => (
                            <div
                              key={student.name}
                              className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                            >
                              <span className="text-sm">{student.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {student.instrument}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button size="sm" className="flex-1 gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2">
                        <Phone className="w-4 h-4" />
                        Call
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                  Select a contact to view details
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
