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

export interface Message {
  id: string;
  conversation_id: string;
  sender_name: string;
  content: string;
  is_own: boolean;
  created_at: string;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  // Send a new message
  const sendMessage = async (content: string) => {
    if (!selectedConversationId || !content.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_name: "You",
        content: content.trim(),
        is_own: true,
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

  // Set up realtime subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.conversation_id === selectedConversationId) {
            setMessages((prev) => [...prev, newMessage]);
          }
          // Refresh conversations to update last message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return {
    conversations,
    messages,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    sendMessage,
    createConversation,
    isLoading,
    formatTime,
  };
}
