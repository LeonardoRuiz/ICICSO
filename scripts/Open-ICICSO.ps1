param(
    [Parameter(Mandatory = $true)]
    [string] $Target,
    [string] $DesktopRoot,
    [switch] $ResolveOnly
)

$ErrorActionPreference = "Stop"

function Resolve-DesktopHubRoot {
    $candidates = @(
        (Join-Path $env:USERPROFILE "OneDrive\Desktop\ICICSO Local"),
        (Join-Path ([Environment]::GetFolderPath("Desktop")) "ICICSO Local"),
        (Join-Path $env:USERPROFILE "Desktop\ICICSO Local")
    ) | Select-Object -Unique

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return $candidate
        }
    }

    foreach ($candidate in $candidates) {
        $parent = Split-Path -Parent $candidate
        if ($candidate -and $parent -and (Test-Path -LiteralPath $parent)) {
            return $candidate
        }
    }

    return $candidates[0]
}

if (-not $DesktopRoot) {
    $DesktopRoot = Resolve-DesktopHubRoot
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot "config\runtime\desktop-hub.json"

if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "No se encontro el manifest del hub en $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$entry = $manifest.entries | Where-Object { $_.id -eq $Target } | Select-Object -First 1

if (-not $entry) {
    throw "Target no reconocido: $Target"
}

function Resolve-RepoPath {
    param([string] $RelativePath)
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $RelativePath))
}

function Open-FileOrFolder {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "No existe la ruta: $Path"
    }

    Start-Process -FilePath $Path | Out-Null
}

function Write-ResolveResult {
    param(
        [string] $TargetId,
        [string] $TargetType,
        [string] $ResolvedTarget
    )

    [pscustomobject]@{
        TargetId = $TargetId
        TargetType = $TargetType
        ResolvedTarget = $ResolvedTarget
    } | ConvertTo-Json -Compress
}

switch ($entry.targetType) {
    "url" {
        if ($ResolveOnly) {
            Write-ResolveResult -TargetId $entry.id -TargetType $entry.targetType -ResolvedTarget $entry.target
            break
        }
        Start-Process -FilePath $entry.target | Out-Null
        break
    }
    "file" {
        $resolvedTarget = Resolve-RepoPath -RelativePath $entry.target
        if ($ResolveOnly) {
            Write-ResolveResult -TargetId $entry.id -TargetType $entry.targetType -ResolvedTarget $resolvedTarget
            break
        }
        Open-FileOrFolder -Path $resolvedTarget
        break
    }
    "folder" {
        $resolvedTarget = Resolve-RepoPath -RelativePath $entry.target
        if ($ResolveOnly) {
            Write-ResolveResult -TargetId $entry.id -TargetType $entry.targetType -ResolvedTarget $resolvedTarget
            break
        }
        Open-FileOrFolder -Path $resolvedTarget
        break
    }
    "cmd" {
        $cmdPath = Resolve-RepoPath -RelativePath $entry.target
        if (-not (Test-Path -LiteralPath $cmdPath)) {
            throw "No existe el launcher: $cmdPath"
        }
        if ($ResolveOnly) {
            Write-ResolveResult -TargetId $entry.id -TargetType $entry.targetType -ResolvedTarget $cmdPath
            break
        }
        Start-Process -FilePath $cmdPath -WorkingDirectory $repoRoot | Out-Null
        break
    }
    "script" {
        $scriptPath = Resolve-RepoPath -RelativePath $entry.target
        if (-not (Test-Path -LiteralPath $scriptPath)) {
            throw "No existe el script: $scriptPath"
        }
        if ($ResolveOnly) {
            Write-ResolveResult -TargetId $entry.id -TargetType $entry.targetType -ResolvedTarget $scriptPath
            break
        }

        Start-Process -FilePath "powershell.exe" -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            $scriptPath
        ) -WorkingDirectory $repoRoot | Out-Null
        break
    }
    default {
        throw "Tipo de target no soportado: $($entry.targetType)"
    }
}
