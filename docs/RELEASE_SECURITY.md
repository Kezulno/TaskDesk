# Release security checklist

TaskDeck can build unsigned installers locally, but a public Windows release should be signed.

## Required before publishing

1. Run `npm ci` and `npm run check`.
2. Run `cargo audit --file src-tauri/Cargo.lock` and resolve applicable advisories.
3. Run `cargo test` and Clippy with warnings denied.
4. Build NSIS and MSI installers with `npm run tauri build`.
5. Sign the executable and installers with a trusted Windows code-signing certificate.
6. Upload SHA-256 checksums with every GitHub release.
7. Test install, upgrade, uninstall, database migration, and SmartScreen behavior on a clean Windows VM.

Run `powershell -ExecutionPolicy Bypass -File scripts/release-check.ps1` to enforce these checks and generate `SHA256SUMS.txt`. For a local unsigned smoke test only, add `-AllowUnsigned`; do not publish that output as a trusted release.

## Signing secrets

Never commit PFX files, private updater keys, certificate passwords, or cloud-signing credentials. Keep them in the Windows certificate store or encrypted GitHub Actions secrets. The repository ignores common certificate and key extensions.

## Automatic updates

Tauri updater signatures cannot be disabled. Do not enable the updater until its private key is stored securely and the corresponding public key and GitHub Releases endpoint are configured. Losing the private key prevents trusted updates for existing installations.
