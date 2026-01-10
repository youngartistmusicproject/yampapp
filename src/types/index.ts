export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'staff' | 'faculty' | 'parent' | 'student';
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // Now dynamic based on custom statuses
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignees: User[];
  projectId?: string;
  tags: string[];
  isRecurring?: boolean;
  recurrence?: RecurrenceSettings;
  parentTaskId?: string; // for recurring task instances
  completedAt?: Date; // timestamp when task was marked complete
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  tasks: Task[];
  members: User[];
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
