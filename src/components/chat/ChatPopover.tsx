import { useState, useEffect, useMemo, useRef } from "react";
import { MessageCircle, Search, SquarePen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChat } from "@/hooks/useChat";
import { useOrgContacts } from "@/hooks/useOrgContacts";
import { ChatWindow } from "./ChatWindow";

type View = "conversations" | "new-message";

interface OpenChat {
  id: string;
  name: string;
  minimized: boolean;
}

export function ChatPopover() {
  const {
    conversations,
    messages,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    sendMessage,
    createConversation,
    toggleReaction,
    isLoading,
    formatTime,
    setTyping,
    getTypingUsersForConversation,
    isUserOnline,
    markMessagesAsRead,
  } = useChat();

  const { contacts, isLoading: contactsLoading } = useOrgContacts();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("conversations");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setView("conversations");
      setSearchQuery("");
      setContactSearchQuery("");
    }
  }, [isOpen]);

  // When the popover opens, focus the search input so typing immediately filters.
  useEffect(() => {
    if (!isOpen) return;
    if (view !== "conversations") return;
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [isOpen, view]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!normalizedSearchQuery) return conversations;
    return conversations.filter((conv) => {
      const haystack = `${conv.name} ${conv.lastMessage || ""}`.toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [conversations, normalizedSearchQuery]);

  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) return contacts;
    const query = contactSearchQuery.toLowerCase();
    return contacts.filter((contact) =>
      contact.displayName.toLowerCase().includes(query)
    );
  }, [contacts, contactSearchQuery]);

  const unreadCount = conversations.reduce((acc, conv) => acc + conv.unread, 0);

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    // Check if chat is already open
    const existingChat = openChats.find((c) => c.id === conversationId);
    if (existingChat) {
      // If minimized, unminimize it
      if (existingChat.minimized) {
        setOpenChats((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, minimized: false } : c))
        );
      }
    } else {
      // Open new chat window (limit to 3 open chats)
      const newChat: OpenChat = {
        id: conversationId,
        name: conversation.name,
        minimized: false,
      };
      setOpenChats((prev) => {
        const updated = [...prev, newChat];
        return updated.slice(-3); // Keep only last 3
      });
    }

    setSelectedConversationId(conversationId);
    setIsOpen(false);
  };

  const handleNewMessage = () => {
    setView("new-message");
    setContactSearchQuery("");
  };

  const handleBackToConversations = () => {
    setView("conversations");
  };

  const handleSelectContact = async (contact: { id: string; displayName: string }) => {
    // Check if conversation already exists with this person
    const existingConv = conversations.find((c) => c.name === contact.displayName);
    if (existingConv) {
      handleSelectConversation(existingConv.id);
    } else {
      const newConv = await createConversation(contact.displayName);
      if (newConv) {
        const newChat: OpenChat = {
          id: newConv.id,
          name: contact.displayName,
          minimized: false,
        };
        setOpenChats((prev) => {
          const updated = [...prev, newChat];
          return updated.slice(-3);
        });
      }
    }
    setIsOpen(false);
  };

  const handleCloseChat = (chatId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedConversationId === chatId) {
      const remaining = openChats.filter((c) => c.id !== chatId);
      if (remaining.length > 0) {
        setSelectedConversationId(remaining[remaining.length - 1].id);
      }
    }
  };

  const handleMinimizeChat = (chatId: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, minimized: true } : c))
    );
  };

  const handleRestoreChat = (chatId: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, minimized: false } : c))
    );
    setSelectedConversationId(chatId);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 sm:w-96 p-0 h-[450px] flex flex-col" 
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            // So the user can immediately type to search without clicking the input.
            if (view === "conversations") {
              e.preventDefault();
              window.setTimeout(() => searchInputRef.current?.focus(), 0);
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            {view === "conversations" ? (
              <>
                <h2 className="font-semibold text-lg">Chats</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleNewMessage}
                  title="New message"
                >
                  <SquarePen className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleBackToConversations}
                  >
                    ← Back
                  </Button>
                  <span className="font-semibold">New message</span>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {view === "conversations" && (
              <>
                {/* Search */}
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search Messenger"
                      className="pl-9 h-9 bg-secondary border-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Conversations List */}
                <ScrollArea className="flex-1">
                  <div className="py-1">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No conversations found
                      </p>
                    ) : (
                      filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                          onClick={() => handleSelectConversation(conv.id)}
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(conv.name)}
                              </AvatarFallback>
                            </Avatar>
                            {isUserOnline(conv.name) && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{conv.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {conv.lastMessageTime}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage || "No messages yet"}
                              </p>
                              {conv.unread > 0 && (
                                <Badge className="h-5 min-w-5 justify-center ml-2">
                                  {conv.unread}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {view === "new-message" && (
              <>
                {/* Contact Search */}
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      className="pl-9 h-9 bg-secondary border-0"
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Contacts List */}
                <ScrollArea className="flex-1">
                  <div className="py-1">
                    {contactsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-muted-foreground">
                          {contacts.length === 0
                            ? "No other members in your organization yet."
                            : "No contacts found"}
                        </p>
                        {contacts.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Invite team members from Settings
                          </p>
                        )}
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                          onClick={() => handleSelectContact(contact)}
                        >
                          <Avatar className="w-10 h-10">
                            {contact.avatarUrl && (
                              <AvatarImage src={contact.avatarUrl} alt={contact.displayName} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(contact.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{contact.displayName}</span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Chat Windows - Fixed at bottom right */}
      <div className="fixed bottom-0 right-4 flex items-end gap-2 z-50">
        {/* Minimized chats */}
        {openChats
          .filter((chat) => chat.minimized)
          .map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleRestoreChat(chat.id)}
              className="relative mb-2"
            >
              <Avatar className="w-12 h-12 border-2 border-background shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(chat.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          ))}

        {/* Open chat windows */}
        {openChats
          .filter((chat) => !chat.minimized)
          .map((chat) => (
            <div
              key={chat.id}
              onPointerDownCapture={() => {
                if (selectedConversationId !== chat.id) {
                  setSelectedConversationId(chat.id);
                }
              }}
              onFocusCapture={() => {
                if (selectedConversationId !== chat.id) {
                  setSelectedConversationId(chat.id);
                }
              }}
            >
              <ChatWindow
                conversationId={chat.id}
                conversationName={chat.name}
                messages={chat.id === selectedConversationId ? messages : []}
                typingUsers={getTypingUsersForConversation(chat.id)}
                isOnline={isUserOnline(chat.name)}
                onClose={() => handleCloseChat(chat.id)}
                onMinimize={() => handleMinimizeChat(chat.id)}
                onSendMessage={async (content, files, replyToId) => {
                  if (selectedConversationId !== chat.id) {
                    setSelectedConversationId(chat.id);
                  }
                  await sendMessage(content, files, replyToId);
                }}
                onTyping={(isTyping) => setTyping(chat.id, isTyping)}
                toggleReaction={toggleReaction}
                formatTime={formatTime}
                onMarkAsRead={() => markMessagesAsRead(chat.id)}
              />
            </div>
          ))}
      </div>
    </>
  );
}
