param(
    [switch]$AllowUnsigned
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

npm.cmd ci --no-audit --no-fund
npm.cmd run check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings

if (-not (Get-Command cargo-audit -ErrorAction SilentlyContinue)) {
    throw "cargo-audit is required. Install version 0.22.2 with: cargo install cargo-audit --locked --version 0.22.2"
}

npm.cmd audit --audit-level=high
cargo audit --file src-tauri/Cargo.lock
npm.cmd run tauri -- build

$bundleDirectory = Join-Path $repositoryRoot "src-tauri\target\release\bundle"
$artifacts = Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File |
    Where-Object { $_.Extension -in @(".exe", ".msi") }

if (-not $artifacts) {
    throw "No Windows installer artifacts were produced."
}

$unsigned = $artifacts | Where-Object {
    (Get-AuthenticodeSignature -LiteralPath $_.FullName).Status -ne "Valid"
}
if ($unsigned -and -not $AllowUnsigned) {
    $names = ($unsigned.Name -join ", ")
    throw "Unsigned release artifacts detected: $names. Sign them or rerun only for local testing with -AllowUnsigned."
}

$checksumPath = Join-Path $bundleDirectory "SHA256SUMS.txt"
$checksums = $artifacts | Sort-Object FullName | ForEach-Object {
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
    "{0}  {1}" -f $hash.Hash.ToLowerInvariant(), $_.Name
}
Set-Content -LiteralPath $checksumPath -Value $checksums -Encoding utf8NoBOM
Write-Output "Release verification complete. Checksums: $checksumPath"
