import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: string;
  name: string;
  type: "direct" | "group";
  participants: string[];
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_name: string;
  emoji: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface ReplyTo {
  id: string;
  sender_name: string;
  content: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_name: string;
  content: string;
  is_own: boolean;
  created_at: string;
  attachments: Attachment[];
  reactions: ReactionGroup[];
  reply_to_id: string | null;
  replyTo?: ReplyTo;
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export interface TypingUser {
  user_name: string;
  conversation_id: string;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { toast } = useToast();

  // Fetch all conversations with participants and last message
  const fetchConversations = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Fetch participants for each conversation
      const conversationsWithDetails: Conversation[] = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: participantsData } = await supabase
            .from("conversation_participants")
            .select("user_name")
            .eq("conversation_id", conv.id);

          const { data: lastMsgData } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            id: conv.id,
            name: conv.name,
            type: conv.type as "direct" | "group",
            participants: (participantsData || []).map((p) => p.user_name),
            lastMessage: lastMsgData?.content || "",
            lastMessageTime: lastMsgData?.created_at
              ? formatTime(lastMsgData.created_at)
              : "",
            unread: 0,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
          };
        })
      );

      setConversations(conversationsWithDetails);
      
      // Auto-select first conversation if none selected
      if (!selectedConversationId && conversationsWithDetails.length > 0) {
        setSelectedConversationId(conversationsWithDetails[0].id);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch reactions for all messages
      const messageIds = (data || []).map((m) => m.id);
      const { data: reactionsData } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

      // Group reactions by message
      const reactionsMap = new Map<string, Reaction[]>();
      (reactionsData || []).forEach((r) => {
        const existing = reactionsMap.get(r.message_id) || [];
        existing.push(r as Reaction);
        reactionsMap.set(r.message_id, existing);
      });
      setReactions(reactionsMap);

      // Create a map of messages for reply lookups
      const messagesById = new Map<string, any>();
      (data || []).forEach((msg) => messagesById.set(msg.id, msg));

      // Transform data to ensure attachments is always an array and add reactions
      const transformedMessages: Message[] = (data || []).map((msg) => {
        const replyToMsg = msg.reply_to_id ? messagesById.get(msg.reply_to_id) : null;
        return {
          ...msg,
          attachments: Array.isArray(msg.attachments) ? (msg.attachments as unknown as Attachment[]) : [],
          reactions: groupReactions(reactionsMap.get(msg.id) || []),
          replyTo: replyToMsg ? {
            id: replyToMsg.id,
            sender_name: replyToMsg.sender_name,
            content: replyToMsg.content,
          } : undefined,
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  // Group reactions by emoji
  const groupReactions = (messageReactions: Reaction[]): ReactionGroup[] => {
    const groups = new Map<string, { count: number; users: string[] }>();
    
    messageReactions.forEach((r) => {
      const existing = groups.get(r.emoji) || { count: 0, users: [] };
      existing.count++;
      existing.users.push(r.user_name);
      groups.set(r.emoji, existing);
    });

    return Array.from(groups.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: data.users.includes("You"),
    }));
  };

  // Toggle reaction on a message
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const existingReactions = reactions.get(messageId) || [];
      const existingReaction = existingReactions.find(
        (r) => r.emoji === emoji && r.user_name === "You"
      );

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        // Add reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_name: "You",
          emoji,
        });
      }

      // Refresh messages to get updated reactions
      if (selectedConversationId) {
        await fetchMessages(selectedConversationId);
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  // Upload files to storage
  const uploadFiles = async (files: File[]): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${selectedConversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      uploadedAttachments.push({
        name: file.name,
        url: publicUrlData.publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    return uploadedAttachments;
  };

  // Send a new message with optional attachments and reply
  const sendMessage = async (content: string, files?: File[], replyToId?: string) => {
    if (!selectedConversationId || (!content.trim() && (!files || files.length === 0))) return;

    try {
      let attachments: Attachment[] = [];

      if (files && files.length > 0) {
        attachments = await uploadFiles(files);
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_name: "You",
        content: content.trim(),
        is_own: true,
        attachments: JSON.parse(JSON.stringify(attachments)),
        reply_to_id: replyToId || null,
      });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  // Create a new conversation
  const createConversation = async (name: string, type: "direct" | "group" = "direct") => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ name, type })
        .select()
        .single();

      if (error) throw error;

      // Add current user as participant
      await supabase.from("conversation_participants").insert([
        { conversation_id: data.id, user_name: "You" },
        { conversation_id: data.id, user_name: name },
      ]);

      await fetchConversations();
      setSelectedConversationId(data.id);

      return data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    }
  };

  // Format timestamp to display time
  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Set up realtime subscription for messages, reactions, and typing indicators
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.conversation_id === selectedConversationId) {
            // Fetch the reply-to message if exists
            let replyToData: ReplyTo | undefined;
            if (newMessage.reply_to_id) {
              const { data: replyMsg } = await supabase
                .from("messages")
                .select("id, sender_name, content")
                .eq("id", newMessage.reply_to_id)
                .maybeSingle();
              
              if (replyMsg) {
                replyToData = {
                  id: replyMsg.id,
                  sender_name: replyMsg.sender_name,
                  content: replyMsg.content,
                };
              }
            }

            const transformedMessage: Message = {
              ...newMessage,
              attachments: Array.isArray(newMessage.attachments) 
                ? (newMessage.attachments as unknown as Attachment[]) 
                : [],
              reactions: [],
              replyTo: replyToData,
            };
            setMessages((prev) => [...prev, transformedMessage]);
          }
          // Refresh conversations to update last message
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          // Refresh messages when reactions change
          if (selectedConversationId) {
            fetchMessages(selectedConversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const indicator = payload.new as any;
            // Only show typing for others, not yourself
            if (indicator.user_name !== "You") {
              setTypingUsers((prev) => {
                const exists = prev.some(
                  (t) =>
                    t.user_name === indicator.user_name &&
                    t.conversation_id === indicator.conversation_id
                );
                if (exists) return prev;
                return [...prev, { user_name: indicator.user_name, conversation_id: indicator.conversation_id }];
              });
            }
          } else if (payload.eventType === "DELETE") {
            const indicator = payload.old as any;
            setTypingUsers((prev) =>
              prev.filter(
                (t) =>
                  !(t.user_name === indicator.user_name && t.conversation_id === indicator.conversation_id)
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  // Broadcast typing status
  const setTyping = async (conversationId: string, isTyping: boolean) => {
    if (isTyping) {
      await supabase
        .from("typing_indicators")
        .upsert(
          { conversation_id: conversationId, user_name: "You", updated_at: new Date().toISOString() },
          { onConflict: "conversation_id,user_name" }
        );
    } else {
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_name", "You");
    }
  };

  // Get typing users for a specific conversation (excluding self)
  const getTypingUsersForConversation = (conversationId: string) => {
    return typingUsers.filter((t) => t.conversation_id === conversationId);
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return {
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
  };
}
