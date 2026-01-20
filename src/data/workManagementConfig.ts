// Area tags - admin-configurable labels for categorizing work
export const tagLibrary = [
  { id: "operations", name: "Operations", color: "#3b82f6" },
  { id: "finance", name: "Finance", color: "#10b981" },
  { id: "marketing", name: "Marketing", color: "#ec4899" },
  { id: "human-resources", name: "Human Resources", color: "#8b5cf6" },
  { id: "sales", name: "Sales", color: "#f59e0b" },
  { id: "engineering", name: "Engineering", color: "#0ea5e9" },
  { id: "customer-support", name: "Customer Support", color: "#14b8a6" },
  { id: "legal", name: "Legal", color: "#6b7280" },
  { id: "product", name: "Product", color: "#84cc16" },
  { id: "executive", name: "Executive", color: "#ef4444" },
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
