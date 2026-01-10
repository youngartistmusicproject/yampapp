import { useEffect, useState, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  CheckSquare,
  Minus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  markdown: string;
}

const slashCommands: SlashCommand[] = [
  { id: "h1", label: "Heading 1", description: "Large section heading", icon: <Heading1 className="w-4 h-4" />, markdown: "# " },
  { id: "h2", label: "Heading 2", description: "Medium section heading", icon: <Heading2 className="w-4 h-4" />, markdown: "## " },
  { id: "h3", label: "Heading 3", description: "Small section heading", icon: <Heading3 className="w-4 h-4" />, markdown: "### " },
  { id: "bullet", label: "Bullet List", description: "Create a bullet list", icon: <List className="w-4 h-4" />, markdown: "- " },
  { id: "numbered", label: "Numbered List", description: "Create a numbered list", icon: <ListOrdered className="w-4 h-4" />, markdown: "1. " },
  { id: "checklist", label: "Checklist", description: "Create a todo checklist", icon: <CheckSquare className="w-4 h-4" />, markdown: "- [ ] " },
  { id: "quote", label: "Quote", description: "Capture a quote", icon: <Quote className="w-4 h-4" />, markdown: "> " },
  { id: "code", label: "Code Block", description: "Add a code block", icon: <Code className="w-4 h-4" />, markdown: "```\n\n```" },
  { id: "divider", label: "Divider", description: "Visual divider", icon: <Minus className="w-4 h-4" />, markdown: "\n---\n" },
  { id: "link", label: "Link", description: "Add a hyperlink", icon: <Link className="w-4 h-4" />, markdown: "[link text](url)" },
  { id: "image", label: "Image", description: "Embed an image", icon: <Image className="w-4 h-4" />, markdown: "![alt text](image-url)" },
  { id: "table", label: "Table", description: "Insert a table", icon: <Table className="w-4 h-4" />, markdown: "| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |" },
  { id: "doclink", label: "Link to Doc", description: "Link to another document", icon: <FileText className="w-4 h-4" />, markdown: "[[" },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  searchQuery: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  isOpen,
  position,
  searchQuery,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = slashCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 bg-popover border rounded-lg shadow-lg overflow-hidden animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 text-xs text-muted-foreground border-b">
        Type to filter, ↑↓ to navigate, Enter to select
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredCommands.map((command, index) => (
          <button
            key={command.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
              index === selectedIndex
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
            onClick={() => onSelect(command)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className={cn(
              "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border",
              index === selectedIndex
                ? "bg-primary-foreground/20 border-primary-foreground/30"
                : "bg-secondary border-border"
            )}>
              {command.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{command.label}</div>
              <div className={cn(
                "text-xs truncate",
                index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {command.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { SlashCommand };
