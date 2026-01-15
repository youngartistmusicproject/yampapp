import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile } from "@/hooks/useProfiles";
import { toast } from "sonner";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

export function useAvatarUpload() {
  const { user, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload an avatar");
      return false;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPG, PNG, or GIF image.");
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 2MB.");
      return false;
    }

    setIsUploading(true);

    try {
      // Create unique filename with user ID as folder
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if present
      await supabase.storage
        .from("avatars")
        .remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache-busting timestamp to force refresh
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      await updateProfile.mutateAsync({
        id: user.id,
        avatar_url: avatarUrl,
      });

      await refreshProfile();
      toast.success("Avatar updated successfully");
      return true;
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    isUploading,
  };
}
