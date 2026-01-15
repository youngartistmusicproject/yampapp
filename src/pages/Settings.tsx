import { useState, useEffect, useRef } from "react";
import { User, Bell, Shield, Camera, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile } from "@/hooks/useProfiles";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePasswordChange } from "@/hooks/usePasswordChange";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const { preferences, isLoading: isLoadingPrefs, updatePreference } = useNotificationPreferences();
  const { changePassword, isChanging } = usePasswordChange();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isChecking2FA, setIsChecking2FA] = useState(true);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  // Check 2FA status on mount
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (!error && data) {
          const verifiedFactor = data.totp.find(f => f.status === "verified");
          setIs2FAEnabled(!!verifiedFactor);
        }
      } catch (error) {
        console.error("Error checking 2FA status:", error);
      } finally {
        setIsChecking2FA(false);
      }
    };
    check2FAStatus();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        first_name: firstName,
        last_name: lastName || null,
      });
      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePasswordUpdate = async () => {
    const success = await changePassword(currentPassword, newPassword, confirmPassword);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled) {
      setShow2FADialog(true);
    } else {
      // Unenroll from 2FA
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const factor = data?.totp.find(f => f.status === "verified");
        if (factor) {
          const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (error) throw error;
          setIs2FAEnabled(false);
          toast.success("Two-factor authentication disabled");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to disable 2FA");
      }
    }
  };

  const initials = profile ? getInitials(profile.first_name, profile.last_name) : "?";

  type BooleanPreferenceKey = "email_notifications" | "push_notifications" | "task_reminders" | "calendar_alerts" | "chat_messages" | "request_updates";
  
  const notificationItems: { key: BooleanPreferenceKey; label: string; description: string }[] = [
    { key: "email_notifications", label: "Email Notifications", description: "Receive email updates about your activity" },
    { key: "push_notifications", label: "Push Notifications", description: "Get push notifications on your devices" },
    { key: "task_reminders", label: "Task Reminders", description: "Receive reminders for upcoming tasks" },
    { key: "calendar_alerts", label: "Calendar Alerts", description: "Get notified about upcoming events" },
    { key: "chat_messages", label: "Chat Messages", description: "Notifications for new messages" },
    { key: "request_updates", label: "Request Updates", description: "Updates on your submitted requests" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
      />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    {profile?.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="Profile" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Change Photo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, GIF or PNG. Max 2MB
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact an administrator to change your email
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPrefs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                notificationItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch 
                      checked={preferences?.[item.key] ?? false}
                      onCheckedChange={(checked) => updatePreference(item.key, checked)}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handlePasswordUpdate} disabled={isChanging}>
                  {isChanging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {is2FAEnabled ? (
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Authenticator App</p>
                        {is2FAEnabled && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Enabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {is2FAEnabled 
                          ? "Your account is protected with 2FA" 
                          : "Use an authenticator app to generate codes"}
                      </p>
                    </div>
                  </div>
                  {isChecking2FA ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch 
                      checked={is2FAEnabled}
                      onCheckedChange={handle2FAToggle}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        onEnrollmentComplete={() => setIs2FAEnabled(true)}
      />
    </div>
  );
}
