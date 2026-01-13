export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'staff' | 'faculty';
}

export interface RecurrenceSettings {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6 for weekly recurrence
  dayOfMonth?: number; // for monthly recurrence
}

export interface CommentReaction {
  emoji: string;
  users: User[];
}

export interface TaskComment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  attachments?: TaskAttachment[];
  reactions?: CommentReaction[];
  parentCommentId?: string; // For replies
  replies?: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string; // data URL for demo, would be storage URL in production
  uploadedBy: User;
  uploadedAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: User;
  dueDate?: Date;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // Now dynamic based on custom statuses
  effort: 'easy' | 'light' | 'focused' | 'deep';
  importance: 'low' | 'routine' | 'important' | 'critical';
  dueDate?: Date;
  assignees: User[];
  projectId?: string;
  tags: string[];
  isRecurring?: boolean;
  recurrence?: RecurrenceSettings;
  parentTaskId?: string; // for recurring task instances
  recurrenceIndex?: number; // which instance this is (0 = original)
  completedAt?: Date; // timestamp when task was marked complete
  archivedAt?: Date; // timestamp when task was archived
  estimatedTime?: number; // in minutes
  progress?: number; // 0-100 percentage
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  subtasks?: Subtask[];
  howToLink?: string; // Link to SOP documentation
  sortOrder?: number; // for manual drag-and-drop sorting
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  tasks: Task[];
  owners: User[];
  members: User[];
  teamId: string;
  createdAt: Date;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  parentId?: string;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Request {
  id: string;
  type: 'time-off' | 'supplies' | 'lesson-change' | 'other';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: User;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  attachments?: string[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  assignees: User[];
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'parent' | 'guardian' | 'prospect';
  students?: Contact[];
  stage?: 'lead' | 'contacted' | 'qualified' | 'enrolled';
  notes: string[];
}
