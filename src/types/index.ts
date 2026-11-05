/**
 * Global TypeScript Interfaces & Shared Types
 */

export type UserRole = "user" | "admin" | "recruiter";

export interface UserSession {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
