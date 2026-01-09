import { useState } from "react";
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
  MoreHorizontal,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface KnowledgeEditorProps {
  docId: string | null;
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

> 💡 **Pro Tip**: You can link any document to tasks or CRM contacts for easy reference.

---

*Last updated by Admin on January 15, 2024*`;

export function KnowledgeEditor({ docId }: KnowledgeEditorProps) {
  const [content, setContent] = useState(sampleContent);

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
      <div className="flex items-center gap-1 p-3 border-b bg-secondary/30">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Heading2 className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Code className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Quote className="w-4 h-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Link className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Table className="w-4 h-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Saved</span>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-12 py-6 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span>Created by Admin</span>
          <span>•</span>
          <span>Last edited 2 days ago</span>
        </div>
        <input
          type="text"
          defaultValue="Welcome Guide"
          className="text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Untitled Document"
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-12 py-6">
        <div className="prose prose-sm max-w-none">
          <textarea
            className="w-full min-h-[500px] bg-transparent border-none outline-none resize-none text-foreground leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
          />
        </div>
      </div>
    </div>
  );
}
