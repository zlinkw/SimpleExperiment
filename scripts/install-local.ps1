$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

npm run build

$Vsix = Get-ChildItem -Path $Root -Filter "simple-experiment-*.vsix" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $Vsix) {
  npx @vscode/vsce package --no-dependencies
  $Vsix = Get-ChildItem -Path $Root -Filter "simple-experiment-*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

code --install-extension $Vsix.FullName --force
Write-Host "Installed $($Vsix.FullName)"
