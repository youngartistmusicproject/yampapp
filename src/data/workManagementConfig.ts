import { User, Team } from "@/types";

// Teams - organizational hierarchy above projects
export const teamsLibrary: Team[] = [
  { id: "operations", name: "Operations", color: "#6366f1", description: "Day-to-day business operations" },
  { id: "teachers", name: "Teachers", color: "#10b981", description: "Teaching staff and instruction" },
  { id: "sales-marketing", name: "Sales & Marketing", color: "#f59e0b", description: "Sales and marketing activities" },
  { id: "students", name: "Students", color: "#3b82f6", description: "Student-related tasks and activities" },
  { id: "finance-accounting", name: "Finance & Accounting", color: "#8b5cf6", description: "Financial operations and accounting" },
];

// Predefined tag library - only admins can modify this list
export const tagLibrary = [
  { id: "teaching", name: "Teaching", color: "#3b82f6" },
  { id: "planning", name: "Planning", color: "#8b5cf6" },
  { id: "admin", name: "Admin", color: "#6b7280" },
  { id: "reports", name: "Reports", color: "#f59e0b" },
  { id: "communication", name: "Communication", color: "#10b981" },
  { id: "parents", name: "Parents", color: "#ec4899" },
  { id: "supplies", name: "Supplies", color: "#14b8a6" },
  { id: "recital", name: "Recital", color: "#eb5c5c" },
  { id: "design", name: "Design", color: "#a855f7" },
  { id: "urgent", name: "Urgent", color: "#ef4444" },
  { id: "meeting", name: "Meeting", color: "#0ea5e9" },
  { id: "curriculum", name: "Curriculum", color: "#84cc16" },
];

export type TagItem = (typeof tagLibrary)[number];

// Custom statuses - configurable by admins
export const statusLibrary = [
  { id: "not-started", name: "Not Started", color: "#6b7280" },
  { id: "in-progress", name: "In Progress", color: "#eb5c5c" },
  { id: "waiting", name: "Waiting", color: "#f59e0b" },
  { id: "needs-review", name: "Needs Review", color: "#8b5cf6" },
];

export type StatusItem = (typeof statusLibrary)[number];

// Effort options - describes the level of work required
export const effortLibrary = [
  { id: "easy", name: "Easy", color: "#10b981", description: "Quick, just do it" },
  { id: "light", name: "Light", color: "#3b82f6", description: "Can multitask" },
  { id: "focused", name: "Focused", color: "#f59e0b", description: "Needs concentration" },
  { id: "deep", name: "Deep", color: "#ef4444", description: "No distractions" },
];

export type EffortItem = (typeof effortLibrary)[number];

// Importance options - describes the impact of the task
export const importanceLibrary = [
  { id: "low", name: "Low", color: "#6b7280", description: "Optional" },
  { id: "routine", name: "Routine", color: "#3b82f6", description: "Standard work" },
  { id: "important", name: "Important", color: "#f59e0b", description: "Must complete" },
  { id: "critical", name: "Critical", color: "#ef4444", description: "Top priority" },
];

export type ImportanceItem = (typeof importanceLibrary)[number];

// Mock team members with avatars
export const teamMembers: User[] = [
  { 
    id: "u1", 
    name: "Sarah Johnson", 
    email: "sarah@company.com", 
    role: "owner",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
  },
  { 
    id: "u2", 
    name: "Mike Chen", 
    email: "mike@company.com", 
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  { 
    id: "u3", 
    name: "Emily Davis", 
    email: "emily@company.com", 
    role: "faculty",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  },
  { 
    id: "u4", 
    name: "Alex Rivera", 
    email: "alex@company.com", 
    role: "staff"
    // No avatar - will show initials
  },
  { 
    id: "u5", 
    name: "Jordan Smith", 
    email: "jordan@company.com", 
    role: "faculty",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
];

export function getTagById(id: string): TagItem | undefined {
  return tagLibrary.find(tag => tag.id === id);
}

export function getStatusById(id: string): StatusItem | undefined {
  return statusLibrary.find(status => status.id === id);
}

export function getEffortById(id: string): EffortItem | undefined {
  return effortLibrary.find(effort => effort.id === id);
}

export function getImportanceById(id: string): ImportanceItem | undefined {
  return importanceLibrary.find(importance => importance.id === id);
}
