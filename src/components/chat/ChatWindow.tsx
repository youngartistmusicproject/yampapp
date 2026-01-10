import { useState, useRef, useEffect } from "react";
import { X, Send, Paperclip, Minus, SmilePlus, Reply, FileIcon, Loader2, Plus, Check, CheckCheck, ChevronDown, Search, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Attachment, Message, TypingUser } from "@/hooks/useChat";
import { format } from "date-fns";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

// Facebook-style quick reactions
const QUICK_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
];

interface ChatWindowProps {
  conversationId: string;
  conversationName: string;
  messages: Message[];
  typingUsers: TypingUser[];
  isOnline: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (content: string, files?: File[], replyToId?: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  formatTime: (date: string) => string;
  onMarkAsRead: () => void;
}

export function ChatWindow({
  conversationId,
  conversationName,
  messages,
  typingUsers,
  isOnline,
  onClose,
  onMinimize,
  onSendMessage,
  onTyping,
  toggleReaction,
  formatTime,
  onMarkAsRead,
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Filter messages matching search query
  const searchResults = searchQuery.trim()
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Debug: log search state
  console.log("Search debug:", { searchQuery, messagesCount: messages.length, searchResultsCount: searchResults.length });

  // Navigate to a search result
  const navigateToSearchResult = (index: number) => {
    if (searchResults.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, searchResults.length - 1));
    setCurrentSearchIndex(clampedIndex);
    const msg = searchResults[clampedIndex];
    const element = document.getElementById(`chat-window-message-${conversationId}-${msg.id}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.classList.add("ring-2", "ring-primary", "ring-offset-1");
    setTimeout(() => element?.classList.remove("ring-2", "ring-primary", "ring-offset-1"), 2000);
  };

  // Focus search input when opening
  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [showSearch]);

  // Reset search index when query changes
  useEffect(() => {
    setCurrentSearchIndex(0);
  }, [searchQuery]);

  // Highlight matching text in message content
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-inherit rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const scrollToBottom = (smooth = false) => {
    const viewport = scrollAreaRef.current;

    if (viewport) {
      if (smooth) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      } else {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }

    // Fallback (works even if scrolling element changes)
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    
    // Reset new messages state when scrolling to bottom
    setNewMessagesCount(0);
    setIsScrolledUp(false);
    if (messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1].id);
    }
  };

  // Check if user is scrolled up
  const checkScrollPosition = () => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;
    
    const threshold = 100; // pixels from bottom
    const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;
    setIsScrolledUp(!isAtBottom);
    
    if (isAtBottom) {
      setNewMessagesCount(0);
      if (messages.length > 0) {
        setLastSeenMessageId(messages[messages.length - 1].id);
      }
    }
  };

  // Set up scroll listener
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    viewport.addEventListener("scroll", checkScrollPosition);
    return () => viewport.removeEventListener("scroll", checkScrollPosition);
  }, [messages.length]);

  // Auto-scroll to bottom when messages change / window opens (only if not scrolled up)
  useEffect(() => {
    const newMessagesArrived = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (newMessagesArrived && isScrolledUp) {
      // User is scrolled up, increment new messages count
      const newCount = messages.length - (messages.findIndex(m => m.id === lastSeenMessageId) + 1);
      setNewMessagesCount(Math.max(0, newCount));
    } else if (!isScrolledUp) {
      // User is at bottom, auto-scroll
      const t = window.setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom()));
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [messages.length, conversationId]);

  // Initialize lastSeenMessageId when conversation opens
  useEffect(() => {
    if (messages.length > 0 && !lastSeenMessageId) {
      setLastSeenMessageId(messages[messages.length - 1].id);
    }
  }, [conversationId]);

  // Mark messages as read when window is visible
  useEffect(() => {
    onMarkAsRead();
  }, [messages.length, conversationId]);

  // Handle typing indicator with debounce
  const handleTyping = () => {
    onTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    setIsSending(true);
    await onSendMessage(
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

  const isImageFile = (type: string) => type.startsWith("image/");

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
    <div className="w-80 h-[450px] bg-background border rounded-t-lg shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <Avatar className="w-8 h-8 border-2 border-primary-foreground/20">
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                {conversationName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-primary rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-sm truncate block">{conversationName}</span>
            {isOnline && (
              <span className="text-[10px] text-primary-foreground/70">Active now</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onMinimize}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) {
                  navigateToSearchResult(currentSearchIndex - 1);
                } else {
                  navigateToSearchResult(currentSearchIndex + 1);
                }
              } else if (e.key === "Escape") {
                setShowSearch(false);
                setSearchQuery("");
              }
            }}
          />
          {searchQuery && (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {searchResults.length > 0
                  ? `${currentSearchIndex + 1}/${searchResults.length}`
                  : "0/0"}
              </span>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigateToSearchResult(currentSearchIndex - 1)}
                  disabled={searchResults.length === 0}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigateToSearchResult(currentSearchIndex + 1)}
                  disabled={searchResults.length === 0}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollAreaRef} className="h-full px-3 py-2 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-xs text-muted-foreground py-4">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-end gap-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                id={`chat-window-message-${conversationId}-${msg.id}`}
                className={`flex ${msg.is_own ? "justify-end" : "justify-start"} group`}
              >
                <div className={`relative flex items-end gap-2 ${msg.is_own ? "flex-row-reverse" : ""} max-w-[85%]`}>
                  {/* Avatar - only for other people */}
                  {!msg.is_own && (
                    <Avatar className="w-6 h-6 flex-shrink-0 mb-4">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {msg.sender_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Message content */}
                  <div className="flex flex-col">
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div
                        className={`flex items-start gap-1.5 text-[10px] px-2 py-1 rounded-lg mb-0.5 cursor-pointer hover:opacity-80 transition-opacity ${
                          msg.is_own ? "bg-primary/30" : "bg-muted/80"
                        }`}
                        onClick={() => {
                          const element = document.getElementById(
                            `chat-window-message-${conversationId}-${msg.replyTo?.id}`
                          );
                          element?.scrollIntoView({ behavior: "smooth", block: "center" });
                          element?.classList.add("ring-2", "ring-primary", "ring-offset-1");
                          setTimeout(
                            () => element?.classList.remove("ring-2", "ring-primary", "ring-offset-1"),
                            2000
                          );
                        }}
                      >
                        <div
                          className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${
                            msg.is_own ? "bg-primary-foreground/50" : "bg-primary"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`font-semibold ${
                              msg.is_own ? "text-primary-foreground/80" : "text-primary"
                            }`}
                          >
                            {msg.replyTo.sender_name}
                          </span>
                          <p
                            className={`truncate ${
                              msg.is_own ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            {msg.replyTo.content || "📎 Attachment"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center gap-1 ${msg.is_own ? "flex-row-reverse" : ""}`}>
                      {/* Message bubble */}
                      <div
                        className={`${
                          msg.is_own ? "bg-primary text-primary-foreground" : "bg-secondary"
                        } rounded-2xl px-3 py-1.5`}
                      >
                        {msg.content && (
                          <p className="text-sm">
                            {highlightText(msg.content, searchQuery)}
                          </p>
                        )}
                        {renderAttachments(msg.attachments, msg.is_own)}
                      </div>

                      {/* Action buttons - on opposite side */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReply(msg)}
                          className="p-1 rounded-full hover:bg-muted transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <div>
                          <Popover
                            open={emojiPickerMessageId === msg.id}
                            onOpenChange={(open) => {
                              setEmojiPickerMessageId(open ? msg.id : null);
                              if (!open) setShowFullEmojiPicker(false);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className="p-1 rounded-full hover:bg-muted transition-colors"
                                title="Add reaction"
                              >
                                <SmilePlus className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 border-0"
                              side="top"
                              align={msg.is_own ? "end" : "start"}
                            >
                              {showFullEmojiPicker ? (
                                <EmojiPicker
                                  onEmojiClick={(emojiData: EmojiClickData) => {
                                    toggleReaction(msg.id, emojiData.emoji);
                                    setEmojiPickerMessageId(null);
                                    setShowFullEmojiPicker(false);
                                  }}
                                  width={280}
                                  height={350}
                                  previewConfig={{ showPreview: false }}
                                />
                              ) : (
                                <div className="flex items-center gap-1 p-2 bg-background border rounded-full shadow-lg">
                                  {QUICK_REACTIONS.map((reaction) => (
                                    <button
                                      key={reaction.emoji}
                                      onClick={() => {
                                        toggleReaction(msg.id, reaction.emoji);
                                        setEmojiPickerMessageId(null);
                                      }}
                                      className="p-1.5 hover:bg-muted rounded-full transition-all hover:scale-125 text-lg"
                                      title={reaction.label}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setShowFullEmojiPicker(true)}
                                    className="p-1.5 hover:bg-muted rounded-full transition-colors"
                                    title="More reactions"
                                  >
                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
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

                    {/* Timestamp and read receipt */}
                    <div
                      className={`flex items-center gap-1 mt-0.5 ${
                        msg.is_own ? "justify-end" : "justify-start"
                      }`}
                    >
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </p>
                      {msg.is_own && (
                        <span title={msg.readBy && msg.readBy.length > 0 ? `Seen by ${msg.readBy.map(r => r.user_name).join(", ")}` : "Sent"}>
                          {msg.readBy && msg.readBy.length > 0 ? (
                            <CheckCheck className="w-3 h-3 text-primary" />
                          ) : (
                            <Check className="w-3 h-3 text-muted-foreground" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        </div>

        {/* Jump to latest button */}
        {isScrolledUp && newMessagesCount > 0 && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg hover:bg-primary/90 transition-all animate-in slide-in-from-bottom-2 duration-200"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {newMessagesCount} new message{newMessagesCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground animate-pulse">
          {typingUsers.length === 1 
            ? `${typingUsers[0].user_name} is typing...`
            : typingUsers.length === 2
            ? `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing...`
            : `${typingUsers.length} people are typing...`
          }
        </div>
      )}

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
            onChange={(e) => {
              setMessageInput(e.target.value);
              if (e.target.value.trim()) {
                handleTyping();
              }
            }}
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
    </div>
  );
}
