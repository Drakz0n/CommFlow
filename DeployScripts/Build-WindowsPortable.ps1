<#
.SYNOPSIS
    Builds the CommFlow Windows portable executable and stages release artifacts.

.DESCRIPTION
    - Optionally restores npm dependencies if the node_modules folder is missing (override with -SkipRestore).
    - Invokes the Tauri CLI to build the Windows "app" bundle, which produces the portable .exe.
    - Copies the executable and license into deploy-artifacts/CommFlow-portable.
    - Generates a simple signature file identifying the developer.
    - Creates a zip archive alongside the staged folder for easy distribution.

.PARAMETER SkipRestore
    Skips the dependency restore step if you have already run npm install.

.EXAMPLE
    # Build portable bundle, restoring dependencies if needed
    ./DeployScripts/Build-WindowsPortable.ps1

.EXAMPLE
    # Build without touching node_modules
    ./DeployScripts/Build-WindowsPortable.ps1 -SkipRestore
#>
param(
    [switch]$SkipRestore
)

$ErrorActionPreference = 'Stop'

function Write-Info($message) {
    Write-Host "[CommFlow] $message" -ForegroundColor Cyan
}

function Resolve-NpmPath {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        $npm = Get-Command npm -ErrorAction SilentlyContinue
    }

    if (-not $npm) {
        throw 'npm command not found. Please ensure Node.js/npm are installed and available on PATH.'
    }

    return $npm.Source
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $projectRoot

Write-Info "Project root: $projectRoot"

$npmPath = Resolve-NpmPath
Write-Info "Using npm at: $npmPath"

if (-not $SkipRestore -and -not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
    Write-Info 'node_modules not found. Restoring npm dependencies...'
    & $npmPath 'install'
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }
} elseif ($SkipRestore) {
    Write-Info 'Skipping dependency restore as requested.'
} else {
    Write-Info 'Dependencies already present. Skipping npm install.'
}

Write-Info 'Building Tauri portable executable (Windows app bundle)...'
$buildArgs = @('run', 'tauri:build')
Write-Info "Running: npm $($buildArgs -join ' ')"
& $npmPath $buildArgs
if ($LASTEXITCODE -ne 0) {
    throw "Tauri build failed with exit code $LASTEXITCODE."
}

$bundleRoot = Join-Path $projectRoot 'src-tauri\target\release\bundle\app'
$releaseRoot = Join-Path $projectRoot 'src-tauri\target\release'
$searchDirs = @()

if (Test-Path $bundleRoot) {
    Write-Info "Bundle output detected at: $bundleRoot"
    $searchDirs += $bundleRoot
} else {
    Write-Info "Bundle folder not found, falling back to release output: $releaseRoot"
}

$searchDirs += $releaseRoot

$portableExe = $null
foreach ($dir in $searchDirs) {
    if (-not (Test-Path $dir)) {
        continue
    }

    $candidate = Get-ChildItem -Path $dir -Filter 'CommFlow*.exe' -File -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($candidate) {
        $portableExe = $candidate
        break
    }
}

if (-not $portableExe) {
    throw 'Portable executable could not be located in the build output.'
}

Write-Info "Found portable executable: $($portableExe.Name)"

$artifactsRoot = Join-Path $projectRoot 'deploy-artifacts'
$stageDir = Join-Path $artifactsRoot 'CommFlow-portable'
Remove-Item -Path $stageDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

Copy-Item $portableExe.FullName -Destination $stageDir -Force
Copy-Item (Join-Path $projectRoot 'LICENSE') -Destination $stageDir -Force

$signatureText = @(
    'CommFlow Portable Build Signature',
    "Developer: AnOTTER",
    "Identifier: OtterWithInternet",
    "Executable: $($portableExe.Name)",
    "Generated: $(Get-Date -Format o)"
) -join [Environment]::NewLine

$signaturePath = Join-Path $stageDir 'SIGNATURE.txt'
$signatureText | Set-Content -Path $signaturePath -Encoding UTF8

Write-Info "Staged artifacts in: $stageDir"

$zipPath = Join-Path $artifactsRoot 'CommFlow-portable.zip'
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipPath

Write-Info "Portable build ready:"
Write-Info " - $stageDir"
Write-Info " - $zipPath"
Write-Info 'Done!'
