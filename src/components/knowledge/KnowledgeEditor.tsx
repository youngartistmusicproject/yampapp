import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Clock,
  User,
  Eye,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlashCommandMenu, SlashCommand } from "./SlashCommandMenu";
import { DocLinkMenu } from "./DocLinkMenu";
import { MarkdownPreview } from "./MarkdownPreview";
import { cn } from "@/lib/utils";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  children?: DocItem[];
}

interface KnowledgeEditorProps {
  docId: string | null;
  docs?: DocItem[];
  onDocSelect?: (docId: string) => void;
}

const sampleContent = `# Welcome Guide

Welcome to our Music School Work Operating System! This guide will help you get started with using the platform effectively.

## Getting Started

This system is designed to help our team manage daily operations, communicate effectively, and keep track of all student and parent information.

### Key Features

- **Project Management**: Create and track tasks, set due dates, and collaborate with team members
- **Knowledge Base**: Access SOPs, guides, and important documentation
- **Communication**: Chat with colleagues and manage parent communications
- **Calendar**: View and manage schedules, lessons, and events

## Quick Tips

1. Use the sidebar to navigate between different sections
2. Click the search bar to quickly find tasks, documents, or contacts
3. Check your dashboard daily for updates and pending items

> 💡 **Pro Tip**: You can use \`/\` to open the command menu and quickly add formatting!

### Linking Documents

You can link to other documents like this: [[1-2|Quick Start]] - click to navigate!

## Formatting Examples

### Code Blocks

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Tasks | ✅ Active | Full support |
| Docs | ✅ Active | Markdown enabled |
| Links | ✅ Active | Deep linking |

### Checklists

- [x] Read the welcome guide
- [ ] Set up your profile
- [ ] Create your first task

---

*Last updated by Admin on January 15, 2024*`;

