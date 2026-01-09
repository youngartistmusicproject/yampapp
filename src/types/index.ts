export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'staff' | 'faculty' | 'parent' | 'student';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignees: User[];
  projectId?: string;
  tags: string[];
  isRecurring?: boolean;
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
