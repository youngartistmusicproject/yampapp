import { useState, useRef, useEffect } from "react";
import { MessageCircle, Search, SquarePen, X, Send, Paperclip, ArrowLeft, MoreHorizontal, SmilePlus, Reply, Smile, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useChat, Attachment, Message, REACTION_EMOJIS } from "@/hooks/useChat";

// Mock contacts for new message - in a real app this would come from the database
const MOCK_CONTACTS = [
  { id: "1", name: "Alice Johnson", avatar: null },
  { id: "2", name: "Bob Smith", avatar: null },
  { id: "3", name: "Carol Williams", avatar: null },
  { id: "4", name: "David Brown", avatar: null },
  { id: "5", name: "Emma Davis", avatar: null },
  { id: "6", name: "Frank Miller", avatar: null },
  { id: "7", name: "Grace Wilson", avatar: null },
  { id: "8", name: "Henry Taylor", avatar: null },
];

type View = "conversations" | "chat" | "new-message";

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
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("conversations");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  // Reset view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setView("conversations");
      setSearchQuery("");
      setContactSearchQuery("");
      setMessageInput("");
      setSelectedFiles([]);
      setReplyingTo(null);
    }
  }, [isOpen]);

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = MOCK_CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  const unreadCount = conversations.reduce((acc, conv) => acc + conv.unread, 0);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  const handleNewMessage = () => {
    setView("new-message");
    setContactSearchQuery("");
  };

  const handleSelectContact = async (contact: { id: string; name: string }) => {
    // Check if conversation already exists
    const existingConv = conversations.find((c) => c.name === contact.name);
    if (existingConv) {
      setSelectedConversationId(existingConv.id);
    } else {
      await createConversation(contact.name);
    }
    setView("chat");
  };

  const handleBack = () => {
    if (view === "chat" || view === "new-message") {
      setView("conversations");
      setReplyingTo(null);
      setMessageInput("");
      setSelectedFiles([]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    setIsSending(true);
    await sendMessage(
      messageInput,
      selectedFiles.length > 0 ? selectedFiles : undefined,
      replyingTo?.id
    );
    setMessageInput("");
    setSelectedFiles([]);
    setReplyingTo(null);
    setIsSending(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emojiData: EmojiClickData, messageId: string) => {
    toggleReaction(messageId, emojiData.emoji);
    setEmojiPickerMessageId(null);
  };

  const isImageFile = (type: string) => type.startsWith("image/");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderAttachments = (attachments: Attachment[], isOwn: boolean) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment, index) => (
          <div key={index}>
            {isImageFile(attachment.type) ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-full max-h-32 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  isOwn ? "bg-primary-foreground/10" : "bg-background/50"
                } hover:opacity-80 transition-opacity`}
              >
                <FileIcon className="w-3 h-3" />
                <span className="text-xs truncate">{attachment.name}</span>
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
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
        className="w-80 sm:w-96 p-0 h-[500px] flex flex-col" 
        align="end"
        sideOffset={8}
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
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                {view === "chat" && selectedConversation && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {selectedConversation.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{selectedConversation.name}</span>
                  </div>
                )}
                {view === "new-message" && (
                  <span className="font-semibold">New message</span>
                )}
              </div>
              {view === "chat" && (
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              )}
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
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conv.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
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
                  {filteredContacts.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No contacts found
                    </p>
                  ) : (
                    filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                        onClick={() => handleSelectContact(contact)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{contact.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {view === "chat" && selectedConversation && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2 flex flex-col">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        id={`popover-message-${msg.id}`}
                        className={`flex ${msg.is_own ? "justify-end" : "justify-start"} group`}
                      >
                        <div className={`relative flex items-start gap-1 ${msg.is_own ? "flex-row-reverse" : ""} max-w-[85%]`}>
                          {/* Action buttons */}
                          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => handleReply(msg)}
                              className="p-1 rounded-full hover:bg-muted transition-colors"
                              title="Reply"
                            >
                              <Reply className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <Popover
                              open={emojiPickerMessageId === msg.id}
                              onOpenChange={(open) => setEmojiPickerMessageId(open ? msg.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  className="p-1 rounded-full hover:bg-muted transition-colors"
                                  title="Add reaction"
                                >
                                  <SmilePlus className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                                <div className="flex gap-1 p-2 bg-background border rounded-lg shadow-lg">
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        toggleReaction(msg.id, emoji);
                                        setEmojiPickerMessageId(null);
                                      }}
                                      className="p-1 hover:bg-muted rounded transition-colors text-sm"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Message bubble */}
                          <div>
                            {/* Reply preview */}
                            {msg.replyTo && (
                              <div
                                className={`flex items-start gap-1.5 text-[10px] px-2 py-1 rounded-lg mb-0.5 cursor-pointer hover:opacity-80 transition-opacity ${
                                  msg.is_own ? "bg-primary/30" : "bg-muted/80"
                                }`}
                                onClick={() => {
                                  const element = document.getElementById(`popover-message-${msg.replyTo?.id}`);
                                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  element?.classList.add("ring-2", "ring-primary", "ring-offset-1");
                                  setTimeout(() => element?.classList.remove("ring-2", "ring-primary", "ring-offset-1"), 2000);
                                }}
                              >
                                <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${msg.is_own ? "bg-primary-foreground/50" : "bg-primary"}`} />
                                <div className="min-w-0 flex-1">
                                  <span className={`font-semibold ${msg.is_own ? "text-primary-foreground/80" : "text-primary"}`}>
                                    {msg.replyTo.sender_name}
                                  </span>
                                  <p className={`truncate ${msg.is_own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {msg.replyTo.content || "📎 Attachment"}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div
                              className={`${
                                msg.is_own
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary"
                              } rounded-2xl px-3 py-1.5`}
                            >
                              {!msg.is_own && (
                                <p className="text-[10px] font-medium mb-0.5 text-primary">
                                  {msg.sender_name}
                                </p>
                              )}
                              {msg.content && <p className="text-sm">{msg.content}</p>}
                              {renderAttachments(msg.attachments, msg.is_own)}
                            </div>

                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex gap-0.5 mt-0.5 ${msg.is_own ? "justify-end" : "justify-start"}`}>
                                {msg.reactions.map((reaction) => (
                                  <button
                                    key={reaction.emoji}
                                    onClick={() => toggleReaction(msg.id, reaction.emoji)}
                                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-xs ${
                                      reaction.hasReacted
                                        ? "bg-primary/20 border border-primary/30"
                                        : "bg-muted hover:bg-muted/80"
                                    } transition-colors`}
                                    title={reaction.users.join(", ")}
                                  >
                                    <span>{reaction.emoji}</span>
                                    {reaction.count > 1 && (
                                      <span className="text-[10px]">{reaction.count}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply preview */}
              {replyingTo && (
                <div className="px-3 py-2 bg-muted/50 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Reply className="w-3 h-3" />
                      <span>Replying to <strong>{replyingTo.sender_name}</strong></span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {replyingTo.content || "📎 Attachment"}
                  </p>
                </div>
              )}

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="px-3 py-2 bg-muted/30 border-t">
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-background rounded px-2 py-1 text-xs"
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <FileIcon className="w-3 h-3" />
                        )}
                        <span className="truncate max-w-20">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-0.5 hover:bg-muted rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    ref={inputRef}
                    placeholder="Aa"
                    className="flex-1 h-9 bg-secondary border-0 rounded-full"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full flex-shrink-0"
                    onClick={handleSendMessage}
                    disabled={isSending || (!messageInput.trim() && selectedFiles.length === 0)}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
