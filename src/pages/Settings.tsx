import { useState, useEffect } from "react";
import { User, Bell, Shield } from "lucide-react";
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
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

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

  const initials = profile ? getInitials(profile.first_name, profile.last_name) : "?";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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
                <Avatar className="w-20 h-20">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt="Profile" />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
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
              {[
                { label: "Email Notifications", description: "Receive email updates about your activity" },
                { label: "Push Notifications", description: "Get push notifications on your devices" },
                { label: "Task Reminders", description: "Receive reminders for upcoming tasks" },
                { label: "Calendar Alerts", description: "Get notified about upcoming events" },
                { label: "Chat Messages", description: "Notifications for new messages" },
                { label: "Request Updates", description: "Updates on your submitted requests" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked={i < 4} />
                </div>
              ))}
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
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button>Update Password</Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">
                      Use an authenticator app to generate codes
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
