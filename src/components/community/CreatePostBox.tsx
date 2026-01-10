import React, { useState, useRef } from "react";
import {
  ImageIcon,
  Smile,
  AtSign,
  Loader2,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FEELINGS = [
  { emoji: "😊", label: "happy" },
  { emoji: "😢", label: "sad" },
  { emoji: "😍", label: "loved" },
  { emoji: "🎉", label: "celebrating" },
  { emoji: "😤", label: "frustrated" },
  { emoji: "🤔", label: "thoughtful" },
  { emoji: "😴", label: "tired" },
  { emoji: "🔥", label: "motivated" },
  { emoji: "😎", label: "cool" },
  { emoji: "🥳", label: "excited" },
  { emoji: "😌", label: "relaxed" },
  { emoji: "💪", label: "strong" },
];

// Mock team members for tagging
const TEAM_MEMBERS = [
  { id: "1", name: "Sarah Miller", initials: "SM" },
  { id: "2", name: "James Davis", initials: "JD" },
  { id: "3", name: "Emily Chen", initials: "EC" },
  { id: "4", name: "Michael Johnson", initials: "MJ" },
  { id: "5", name: "Lisa Anderson", initials: "LA" },
];

interface CreatePostBoxProps {
  onCreatePost: (content: string, imageUrl?: string) => Promise<void>;
}

export function CreatePostBox({ onCreatePost }: CreatePostBoxProps) {
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<typeof TEAM_MEMBERS>([]);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) return;
    
    setIsPosting(true);
    let imageUrl: string | undefined;

    try {
      // Upload image if selected
      if (selectedImage) {
        setIsUploading(true);
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(`community/${fileName}`, selectedImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(`community/${fileName}`);
        
        imageUrl = urlData.publicUrl;
        setIsUploading(false);
      }

      // Build post content with feeling and tags
      let content = newPost.trim();
      
      if (selectedFeeling) {
        content = `${selectedFeeling.emoji} feeling ${selectedFeeling.label}\n\n${content}`;
      }
      
      if (taggedUsers.length > 0) {
        const tagNames = taggedUsers.map((u) => `@${u.name}`).join(" ");
        content = `${content}\n\n— with ${tagNames}`;
      }

      await onCreatePost(content, imageUrl);
      
      // Reset form
      setNewPost("");
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFeeling(null);
      setTaggedUsers([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };

  const toggleTagUser = (user: typeof TEAM_MEMBERS[0]) => {
    setTaggedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const filteredMembers = TEAM_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <Card className="shadow-card">
      <CardContent className="pt-4 pb-3">
        <div className="flex gap-3 items-start">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            {/* Feeling/Tag badges */}
            {(selectedFeeling || taggedUsers.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {selectedFeeling && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {selectedFeeling.emoji} feeling {selectedFeeling.label}
                    <button
                      onClick={() => setSelectedFeeling(null)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {taggedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                    @{user.name}
                    <button
                      onClick={() => toggleTagUser(user)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <textarea
              id="post-textarea"
              placeholder="What's on your mind, John?"
              className="w-full bg-secondary hover:bg-secondary/80 transition-colors rounded-2xl px-4 py-2.5 text-sm placeholder:text-muted-foreground resize-none border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[42px] max-h-[200px]"
              rows={1}
              value={newPost}
              onChange={(e) => {
                setNewPost(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }}
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="max-h-48 rounded-lg object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Media buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {/* Photo/Video Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-green-600 hover:bg-green-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 text-green-600" />
              )}
              <span className="hidden sm:inline">Photo/Video</span>
            </Button>

            {/* Feeling Button */}
            <Popover open={feelingOpen} onOpenChange={setFeelingOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-50"
                >
                  <Smile className="w-5 h-5 text-yellow-500" />
                  <span className="hidden sm:inline">Feeling</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <p className="text-sm font-medium text-muted-foreground px-2 pb-2">
                  How are you feeling?
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {FEELINGS.map((feeling) => (
                    <button
                      key={feeling.label}
                      onClick={() => {
                        setSelectedFeeling(feeling);
                        setFeelingOpen(false);
                      }}
                      className={`flex flex-col items-center p-2 rounded-lg hover:bg-secondary transition-colors ${
                        selectedFeeling?.label === feeling.label ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="text-2xl">{feeling.emoji}</span>
                      <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                        {feeling.label}
                      </span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Tag Button */}
            <Popover open={tagOpen} onOpenChange={setTagOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                >
                  <AtSign className="w-5 h-5 text-blue-500" />
                  <span className="hidden sm:inline">Tag</span>
                  {taggedUsers.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {taggedUsers.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <p className="text-sm font-medium text-muted-foreground px-2 pb-2">
                  Tag people
                </p>
                <Input
                  placeholder="Search people..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="mb-2 h-8"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredMembers.map((member) => {
                    const isSelected = taggedUsers.some((u) => u.id === member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleTagUser(member)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-secondary"
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{member.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-[10px]">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No people found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <Button
            size="sm"
            disabled={(!newPost.trim() && !selectedImage) || isPosting}
            onClick={handleCreatePost}
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