export function KnowledgeEditor({ docId, docs = [], onDocSelect }: KnowledgeEditorProps) {
  const [content, setContent] = useState(sampleContent);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStartIndex, setSlashStartIndex] = useState(-1);
  const [docLinkMenuOpen, setDocLinkMenuOpen] = useState(false);
  const [docLinkQuery, setDocLinkQuery] = useState("");
  const [docLinkStartIndex, setDocLinkStartIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getCaretCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const { selectionStart } = textarea;
    const textBeforeCursor = content.substring(0, selectionStart);
    const lines = textBeforeCursor.split("\n");
    const currentLineNumber = lines.length;
    const currentLineLength = lines[lines.length - 1].length;

    // Approximate position based on line height and character width
    const lineHeight = 24;
    const charWidth = 8;
    const editorRect = textarea.getBoundingClientRect();
    const paddingTop = 0;
    const paddingLeft = 0;

    return {
      top: currentLineNumber * lineHeight + paddingTop,
      left: Math.min(currentLineLength * charWidth + paddingLeft, editorRect.width - 300),
    };
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newContent);

    // Check for slash command trigger
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);

    // Check if we're in a new slash command context
    if (lastSlashIndex !== -1 && !textAfterSlash.includes(" ") && !textAfterSlash.includes("\n")) {
      const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : "\n";
      if (charBeforeSlash === "\n" || charBeforeSlash === " " || lastSlashIndex === 0) {
        setSlashMenuOpen(true);
        setSlashQuery(textAfterSlash);
        setSlashStartIndex(lastSlashIndex);
        setSlashMenuPosition(getCaretCoordinates());
        return;
      }
    }
    setSlashMenuOpen(false);

    // Check for doc link trigger [[
    const lastDoubleBracket = textBeforeCursor.lastIndexOf("[[");
    if (lastDoubleBracket !== -1) {
      const textAfterBracket = textBeforeCursor.substring(lastDoubleBracket + 2);
      if (!textAfterBracket.includes("]]") && !textAfterBracket.includes("\n")) {
        setDocLinkMenuOpen(true);
        setDocLinkQuery(textAfterBracket);
        setDocLinkStartIndex(lastDoubleBracket);
        setSlashMenuPosition(getCaretCoordinates());
        return;
      }
    }
    setDocLinkMenuOpen(false);
  };

  const handleSlashCommandSelect = (command: SlashCommand) => {
    if (slashStartIndex === -1) return;

    const beforeSlash = content.substring(0, slashStartIndex);
    const afterQuery = content.substring(slashStartIndex + 1 + slashQuery.length);

    // Special case for doc link command
    if (command.id === "doclink") {
      const newContent = beforeSlash + "[[" + afterQuery;
      setContent(newContent);
      setSlashMenuOpen(false);
      setDocLinkMenuOpen(true);
      setDocLinkQuery("");
      setDocLinkStartIndex(slashStartIndex);
      
      // Set cursor position after [[
      setTimeout(() => {
        if (textareaRef.current) {
          const cursorPos = beforeSlash.length + 2;
          textareaRef.current.selectionStart = cursorPos;
          textareaRef.current.selectionEnd = cursorPos;
          textareaRef.current.focus();
        }
      }, 0);
      return;
    }

    const newContent = beforeSlash + command.markdown + afterQuery;
    setContent(newContent);
    setSlashMenuOpen(false);

    // Set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = beforeSlash.length + command.markdown.length;
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleDocLinkSelect = (doc: DocItem) => {
    if (docLinkStartIndex === -1) return;

    const beforeBracket = content.substring(0, docLinkStartIndex);
    const afterQuery = content.substring(docLinkStartIndex + 2 + docLinkQuery.length);
    const docLink = `[[${doc.id}|${doc.title}]]`;
    const newContent = beforeBracket + docLink + afterQuery;

    setContent(newContent);
    setDocLinkMenuOpen(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = beforeBracket.length + docLink.length;
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      prefix +
      (selectedText || "text") +
      suffix +
      content.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos + (selectedText || "text").length;
    }, 0);
  };

  if (!docId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a document to view or edit
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 sm:p-3 border-b bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("# ", "")}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("## ", "")}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("**", "**")}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("*", "*")}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("`", "`")}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("- ", "")}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("1. ", "")}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("> ", "")}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("[", "](url)")}
            title="Link"
          >
            <Link className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("![alt](", ")")}
            title="Image"
          >
            <Image className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormatting("| Column 1 | Column 2 |\n|----------|----------|\n| ", " |")}
            title="Table"
          >
            <Table className="w-4 h-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={isPreviewMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="gap-1.5"
          >
            {isPreviewMode ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </>
            )}
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Saved</span>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 sm:px-12 py-4 sm:py-6 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span>Created by Admin</span>
          <span>•</span>
          <span>Last edited 2 days ago</span>
        </div>
        <input
          type="text"
          defaultValue="Welcome Guide"
          className="text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Untitled Document"
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-4 sm:py-6 relative">
        {isPreviewMode ? (
          <MarkdownPreview content={content} onDocLinkClick={onDocSelect} />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full min-h-[500px] bg-transparent border-none outline-none resize-none text-foreground leading-relaxed font-mono text-sm"
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing... Use / for commands, [[ to link docs"
              spellCheck={false}
            />
            <SlashCommandMenu
              isOpen={slashMenuOpen}
              position={slashMenuPosition}
              searchQuery={slashQuery}
              onSelect={handleSlashCommandSelect}
              onClose={() => setSlashMenuOpen(false)}
            />
            <DocLinkMenu
              isOpen={docLinkMenuOpen}
              position={slashMenuPosition}
              searchQuery={docLinkQuery}
              docs={docs}
              onSelect={handleDocLinkSelect}
              onClose={() => setDocLinkMenuOpen(false)}
            />
          </div>
        )}
        {!isPreviewMode && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <span className="font-medium">Tip:</span> Type <kbd className="px-1.5 py-0.5 rounded bg-secondary font-mono">/</kbd> for commands, <kbd className="px-1.5 py-0.5 rounded bg-secondary font-mono">[[</kbd> to link docs
          </div>
        )}
      </div>
    </div>
  );
}
