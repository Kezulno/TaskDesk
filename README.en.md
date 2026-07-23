# TaskDeck

[한국어](README.md) | [English](README.en.md)

> Bring the apps and websites you use together and open your work environment in one action.

TaskDeck is a Windows desktop app that organizes applications, websites, folders, and files into reusable **workspaces**. You can create workspaces for development, forensic analysis, video editing, study, or any other activity, then open the tools you need in your preferred order.

No account or backend server is required. Your workspaces and settings stay on your computer.

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4)
![Version](https://img.shields.io/badge/version-0.1.0-22c55e)
![Language](https://img.shields.io/badge/UI-Korean%20%7C%20English-f59e0b)

## Download

TaskDeck supports 64-bit Windows 10 and Windows 11.

### [Download TaskDeck 0.1.0 for Windows](https://github.com/Kezulno/TaskDesk/releases/download/v0.1.0/TaskDeck_0.1.0_x64-setup.exe)

The EXE installer above is recommended for most users.

- [Download the MSI installer](https://github.com/Kezulno/TaskDesk/releases/download/v0.1.0/TaskDeck_0.1.0_x64_en-US.msi) — intended for managed or organizational deployment
- [View all releases and release notes](https://github.com/Kezulno/TaskDesk/releases)

> Direct download links will work after the `v0.1.0` GitHub Release and its installer assets are published. The current development build is not code-signed, so Windows SmartScreen may display a warning.

## Get started

1. Install and open TaskDeck.
2. Select **New workspace** and choose a name, color, and icon.
3. Use **Add resource** to register an application, website, folder, or file.
4. Use the up and down controls to arrange the opening order.
5. Select **Open work environment** to open all enabled resources in order.

You can also open one resource at a time with its **Launch** button or by double-clicking its card.

## Example workspaces

| Workspace              | Resources you might add                                             |
| ---------------------- | ------------------------------------------------------------------- |
| Development            | VS Code, Docker Desktop, GitHub, API documentation, project folders |
| Security and forensics | Autopsy, Wireshark, CyberChef, analysis tools, evidence folders     |
| AI                     | ChatGPT, Claude, Copilot, local AI tools, prompt documents          |
| Video editing          | Editing software, media folders, reference websites                 |
| Study and notes        | Note-taking apps, course websites, documents, study folders         |

## Features

### Organize workspaces

- Choose a name, description, color, and icon
- Pin favorite workspaces and duplicate existing configurations
- Manage apps, websites, folders, and files by workspace
- Back up or share workspace configurations as JSON templates

### Add applications easily

- Find installed apps from the Windows Start Menu and Program Files
- Select an `.exe` file manually
- Drag applications, files, or folders from File Explorer into TaskDeck
- Browse recommended apps and websites for development, AI, security, video, notes, and more
- Read application names and icons from executable metadata when available

### Launch resources safely

- Check that applications, files, and folders exist before opening them
- Allow only `http://` and `https://` website addresses
- Warn about missing or invalid resources and prevent them from launching
- Continue with the next resource if one item fails
- Never build an arbitrary Command Prompt or PowerShell command from a target path

### Adjust TaskDeck to your workflow

- Switch between Korean and English
- Change the delay between resources
- Minimize to the system tray when closing the window
- Start TaskDeck automatically when you sign in to Windows
- Use the built-in dark theme

## If an application is not detected

Some applications cannot be detected automatically because of how Windows installs or protects them. Examples include:

- Apps installed in protected Microsoft Store locations
- Portable apps without installation records
- Apps stored on network drives
- Apps that depend on a specialized launcher

Use **Add resource → Add manually** to select the executable, or drag its `.exe` file from File Explorer into the TaskDeck window. Website addresses can also be entered manually.

## Change the language

Open **Settings → Language** and select `한국어` or `English`. TaskDeck remembers your choice after the app restarts.

## Import and share templates

Use **Import template** on the dashboard to load a workspace configuration created by someone else. You can export the current workspace as JSON from its workspace page.

- Templates contain configuration details, not application binaries or user files.
- Imported resources are never launched automatically.
- Paths that do not exist on the current computer are still saved and marked as needing attention.
- Local paths may contain personal information such as a Windows user name. Review them before sharing a template.

<details>
<summary>View an example template</summary>

```json
{
  "schemaVersion": 1,
  "name": "Development Starter",
  "description": "Common development tools",
  "author": "TaskDeck User",
  "category": "development",
  "exportedAt": "2026-07-13T00:00:00.000Z",
  "workspace": {
    "name": "Development",
    "description": "Local development workspace",
    "icon": "code",
    "color": "#6366f1"
  },
  "resources": [
    {
      "type": "website",
      "name": "Documentation",
      "target": "https://example.com/docs",
      "icon": null,
      "description": null,
      "launchOrder": 0,
      "isEnabled": true
    }
  ]
}
```

</details>

## Frequently asked questions

### Does TaskDeck launch anything automatically?

No. Resources are launched only when you select **Launch** or **Open work environment**. Opening a template or browsing the recommendation catalog never installs or launches an application.

### Is my workspace data sent to a server?

No TaskDeck account or backend server is used. Workspaces, resources, and settings are stored in a local SQLite database inside the operating system's TaskDeck app-data directory.

### Can TaskDeck find every installed app?

No scanner can reliably detect every Windows application because installation methods vary. You can add an application manually or by drag and drop when it is not detected.

### Does deleting a workspace delete my files or applications?

No. Deleting a workspace removes only its TaskDeck configuration. It does not uninstall applications or delete your files.

## Development

### Technology

- Tauri v2 and Rust
- React, strict TypeScript, and Vite
- Tailwind CSS, Radix UI, and Lucide React
- Zustand, React Router, React Hook Form, and Zod
- SQLite with bundled `rusqlite`

### Prerequisites

- Node.js 20 or newer and npm
- Rust stable (`rustup`, `cargo`, and `rustc`)
- The **Desktop development with C++** workload from Microsoft C++ Build Tools
- Microsoft Edge WebView2 Runtime

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for detailed setup instructions.

```powershell
git clone https://github.com/Kezulno/TaskDesk.git
cd TaskDesk
npm install
npm run tauri dev
```

`npm run dev` starts only the browser interface. Use `npm run tauri dev` when testing the database, native file dialogs, app scanning, or resource launching.

### Checks and production build

```powershell
npm run format:check
npm run typecheck
npm run lint
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Windows installers are generated in:

```text
src-tauri/target/release/bundle/nsis
src-tauri/target/release/bundle/msi
```

To build only the recommended NSIS installer, run `npm run tauri build -- --bundles nsis`.

### Project structure

```text
src/
  app/                    Routing and application entry point
  components/             Shared UI and layout components
  features/
    catalog/              App and website recommendation catalog
    i18n/                 Korean and English translations
    launcher/             Individual and batch launching
    resources/            Resource management, scanning, and validation
    settings/             Launch interval, tray, autostart, and language
    templates/            JSON import and export
    workspaces/           Workspace management
  pages/                  Route-level pages
src-tauri/
  capabilities/           Tauri permissions
  src/                    SQLite, validation, scanning, and launch commands
```

## Security and privacy

- The frontend is not given access to a general-purpose shell API.
- Target paths are never concatenated into Command Prompt or PowerShell command strings.
- Websites are limited to HTTP and HTTPS.
- Imported JSON is never evaluated as a command or script.
- The current installers are not code-signed.

If you find a security issue, read [SECURITY.md](SECURITY.md) before creating a public issue.

## Known limitations

- Some Microsoft Store/UWP apps and specialized launchers may not be detected or launched automatically.
- Application name and icon quality depend on the metadata provided by the installer or shortcut.
- Some detailed Windows or Rust errors may appear in the original text provided by the operating system.
- Code signing and automatic updates are not yet available.

## Roadmap

- Code-signed Windows installers and automatic updates
- Improved Microsoft Store app detection
- Easier path remapping for templates imported on another computer
- Drag-and-drop resource ordering and launch profiles
- More languages and accessibility improvements

## Contributing

Bug fixes, translations, documentation, and catalog improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before getting started.

## License

TaskDeck is available under the [MIT License](LICENSE).
