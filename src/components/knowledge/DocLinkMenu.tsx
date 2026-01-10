import { useEffect, useState, useRef } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  children?: DocItem[];
}

interface DocLinkMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  searchQuery: string;
  docs: DocItem[];
  onSelect: (doc: DocItem) => void;
  onClose: () => void;
}

function flattenDocs(docs: DocItem[]): DocItem[] {
  const result: DocItem[] = [];
  for (const doc of docs) {
    if (doc.type === "doc") {
      result.push(doc);
    }
    if (doc.children) {
      result.push(...flattenDocs(doc.children));
    }
  }
  return result;
}

export function DocLinkMenu({
  isOpen,
  position,
  searchQuery,
  docs,
  onSelect,
  onClose,
}: DocLinkMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const flatDocs = flattenDocs(docs);
  const filteredDocs = flatDocs.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredDocs.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredDocs.length) % filteredDocs.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredDocs[selectedIndex]) {
          onSelect(filteredDocs[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredDocs, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 bg-popover border rounded-lg shadow-lg overflow-hidden animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 text-xs text-muted-foreground border-b flex items-center gap-2">
        <FileText className="w-3 h-3" />
        Link to document
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredDocs.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground text-sm">
            No documents found
          </div>
        ) : (
          filteredDocs.map((doc, index) => (
            <button
              key={doc.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                index === selectedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              )}
              onClick={() => onSelect(doc)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{doc.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
