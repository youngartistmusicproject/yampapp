import { useState } from "react";
import { Plus, GripVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

interface StatusManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: StatusItem[];
  onStatusesChange: (statuses: StatusItem[]) => void;
}

const colorPresets = [
  "#6b7280", "#ef4444", "#f59e0b", "#84cc16", "#10b981",
  "#14b8a6", "#0ea5e9", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function StatusManager({ open, onOpenChange, statuses, onStatusesChange }: StatusManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newStatus, setNewStatus] = useState({ name: "", color: "#6b7280" });
  const [showNewForm, setShowNewForm] = useState(false);

  const startEdit = (status: StatusItem) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onStatusesChange(
      statuses.map(s => 
        s.id === editingId 
          ? { ...s, name: editName.trim(), color: editColor }
          : s
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const deleteStatus = (id: string) => {
    // Don't allow deleting if only 2 statuses remain
    if (statuses.length <= 2) return;
    onStatusesChange(statuses.filter(s => s.id !== id));
  };

  const addStatus = () => {
    if (!newStatus.name.trim()) return;
    const id = newStatus.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    onStatusesChange([...statuses, { id, name: newStatus.name.trim(), color: newStatus.color }]);
    setNewStatus({ name: "", color: "#6b7280" });
    setShowNewForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header area - matches TaskDialog */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <h2 className="text-xl font-semibold">Manage Stages</h2>
          <p className="text-sm text-muted-foreground mt-1">Add, edit, or remove task stages. Changes apply to all tasks.</p>
        </div>
        
        <div className="px-6 py-5 space-y-2">
          {statuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              
              {editingId === status.id ? (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: editColor }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-5 gap-1">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            className={`w-6 h-6 rounded-full border-2 ${editColor === color ? 'border-foreground' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="flex-1 font-medium text-sm">{status.name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(status)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => deleteStatus(status.id)}
                    disabled={statuses.length <= 2}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {showNewForm ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed bg-muted/30">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: newStatus.color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${newStatus.color === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewStatus({ ...newStatus, color })}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={newStatus.name}
                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                placeholder="Stage name..."
                className="h-8 flex-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addStatus}>
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewForm(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full gap-2 border-dashed" 
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add Stage
            </Button>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
