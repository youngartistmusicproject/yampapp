import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  content?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  sort_order?: number;
  organization_id?: string;
  children?: DocItem[];
}

// Build tree structure from flat list
function buildDocTree(docs: DocItem[]): DocItem[] {
  const map = new Map<string, DocItem>();
  const roots: DocItem[] = [];

  // First pass: create map with children arrays
  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] });
  });

  // Second pass: build tree
  docs.forEach((doc) => {
    const node = map.get(doc.id)!;
    if (doc.parent_id && map.has(doc.parent_id)) {
      map.get(doc.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by sort_order
  const sortDocs = (items: DocItem[]) => {
    items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortDocs(item.children);
      }
    });
  };
  sortDocs(roots);

  return roots;
}

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [flatDocs, setFlatDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  const fetchDocs = useCallback(async () => {
    if (!orgId) {
      setDocs([]);
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const typedDocs: DocItem[] = (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type as "folder" | "doc",
        content: d.content || "",
        parent_id: d.parent_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        created_by: d.created_by || "Admin",
        sort_order: d.sort_order || 0,
        organization_id: d.organization_id || undefined,
      }));

      setFlatDocs(typedDocs);
      setDocs(buildDocTree(typedDocs));
    } catch (error: any) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, orgId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const getDocById = useCallback(
    (id: string): DocItem | undefined => {
      return flatDocs.find((d) => d.id === id);
    },
    [flatDocs]
  );

  const createDoc = useCallback(
    async (
      title: string,
      type: "folder" | "doc",
      parentId: string | null = null
    ): Promise<DocItem | null> => {
      if (!orgId) {
        toast({
          title: "Error",
          description: "No organization selected",
          variant: "destructive",
        });
        return null;
      }
      
      try {
        const { data, error } = await supabase
          .from("knowledge_documents")
          .insert({
            title,
            type,
            parent_id: parentId,
            content: "",
            organization_id: orgId,
          })
          .select()
          .single();

        if (error) throw error;

        await fetchDocs();
        toast({
          title: type === "folder" ? "Folder created" : "Document created",
          description: `"${title}" has been created.`,
        });

        return {
          id: data.id,
          title: data.title,
          type: data.type as "folder" | "doc",
          content: data.content || "",
          parent_id: data.parent_id,
          organization_id: data.organization_id || undefined,
        };
      } catch (error: any) {
        toast({
          title: "Error creating document",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [fetchDocs, toast, orgId]
  );

  const updateDoc = useCallback(
    async (id: string, updates: Partial<DocItem>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("knowledge_documents")
          .update({
            title: updates.title,
            content: updates.content,
            parent_id: updates.parent_id,
          })
          .eq("id", id);

        if (error) throw error;

        // Update local state optimistically
        setFlatDocs((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
        );
        setDocs((prev) => buildDocTree(flatDocs.map((d) => (d.id === id ? { ...d, ...updates } : d))));

        return true;
      } catch (error: any) {
        toast({
          title: "Error updating document",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [flatDocs, toast]
  );

  const deleteDoc = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("knowledge_documents")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await fetchDocs();
        toast({
          title: "Document deleted",
          description: "The document has been deleted.",
        });
        return true;
      } catch (error: any) {
        toast({
          title: "Error deleting document",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [fetchDocs, toast]
  );

  return {
    docs,
    flatDocs,
    loading,
    fetchDocs,
    getDocById,
    createDoc,
    updateDoc,
    deleteDoc,
  };
}
