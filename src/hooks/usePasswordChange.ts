import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePasswordChange() {
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    if (!user?.email) {
      toast.error("You must be logged in to change your password");
      return false;
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return false;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return false;
    }

    setIsChanging(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return false;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success("Password updated successfully");
      return true;
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to change password");
      return false;
    } finally {
      setIsChanging(false);
    }
  };

  return {
    changePassword,
    isChanging,
  };
}
