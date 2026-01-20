import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, FolderOpen } from "lucide-react";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  children?: DocItem[];
}

interface CreateDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, type: "folder" | "doc", parentId: string | null) => Promise<void>;
  folders: DocItem[];
}

export function CreateDocDialog({
  open,
  onOpenChange,
  onSubmit,
  folders,
}: CreateDocDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"folder" | "doc">("doc");
  const [parentId, setParentId] = useState<string>("root");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await onSubmit(title.trim(), type, parentId === "root" ? null : parentId);
    setLoading(false);
    setTitle("");
    setType("doc");
    setParentId("root");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="px-4 sm:px-6 pt-5 sm:pt-6">
          <DialogHeader>
            <DialogTitle>Create New {type === "folder" ? "Folder" : "Document"}</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="px-4 sm:px-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "doc" ? "default" : "outline"}
                  className="flex-1 max-sm:h-12"
                  onClick={() => setType("doc")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Document
                </Button>
                <Button
                  type="button"
                  variant={type === "folder" ? "default" : "outline"}
                  className="flex-1 max-sm:h-12"
                  onClick={() => setType("folder")}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Folder
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={type === "folder" ? "Folder name..." : "Document title..."}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Location</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Root (Top level)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        {folder.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border/50 safe-area-pb">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="max-sm:h-12 max-sm:text-base max-sm:flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading} className="max-sm:h-12 max-sm:text-base max-sm:flex-1">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
