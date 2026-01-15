import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFullName(firstName: string, lastName?: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || first;
}
