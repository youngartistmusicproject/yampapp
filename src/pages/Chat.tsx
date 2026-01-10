import { useState, useRef } from "react";
import { Search, Plus, Send, Paperclip, MoreHorizontal, Loader2, X, FileIcon, Image as ImageIcon, SmilePlus, Reply, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useChat, Attachment, Message, REACTION_EMOJIS } from "@/hooks/useChat";

export default function Chat() {
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

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleCreateConversation = async () => {
    if (!newChatName.trim()) return;
    await createConversation(newChatName.trim());
    setNewChatName("");
    setNewChatDialogOpen(false);
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
                  className="max-w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
                <FileIcon className="w-4 h-4" />
                <span className="text-xs truncate">{attachment.name}</span>
                <span className="text-xs opacity-70">({formatFileSize(attachment.size)})</span>
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 animate-fade-in">
      {/* Conversations List */}
      <Card className="w-80 flex-shrink-0 shadow-card flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Messages</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setNewChatDialogOpen(true)}
            >
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
            {filteredConversations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No conversations found
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedConversationId === conv.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setSelectedConversationId(conv.id)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback
                      className={
                        selectedConversationId === conv.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary"
                      }
                    >
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
                      <span
                        className={`text-xs ${
                          selectedConversationId === conv.id
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
                          selectedConversationId === conv.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {conv.unread > 0 && (
                        <Badge
                          className={`h-5 min-w-5 justify-center ${
                            selectedConversationId === conv.id
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
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 shadow-card flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConversation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.type === "group"
                      ? `${selectedConversation.participants.length} members`
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
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      id={`message-${msg.id}`}
                      className={`flex ${msg.is_own ? "justify-end" : "justify-start"} group transition-all duration-300 rounded-lg`}
                    >
                      <div className={`relative flex items-start gap-2 ${msg.is_own ? "flex-row-reverse" : ""}`}>
                        {/* Action buttons - positioned inline */}
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2`}>
                          <button
                            onClick={() => handleReply(msg)}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <Popover 
                            open={emojiPickerMessageId === msg.id} 
                            onOpenChange={(open) => setEmojiPickerMessageId(open ? msg.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                                title="Add reaction"
                              >
                                <SmilePlus className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                              <div className="flex gap-1 p-2 bg-background border rounded-lg shadow-lg mb-2">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      toggleReaction(msg.id, emoji);
                                      setEmojiPickerMessageId(null);
                                    }}
                                    className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <div className="w-px bg-border mx-1" />
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1.5 hover:bg-muted rounded transition-colors">
                                      <Smile className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 border-0" side="top">
                                    <EmojiPicker
                                      onEmojiClick={(emojiData) => handleEmojiSelect(emojiData, msg.id)}
                                      theme={Theme.AUTO}
                                      width={320}
                                      height={400}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Message bubble */}
                        <div className="max-w-[65%]">
                          {/* Reply preview - clickable to scroll to original */}
                          {msg.replyTo && (
                            <div 
                              className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-opacity ${
                                msg.is_own 
                                  ? "bg-primary/30" 
                                  : "bg-muted/80"
                              }`}
                              onClick={() => {
                                const element = document.getElementById(`message-${msg.replyTo?.id}`);
                                element?.scrollIntoView({ behavior: "smooth", block: "center" });
                                element?.classList.add("ring-2", "ring-primary", "ring-offset-2");
                                setTimeout(() => element?.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2000);
                              }}
                            >
                              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${msg.is_own ? "bg-primary-foreground/50" : "bg-primary"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Reply className={`w-3 h-3 ${msg.is_own ? "text-primary-foreground/70" : "text-primary"}`} />
                                  <span className={`font-semibold ${msg.is_own ? "text-primary-foreground/80" : "text-primary"}`}>
                                    {msg.replyTo.sender_name}
                                  </span>
                                </div>
                                <p className={`truncate mt-0.5 ${msg.is_own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                            } rounded-2xl px-4 py-2`}
                          >
                            {!msg.is_own && (
                              <p className="text-xs font-medium mb-1 text-primary">
                                {msg.sender_name}
                              </p>
                            )}
                            {msg.content && <p className="text-sm">{msg.content}</p>}
                            {renderAttachments(msg.attachments, msg.is_own)}
                            <p
                              className={`text-xs mt-1 ${
                                msg.is_own
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                          
                          {/* Reactions display */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${msg.is_own ? "justify-end" : "justify-start"}`}>
                              {msg.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() => toggleReaction(msg.id, reaction.emoji)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                    reaction.hasReacted
                                      ? "bg-primary/10 border-primary/30"
                                      : "bg-muted/50 border-border hover:bg-muted"
                                  }`}
                                  title={reaction.users.join(", ")}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-muted-foreground">{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Reply Preview */}
            {replyingTo && (
              <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-3">
                <Reply className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary">Replying to {replyingTo.sender_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group flex items-center gap-2 bg-background rounded-lg px-3 py-2 border"
                    >
                      {isImageFile(file.type) ? (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FileIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-32">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  className="flex-1"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                />
                <Button
                  size="icon"
                  className="flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={(!messageInput.trim() && selectedFiles.length === 0) || isSending}
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </Card>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                placeholder="Enter contact name..."
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateConversation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateConversation} disabled={!newChatName.trim()}>
              Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
