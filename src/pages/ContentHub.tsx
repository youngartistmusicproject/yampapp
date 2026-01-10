import { useState } from "react";
import { Search, Upload, FolderOpen, FileText, Image, Video, Music, MoreHorizontal, Grid, List, Star, Clock, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "document" | "image" | "video" | "audio";
  size?: string;
  modified: string;
  shared?: boolean;
  starred?: boolean;
}

const files: FileItem[] = [
  { id: "1", name: "Lesson Materials", type: "folder", modified: "2 days ago" },
  { id: "2", name: "Recital Programs", type: "folder", modified: "1 week ago", starred: true },
  { id: "3", name: "Student Resources", type: "folder", modified: "3 days ago" },
  { id: "4", name: "Practice Guide 2024.pdf", type: "document", size: "2.4 MB", modified: "Yesterday", shared: true },
  { id: "5", name: "Theory Worksheet.docx", type: "document", size: "156 KB", modified: "3 days ago" },
  { id: "6", name: "Studio Photo.jpg", type: "image", size: "4.2 MB", modified: "1 week ago", starred: true },
  { id: "7", name: "Performance Recording.mp4", type: "video", size: "256 MB", modified: "2 weeks ago" },
  { id: "8", name: "Practice Track - Scales.mp3", type: "audio", size: "8.4 MB", modified: "5 days ago", shared: true },
];

const getFileIcon = (type: FileItem["type"]) => {
  switch (type) {
    case "folder":
      return FolderOpen;
    case "document":
      return FileText;
    case "image":
      return Image;
    case "video":
      return Video;
    case "audio":
      return Music;
    default:
      return FileText;
  }
};

export default function ContentHub() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "starred") return matchesSearch && file.starred;
    if (activeTab === "shared") return matchesSearch && file.shared;
    if (activeTab === "recent") return matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Content Hub</h1>
          <p className="text-muted-foreground mt-1">Access and manage all your files</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            New Folder
          </Button>
          <Button size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="gap-2 text-sm">
              <FolderOpen className="w-3.5 h-3.5" />
              All Files
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2 text-sm">
              <Clock className="w-3.5 h-3.5" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="starred" className="gap-2 text-sm">
              <Star className="w-3.5 h-3.5" />
              Starred
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2 text-sm">
              <Users className="w-3.5 h-3.5" />
              Shared
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto sm:ml-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Files */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="group relative bg-card rounded-xl border border-border/50 p-4 hover:border-border hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                {/* Star indicator */}
                {file.starred && (
                  <Star className="absolute top-3 right-3 w-4 h-4 text-amber-500 fill-amber-500" />
                )}

                {/* File preview area */}
                <div className="aspect-square rounded-lg bg-muted/30 flex items-center justify-center mb-4 group-hover:bg-muted/50 transition-colors">
                  <Icon className="w-12 h-12 text-muted-foreground/70" />
                </div>

                {/* File info */}
                <div className="space-y-1">
                  <p className="font-medium text-sm truncate text-foreground">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {file.size || file.modified}
                    </p>
                    {file.shared && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        Shared
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>Open</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem>
                        {file.starred ? "Remove star" : "Add star"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="group flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-muted-foreground/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-foreground">{file.name}</p>
                      {file.starred && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {file.size ? `${file.size} • ` : ""}Modified {file.modified}
                    </p>
                  </div>
                  {file.shared && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Shared
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Open</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem>
                        {file.starred ? "Remove star" : "Add star"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
