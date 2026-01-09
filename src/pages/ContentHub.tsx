import { useState } from "react";
import { Search, Upload, FolderOpen, FileText, Image, Video, Music, MoreHorizontal, Grid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "document" | "image" | "video" | "audio";
  size?: string;
  modified: string;
  shared?: boolean;
}

const files: FileItem[] = [
  { id: "1", name: "Lesson Materials", type: "folder", modified: "2 days ago" },
  { id: "2", name: "Recital Programs", type: "folder", modified: "1 week ago" },
  { id: "3", name: "Student Resources", type: "folder", modified: "3 days ago" },
  { id: "4", name: "Practice Guide 2024.pdf", type: "document", size: "2.4 MB", modified: "Yesterday", shared: true },
  { id: "5", name: "Theory Worksheet.docx", type: "document", size: "156 KB", modified: "3 days ago" },
  { id: "6", name: "Studio Photo.jpg", type: "image", size: "4.2 MB", modified: "1 week ago" },
  { id: "7", name: "Performance Recording.mp4", type: "video", size: "256 MB", modified: "2 weeks ago" },
  { id: "8", name: "Practice Track - Scales.mp3", type: "audio", size: "8.4 MB", modified: "5 days ago" },
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

const getFileColor = (type: FileItem["type"]) => {
  switch (type) {
    case "folder":
      return "bg-yellow-100 text-yellow-700";
    case "document":
      return "bg-blue-100 text-blue-700";
    case "image":
      return "bg-green-100 text-green-700";
    case "video":
      return "bg-purple-100 text-purple-700";
    case "audio":
      return "bg-primary/10 text-primary";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

export default function ContentHub() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Content Hub</h1>
          <p className="text-muted-foreground mt-1">Access and manage all your files</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Connect Drive
          </Button>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Access */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {["All Files", "Shared with Me", "Recent", "Starred"].map((item) => (
              <Button key={item} variant="outline" size="sm">
                {item}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <Card
                key={file.id}
                className="group cursor-pointer hover:shadow-elevated transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${getFileColor(
                        file.type
                      )}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-sm truncate w-full">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.size || file.modified}
                    </p>
                    {file.shared && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        Shared
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${getFileColor(
                        file.type
                      )}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.size ? `${file.size} • ` : ""}Modified {file.modified}
                      </p>
                    </div>
                    {file.shared && (
                      <Badge variant="secondary" className="text-xs">
                        Shared
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
