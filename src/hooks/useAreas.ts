import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Area {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AreaItem {
  id: string;
  name: string;
  color: string;
}

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Area[];
    },
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (area: { name: string; color: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from('areas')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const newSortOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;
      
      const { data, error } = await supabase
        .from('areas')
        .insert({ name: area.name, color: area.color, sort_order: newSortOrder })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (error) => {
      toast.error(`Failed to create area: ${error.message}`);
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Area, 'name' | 'color'>> }) => {
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (error) => {
      toast.error(`Failed to update area: ${error.message}`);
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete area: ${error.message}`);
    },
  });
}

export function useReorderAreas() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (areas: AreaItem[]) => {
      // Update sort_order for each area
      const updates = areas.map((area, index) => 
        supabase
          .from('areas')
          .update({ sort_order: index })
          .eq('id', area.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (error) => {
      toast.error(`Failed to reorder areas: ${error.message}`);
    },
  });
}
