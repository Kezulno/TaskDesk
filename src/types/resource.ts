export type ResourceType = "application" | "website" | "folder" | "file";

export interface Resource {
  id: string;
  workspaceId: string;
  type: ResourceType;
  name: string;
  target: string;
  icon: string | null;
  description: string | null;
  launchOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceInput {
  type: ResourceType;
  name: string;
  target: string;
  icon?: string | null;
  description?: string | null;
  isEnabled: boolean;
}

export interface ResourceValidationResult {
  valid: boolean;
  exists: boolean;
  message: string | null;
}

export interface LaunchResult {
  success: boolean;
  resourceId: string;
  message: string;
}
