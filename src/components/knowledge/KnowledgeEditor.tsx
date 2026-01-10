import { useState, useEffect, useCallback } from "react";
import { Clock, User, Trash2, MoreHorizontal } from "lucide-react";
import { TiptapEditor } from "./TiptapEditor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  content?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  children?: DocItem[];
}

interface KnowledgeEditorProps {
  doc: DocItem | null;
  docs?: DocItem[];
  onDocSelect?: (docId: string) => void;
  onUpdate?: (id: string, updates: Partial<DocItem>) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

export function KnowledgeEditor({
  doc,
  docs = [],
  onDocSelect,
  onUpdate,
  onDelete,
}: KnowledgeEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Update local state when doc changes
  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content || "");
    }
  }, [doc?.id, doc?.title, doc?.content]);

  // Debounced save for content
  const saveContent = useCallback(
    async (newContent: string) => {
      if (!doc || !onUpdate) return;
      setIsSaving(true);
      await onUpdate(doc.id, { content: newContent });
      setIsSaving(false);
    },
    [doc, onUpdate]
  );

  // Debounced save for title
  const handleTitleBlur = useCallback(async () => {
    if (!doc || !onUpdate || title === doc.title) return;
    setIsSaving(true);
    await onUpdate(doc.id, { title });
    setIsSaving(false);
  }, [doc, onUpdate, title]);

  const handleDelete = async () => {
    if (!doc || !onDelete) return;
    await onDelete(doc.id);
    setShowDeleteDialog(false);
  };

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a document to view or edit
      </div>
    );
  }

  const lastEdited = doc.updated_at
    ? formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })
    : "just now";

  return (
    <div className="flex flex-col h-full">
      {/* Document Info */}
      <div className="px-4 sm:px-12 py-4 sm:py-6 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Created by {doc.created_by || "Admin"}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>Last edited {lastEdited}</span>
            {isSaving && (
              <>
                <span>•</span>
                <span className="text-primary animate-pulse">Saving...</span>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Untitled Document"
        />
      </div>

      {/* Rich Text Editor */}
      <div className="flex-1 overflow-hidden">
        <TiptapEditor
          key={doc.id}
          content={doc.content || ""}
          docs={docs}
          onDocSelect={onDocSelect}
          onUpdate={saveContent}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
