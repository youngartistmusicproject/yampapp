import { useState } from "react";
import { Plus, GripVertical, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea, useReorderAreas } from "@/hooks/useAreas";

export interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorPresets = [
  "#6b7280", "#ef4444", "#f59e0b", "#84cc16", "#10b981",
  "#14b8a6", "#0ea5e9", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface SortableTagItemProps {
  tag: TagItem;
  editingId: string | null;
  editName: string;
  editColor: string;
  onEditNameChange: (value: string) => void;
  onEditColorChange: (value: string) => void;
  onStartEdit: (tag: TagItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

function SortableTagItem({
  tag,
  editingId,
  editName,
  editColor,
  onEditNameChange,
  onEditColorChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  canDelete,
}: SortableTagItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      
      {editingId === tag.id ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: editColor }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 z-[100]" align="start">
              <div className="grid grid-cols-5 gap-1">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border-2 ${editColor === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onEditColorChange(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="h-8 flex-1"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSaveEdit}>
            <Check className="w-4 h-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelEdit}>
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </>
      ) : (
        <>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="flex-1 font-medium text-sm">{tag.name}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(tag)}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onDelete(tag.id)}
            disabled={!canDelete}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </>
      )}
    </div>
  );
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const { data: areas = [], isLoading } = useAreas();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  const reorderAreas = useReorderAreas();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newTag, setNewTag] = useState({ name: "", color: "#6b7280" });
  const [showNewForm, setShowNewForm] = useState(false);

  // Convert areas to TagItem format
  const tags: TagItem[] = areas.map(a => ({ id: a.id, name: a.name, color: a.color }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateArea.mutate({ id: editingId, updates: { name: editName.trim(), color: editColor } });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleDeleteTag = (id: string) => {
    if (tags.length <= 1) return;
    deleteArea.mutate(id);
  };

  const addTag = () => {
    if (!newTag.name.trim()) return;
    createArea.mutate({ name: newTag.name.trim(), color: newTag.color });
    setNewTag({ name: "", color: "#6b7280" });
    setShowNewForm(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tags.findIndex((t) => t.id === active.id);
      const newIndex = tags.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(tags, oldIndex, newIndex);
      reorderAreas.mutate(reordered);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Manage Areas</SheetTitle>
          <SheetDescription>
            Add, edit, or remove area tags. Drag to reorder.
          </SheetDescription>
        </SheetHeader>
        
        {/* Fixed Action Bar */}
        <div className="px-6 py-3 border-b">
          {showNewForm ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed bg-muted/30">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: newTag.color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 z-[100]" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${newTag.color === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTag({ ...newTag, color })}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="Area name..."
                className="h-8 flex-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addTag}>
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
              Add Area
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tags.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tags.map((tag) => (
                  <SortableTagItem
                    key={tag.id}
                    tag={tag}
                    editingId={editingId}
                    editName={editName}
                    editColor={editColor}
                    onEditNameChange={setEditName}
                    onEditColorChange={setEditColor}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onDelete={handleDeleteTag}
                    canDelete={tags.length > 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
