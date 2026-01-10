import { useState } from "react";
import {
  Clock,
  User,
} from "lucide-react";
import { TiptapEditor } from "./TiptapEditor";

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

const defaultContent = `
<h1>Welcome Guide</h1>
<p>Welcome to our Music School Work Operating System! This guide will help you get started with using the platform effectively.</p>

<h2>Getting Started</h2>
<p>This system is designed to help our team manage daily operations, communicate effectively, and keep track of all student and parent information.</p>

<h3>Key Features</h3>
<ul>
  <li><strong>Project Management</strong>: Create and track tasks, set due dates, and collaborate with team members</li>
  <li><strong>Knowledge Base</strong>: Access SOPs, guides, and important documentation</li>
  <li><strong>Communication</strong>: Chat with colleagues and manage parent communications</li>
  <li><strong>Calendar</strong>: View and manage schedules, lessons, and events</li>
</ul>

<h2>Quick Tips</h2>
<ol>
  <li>Use the sidebar to navigate between different sections</li>
  <li>Click the search bar to quickly find tasks, documents, or contacts</li>
  <li>Check your dashboard daily for updates and pending items</li>
</ol>

<blockquote>
  <p>💡 <strong>Pro Tip</strong>: You can use <code>/</code> to open the command menu and quickly add formatting!</p>
</blockquote>

<h2>Formatting Examples</h2>

<h3>Task Lists</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true">Read the welcome guide</li>
  <li data-type="taskItem" data-checked="false">Set up your profile</li>
  <li data-type="taskItem" data-checked="false">Create your first task</li>
</ul>

<hr>

<p><em>Last updated by Admin on January 15, 2024</em></p>
`;

export function KnowledgeEditor({ docId, docs = [], onDocSelect }: KnowledgeEditorProps) {
  const [title, setTitle] = useState("Welcome Guide");

  if (!docId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a document to view or edit
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Document Info */}
      <div className="px-4 sm:px-12 py-4 sm:py-6 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span>Created by Admin</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>Last edited 2 days ago</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Untitled Document"
        />
      </div>

      {/* Rich Text Editor */}
      <div className="flex-1 overflow-hidden">
        <TiptapEditor 
          content={defaultContent} 
          docs={docs}
          onDocSelect={onDocSelect}
        />
      </div>
    </div>
  );
}
