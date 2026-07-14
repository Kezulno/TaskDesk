export interface BatchLaunchItemResult {
  resourceId: string;
  resourceName: string;
  success: boolean;
  skipped: boolean;
  message: string;
}

export interface BatchLaunchResult {
  workspaceId: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  items: BatchLaunchItemResult[];
}

export interface BatchLaunchProgress {
  workspaceId: string;
  completed: number;
  total: number;
  currentResourceName: string;
}
