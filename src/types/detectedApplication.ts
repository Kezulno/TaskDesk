export type ApplicationSource =
  | "user_start_menu"
  | "system_start_menu"
  | "program_files"
  | "program_files_x86"
  | "user_programs"
  | "registry"
  | "executable"
  | "file_association";

export interface ApplicationCompatibility {
  compatible: boolean;
  exists: boolean;
  architecture: string | null;
  message: string | null;
}

export interface DetectedApplication {
  id: string;
  name: string;
  executablePath: string;
  shortcutPath: string | null;
  source: ApplicationSource;
  iconPath: string | null;
  valid: boolean;
  compatibility: ApplicationCompatibility;
  isInstaller: boolean;
}
