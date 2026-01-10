import { useEditor, EditorContent } from "@tiptap/react";
import "./tiptap.css";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table as TableIcon,
  FileText,
  Undo,
  Redo,
  ImageIcon,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useImperativeHandle, useState, useRef, useCallback } from "react";
import { Callout, CalloutType } from "./extensions/CalloutExtension";

interface DocItem {
  id: string;
  title: string;
  type: "folder" | "doc";
  children?: DocItem[];
}

interface TiptapEditorProps {
  content?: string;
  docs?: DocItem[];
  onDocSelect?: (docId: string) => void;
  onUpdate?: (content: string) => void;
}

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

const getCommands = (docs: DocItem[]): CommandItem[] => {
  const flatDocs = flattenDocs(docs);
  
  const baseCommands: CommandItem[] = [
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a bullet list",
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a numbered list",
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Task List",
      description: "Create a checklist",
      icon: <CheckSquare className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote",
      icon: <Quote className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code Block",
      description: "Add a code block",
      icon: <Code className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Divider",
      description: "Visual divider",
      icon: <Minus className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Table",
      description: "Insert a table",
      icon: <TableIcon className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: "Image",
      description: "Upload or embed an image",
      icon: <ImageIcon className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Trigger file input click
        const event = new CustomEvent('tiptap-image-upload');
        document.dispatchEvent(event);
      },
    },
    {
      title: "Info Callout",
      description: "Highlight information",
      icon: <Info className="w-4 h-4 text-blue-500" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run();
      },
    },
    {
      title: "Warning Callout",
      description: "Warn about something",
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: "warning" }).run();
      },
    },
    {
      title: "Success Callout",
      description: "Highlight success or tips",
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: "success" }).run();
      },
    },
    {
      title: "Error Callout",
      description: "Highlight errors or issues",
      icon: <XCircle className="w-4 h-4 text-red-500" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: "error" }).run();
      },
    },
    {
      title: "Announcement",
      description: "Important announcement block",
      icon: <Megaphone className="w-4 h-4 text-primary" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: "announcement" }).run();
      },
    },
  ];

  // Add document links
  const docCommands: CommandItem[] = flatDocs.map((doc) => ({
    title: `Link to: ${doc.title}`,
    description: "Insert document link",
    icon: <FileText className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "text",
          marks: [{ type: "link", attrs: { href: `#doc:${doc.id}`, class: "doc-link" } }],
          text: `📄 ${doc.title}`,
        })
        .run();
    },
  }));

  return [...baseCommands, ...docCommands];
};

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

// Command list component for slash commands
const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="z-50 w-72 bg-popover border rounded-lg shadow-lg overflow-hidden">
      <div className="p-2 text-xs text-muted-foreground border-b">
        Type to filter, ↑↓ to navigate, Enter to select
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {props.items.map((item: CommandItem, index: number) => (
          <button
            key={index}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
              index === selectedIndex
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border",
                index === selectedIndex
                  ? "bg-primary-foreground/20 border-primary-foreground/30"
                  : "bg-secondary border-border"
              )}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <div
                className={cn(
                  "text-xs truncate",
                  index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandList.displayName = "CommandList";

// Create slash commands extension
const createSlashCommands = (docs: DocItem[]) => {
  return Extension.create({
    name: "slashCommands",
    addOptions() {
      return {
        suggestion: {
          char: "/",
          command: ({ editor, range, props }: any) => {
            props.command({ editor, range });
          },
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          items: ({ query }: { query: string }) => {
            return getCommands(docs).filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            let component: ReactRenderer;
            let popup: Instance[];

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate(props: any) {
                component.updateProps(props);
                if (!props.clientRect) return;
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown(props: any) {
                if (props.event.key === "Escape") {
                  popup[0].hide();
                  return true;
                }
                return (component.ref as any)?.onKeyDown(props);
              },
              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        }),
      ];
    },
  });
};

export function TiptapEditor({ content, docs = [], onDocSelect, onUpdate }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Use "/" for commands',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Callout,
      createSlashCommands(docs),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] dark:prose-invert",
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");
        if (link) {
          const href = link.getAttribute("href");
          if (href?.startsWith("#doc:")) {
            event.preventDefault();
            const docId = href.replace("#doc:", "");
            onDocSelect?.(docId);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageUpload(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const handleImageUpload = useCallback((file: File) => {
    if (!editor) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  }, [handleImageUpload]);

  const insertImageFromUrl = useCallback(() => {
    const url = window.prompt('Enter image URL');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  // Listen for custom event from slash command
  useEffect(() => {
    const handleUploadEvent = () => {
      fileInputRef.current?.click();
    };
    
    document.addEventListener('tiptap-image-upload', handleUploadEvent);
    return () => {
      document.removeEventListener('tiptap-image-upload', handleUploadEvent);
    };
  }, []);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!editor || !onUpdate) return;

    const handler = () => {
      const html = editor.getHTML();
      onUpdate(html);
    };

    // Debounce the update
    let timeout: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handler, 1000); // Save after 1 second of inactivity
    };

    editor.on('update', debouncedHandler);
    return () => {
      editor.off('update', debouncedHandler);
      clearTimeout(timeout);
    };
  }, [editor, onUpdate]);

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-0.5">
          <Button
            variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-0.5">
          <Button
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("strike") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("code") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-0.5">
          <Button
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("taskList") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-0.5">
          <Button
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const url = window.prompt("Enter URL");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto px-4 sm:px-12 py-4 sm:py-6" />
    </div>
  );
}
