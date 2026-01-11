import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FolderOpen, FileText, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";
import { CreateDocDialog } from "@/components/knowledge/CreateDocDialog";
import { useKnowledgeDocs, DocItem } from "@/hooks/useKnowledgeDocs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Knowledge() {
  const { docs, flatDocs, loading, getDocById, createDoc, updateDoc, deleteDoc } = useKnowledgeDocs();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get list of folders for the create dialog
  const folders = flatDocs.filter((d) => d.type === "folder");

  // Get selected document
  const selectedDoc = selectedDocId ? getDocById(selectedDocId) : null;

  // Auto-select first document when docs load
  useEffect(() => {
    if (!selectedDocId && flatDocs.length > 0) {
      const firstDoc = flatDocs.find((d) => d.type === "doc");
      if (firstDoc) {
        setSelectedDocId(firstDoc.id);
        // Expand parent folder if exists
        if (firstDoc.parent_id) {
          setExpandedFolders((prev) => new Set([...prev, firstDoc.parent_id!]));
        }
      }
    }
  }, [flatDocs, selectedDocId]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateDoc = async (
    title: string,
    type: "folder" | "doc",
    parentId: string | null
  ) => {
    const newDoc = await createDoc(title, type, parentId);
    if (newDoc && type === "doc") {
      setSelectedDocId(newDoc.id);
      if (parentId) {
        setExpandedFolders((prev) => new Set([...prev, parentId]));
      }
    }
  };

  const handleDeleteDoc = async (id: string) => {
    const success = await deleteDoc(id);
    if (success && selectedDocId === id) {
      setSelectedDocId(null);
    }
    return success;
  };

  // Filter docs based on search
  const filterDocs = (items: DocItem[], query: string): DocItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    
    return items.reduce<DocItem[]>((acc, item) => {
      const matchesTitle = item.title.toLowerCase().includes(lowerQuery);
      const filteredChildren = item.children ? filterDocs(item.children, query) : [];
      
      if (matchesTitle || filteredChildren.length > 0) {
        acc.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : item.children,
        });
      }
      return acc;
    }, []);
  };

  const filteredDocs = filterDocs(docs, searchQuery);

  const renderDocItem = (item: DocItem, depth = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedDocId === item.id;

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
              setSelectedDocId(item.id);
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

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)] gap-4 lg:gap-6 animate-fade-in">
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col bg-card rounded-lg border shadow-card p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <Card className="flex-1 shadow-card hidden lg:block">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)] gap-4 lg:gap-6 animate-fade-in">
      {/* Sidebar - full width on mobile when no doc selected, hidden when doc selected on mobile */}
      <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col bg-card rounded-lg border shadow-card ${selectedDoc ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 lg:p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm lg:text-base">Knowledge Base</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((item) => renderDocItem(item))
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              {searchQuery ? "No matching documents" : "No documents yet"}
            </div>
          )}
        </div>
      </div>

      {/* Editor - full screen on mobile when doc selected */}
      <Card className={`flex-1 shadow-card overflow-hidden ${selectedDoc ? 'flex' : 'hidden lg:flex'}`}>
        <CardContent className="p-0 h-full w-full">
          {/* Mobile back button */}
          {selectedDoc && (
            <div className="lg:hidden p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocId(null)}
                className="gap-2"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to docs
              </Button>
            </div>
          )}
          <KnowledgeEditor
            doc={selectedDoc || null}
            docs={docs}
            onDocSelect={(docId) => setSelectedDocId(docId)}
            onUpdate={updateDoc}
            onDelete={handleDeleteDoc}
          />
        </CardContent>
      </Card>

      {/* Create Document Dialog */}
      <CreateDocDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateDoc}
        folders={folders}
      />
    </div>
  );
}
