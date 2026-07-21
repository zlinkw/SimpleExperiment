param(
    [string]$ReleaseDirectory = (Join-Path $PSScriptRoot "..\\release"),
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sftpRoot = (Resolve-Path (Join-Path $root "..\\simple-sftp")).Path

function Invoke-NpmScript([string]$WorkingDirectory, [string]$Script) {
    Push-Location $WorkingDirectory
    try {
        & npm run $Script
        if ($LASTEXITCODE -ne 0) {
            throw "npm run $Script failed: $WorkingDirectory"
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipTests) {
    Invoke-NpmScript $sftpRoot "test"
    Invoke-NpmScript $root "test"
}

Invoke-NpmScript $sftpRoot "package"
Invoke-NpmScript $root "package"

$sftpPackage = Get-Content -Raw -Encoding UTF8 (Join-Path $sftpRoot "package.json") | ConvertFrom-Json
$experimentPackage = Get-Content -Raw -Encoding UTF8 (Join-Path $root "package.json") | ConvertFrom-Json
$sftpVsix = Join-Path $sftpRoot "$($sftpPackage.name)-$($sftpPackage.version).vsix"
$experimentVsix = Join-Path $root "$($experimentPackage.name)-$($experimentPackage.version).vsix"

foreach ($file in @($sftpVsix, $experimentVsix)) {
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Missing package output: $file"
    }
}

$bundle = Join-Path $ReleaseDirectory "SimpleExperiment-$($experimentPackage.version)"
New-Item -ItemType Directory -Force -Path $bundle | Out-Null
Get-ChildItem -LiteralPath $bundle -File -Filter "*.vsix" | Remove-Item -Force
Copy-Item -LiteralPath $sftpVsix, $experimentVsix -Destination $bundle -Force
Copy-Item -LiteralPath (Join-Path $root "scripts\\install-public-release.ps1") -Destination $bundle -Force
Copy-Item -LiteralPath (Join-Path $root "docs\\simple-experiment-setup.md") -Destination $bundle -Force

$readme = @(
    "# SimpleExperiment Offline Bundle",
    "",
    "1. Run install-public-release.ps1 from this directory.",
    "2. In every open VS Code window, run Developer: Reload Window.",
    "3. Run SimpleExperiment: Open Setup Guide from VS Code Command Palette.",
    "4. Configure Xshell sessions, then set Hub/Worker project parent directories in SimpleExperiment.",
    "",
    "This bundle installs SimpleSFTP and SimpleExperiment together.",
    "The installer removes legacy zlk-local extension IDs after the public extensions are verified.",
    "Before reload, an already-running legacy extension host can temporarily leave old ZLK status-bar items beside the new UI."
) -join [Environment]::NewLine

$readme | Set-Content -LiteralPath (Join-Path $bundle "README.md") -Encoding UTF8

Write-Host "Offline bundle created: $bundle"
