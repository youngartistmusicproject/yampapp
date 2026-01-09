import { useState } from "react";
import { Plus, Search, FolderOpen, FileText, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  children?: DocItem[];
  lastModified?: Date;
}

const sampleDocs: DocItem[] = [
  {
    id: "1",
    title: "Getting Started",
    type: "folder",
    children: [
      { id: "1-1", title: "Welcome Guide", type: "doc", lastModified: new Date() },
      { id: "1-2", title: "Quick Start", type: "doc", lastModified: new Date() },
    ],
  },
  {
    id: "2",
    title: "SOPs & Policies",
    type: "folder",
    children: [
      { id: "2-1", title: "Attendance Policy", type: "doc", lastModified: new Date() },
      { id: "2-2", title: "Lesson Planning Guide", type: "doc", lastModified: new Date() },
      { id: "2-3", title: "Parent Communication", type: "doc", lastModified: new Date() },
    ],
  },
  {
    id: "3",
    title: "Teaching Resources",
    type: "folder",
    children: [
      { id: "3-1", title: "Music Theory Basics", type: "doc", lastModified: new Date() },
      { id: "3-2", title: "Practice Techniques", type: "doc", lastModified: new Date() },
    ],
  },
  { id: "4", title: "Staff Handbook", type: "doc", lastModified: new Date() },
];

export default function Knowledge() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>("1-1");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["1", "2"]));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderDocItem = (item: DocItem, depth = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedDoc === item.id;

    return (
      <div key={item.id}>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            if (item.type === "folder") {
              toggleFolder(item.id);
            } else {
              setSelectedDoc(item.id);
            }
          }}
        >
          {item.type === "folder" ? (
            <>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
              <FolderOpen className="w-4 h-4" />
            </>
          ) : (
            <FileText className="w-4 h-4 ml-5" />
          )}
          <span className="truncate flex-1 text-left">{item.title}</span>
        </button>
        {item.type === "folder" && isExpanded && item.children && (
          <div>
            {item.children.map((child) => renderDocItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 animate-fade-in">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-card rounded-lg border shadow-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Knowledge Base</h2>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sampleDocs.map((item) => renderDocItem(item))}
        </div>
      </div>

      {/* Editor */}
      <Card className="flex-1 shadow-card overflow-hidden">
        <CardContent className="p-0 h-full">
          <KnowledgeEditor docId={selectedDoc} />
        </CardContent>
      </Card>
    </div>
  );
}
