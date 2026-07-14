export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}
