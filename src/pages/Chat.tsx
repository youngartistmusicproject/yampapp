import { useState } from "react";
import { Search, Plus, Send, Paperclip, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatConversation {
  id: string;
  name: string;
  type: "direct" | "group";
  participants?: string[];
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

const conversations: ChatConversation[] = [
  { id: "1", name: "Sarah Miller", type: "direct", lastMessage: "Thanks for the lesson plan!", lastMessageTime: "10:30 AM", unread: 2 },
  { id: "2", name: "Faculty Group", type: "group", participants: ["Sarah", "John", "Emily"], lastMessage: "Meeting moved to 3pm", lastMessageTime: "9:15 AM", unread: 0 },
  { id: "3", name: "John Davis", type: "direct", lastMessage: "Can you cover my class tomorrow?", lastMessageTime: "Yesterday", unread: 1 },
  { id: "4", name: "Admin Team", type: "group", participants: ["Admin", "Manager"], lastMessage: "Budget approved", lastMessageTime: "Yesterday", unread: 0 },
  { id: "5", name: "Emily Chen", type: "direct", lastMessage: "See you at the recital!", lastMessageTime: "2 days ago", unread: 0 },
];

const sampleMessages: ChatMessage[] = [
  { id: "1", sender: "Sarah Miller", content: "Hey! Do you have the updated lesson plan for next week?", timestamp: "10:15 AM", isOwn: false },
  { id: "2", sender: "You", content: "Yes! Let me share it with you. I've updated the theory section.", timestamp: "10:20 AM", isOwn: true },
  { id: "3", sender: "Sarah Miller", content: "Perfect! Can you also include the practice exercises?", timestamp: "10:25 AM", isOwn: false },
  { id: "4", sender: "You", content: "Sure thing. I'll add those and send the final version.", timestamp: "10:28 AM", isOwn: true },
  { id: "5", sender: "Sarah Miller", content: "Thanks for the lesson plan! 🎵", timestamp: "10:30 AM", isOwn: false },
];

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<string>("1");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedChat = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 animate-fade-in">
      {/* Conversations List */}
      <Card className="w-80 flex-shrink-0 shadow-card flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Messages</h2>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedConversation === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setSelectedConversation(conv.id)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback
                    className={
                      selectedConversation === conv.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary"
                    }
                  >
                    {conv.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{conv.name}</p>
                    <span
                      className={`text-xs ${
                        selectedConversation === conv.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.lastMessageTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        selectedConversation === conv.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.lastMessage}
                    </p>
                    {conv.unread > 0 && (
                      <Badge
                        className={`h-5 min-w-5 justify-center ${
                          selectedConversation === conv.id
                            ? "bg-primary-foreground text-primary"
                            : ""
                        }`}
                      >
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 shadow-card flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {selectedChat?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedChat?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedChat?.type === "group"
                  ? `${selectedChat.participants?.length} members`
                  : "Online"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {sampleMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] ${
                    msg.isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  } rounded-2xl px-4 py-2`}
                >
                  {!msg.isOwn && (
                    <p className="text-xs font-medium mb-1 text-primary">
                      {msg.sender}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isOwn
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              className="flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  setMessage("");
                }
              }}
            />
            <Button size="icon" className="flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
