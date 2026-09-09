param(
    [switch]$AllowUnsigned
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-NativeSuccess([string]$Step) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

npm.cmd ci --no-audit --no-fund
Assert-NativeSuccess "npm ci"
npm.cmd run check
Assert-NativeSuccess "Frontend verification"
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
Assert-NativeSuccess "Rust formatting"
cargo test --manifest-path src-tauri/Cargo.toml --locked
Assert-NativeSuccess "Rust tests"
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings
Assert-NativeSuccess "Rust lint"

if (-not (Get-Command cargo-audit -ErrorAction SilentlyContinue)) {
    throw "cargo-audit is required. Install version 0.22.2 with: cargo install cargo-audit --locked --version 0.22.2"
}

npm.cmd audit --audit-level=high
Assert-NativeSuccess "JavaScript dependency audit"
cargo audit --file src-tauri/Cargo.lock
Assert-NativeSuccess "Rust dependency audit"
npm.cmd run tauri -- build
Assert-NativeSuccess "Tauri build"

$bundleDirectory = Join-Path $repositoryRoot "src-tauri\target\release\bundle"
$package = Get-Content -LiteralPath (Join-Path $repositoryRoot "package.json") -Raw |
    ConvertFrom-Json
$portableSource = Join-Path $repositoryRoot "src-tauri\target\release\taskdeck.exe"
$portableDirectory = Join-Path $bundleDirectory "portable"
$portablePath = Join-Path $portableDirectory "TaskDeck_$($package.version)_portable.exe"
if (-not (Test-Path -LiteralPath $portableSource -PathType Leaf)) {
    throw "The standalone TaskDeck executable was not produced."
}
New-Item -ItemType Directory -Force -Path $portableDirectory | Out-Null
Copy-Item -LiteralPath $portableSource -Destination $portablePath -Force

$artifactPaths = @(
    (Join-Path $bundleDirectory "nsis\TaskDeck_$($package.version)_x64-setup.exe"),
    (Join-Path $bundleDirectory "msi\TaskDeck_$($package.version)_x64_en-US.msi"),
    $portablePath
)
$artifacts = $artifactPaths | ForEach-Object { Get-Item -LiteralPath $_ }

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
