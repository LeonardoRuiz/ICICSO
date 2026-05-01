param(
    [string] $DesktopRoot
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
$openScriptPath = Join-Path $repoRoot "scripts\Open-ICICSO.ps1"

if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "No se encontro el manifest del hub: $manifestPath"
}

if (-not (Test-Path -LiteralPath $openScriptPath)) {
    throw "No se encontro el script de apertura: $openScriptPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$desktopName = if ($manifest.desktopRootName) { $manifest.desktopRootName } else { "ICICSO Local" }

$sections = [ordered]@{
    "01_Start_Here" = "Entrada principal del hub"
    "02_Launchers" = "Launchers operativos"
    "03_Documentation" = "Documentacion canonica"
    "04_Reports" = "Mapas y auditorias"
    "05_Operations" = "Accesos de producto y operacion"
    "06_Assets" = "Assets de apoyo"
    "_archive" = "Historial y material retirado"
}

function Ensure-Directory {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Resolve-RepoPath {
    param([string] $RelativePath)
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $RelativePath))
}

function Convert-ToFileUri {
    param([string] $Path)
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    return ([System.Uri] $resolved).AbsoluteUri
}

function Write-Utf8File {
    param(
        [string] $Path,
        [string] $Content
    )
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

function New-CmdLauncherContent {
    param([string] $TargetId)

    return @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$openScriptPath" -Target "$TargetId"
"@
}

function Get-CategoryFolder {
    param([string] $Category)

    switch ($Category) {
        "launcher" { return "02_Launchers" }
        "documentation" { return "03_Documentation" }
        "report" { return "04_Reports" }
        "operation" { return "05_Operations" }
        default { throw "Categoria no soportada: $Category" }
    }
}

Ensure-Directory -Path $DesktopRoot
foreach ($section in $sections.Keys) {
    Ensure-Directory -Path (Join-Path $DesktopRoot $section)
}

$archiveStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveRoot = Join-Path $DesktopRoot "_archive\sync-$archiveStamp"
Ensure-Directory -Path $archiveRoot

$knownConflictFiles = @(
    (Join-Path $DesktopRoot "01_Start_Here\ICICSO Local Cockpit.backup.20260405.html"),
    (Join-Path $DesktopRoot "01_Start_Here\ICICSO Local Cockpit.backup.20260405.v2.html"),
    (Join-Path $DesktopRoot "START_HERE.lnk"),
    (Join-Path $DesktopRoot "Repo ICICSO.lnk"),
    (Join-Path $DesktopRoot "02_Launchers\Open Desktop Launcher HTML.cmd"),
    (Join-Path $DesktopRoot "03_Documentation\Open Documentation Master.cmd"),
    (Join-Path $DesktopRoot "03_Documentation\Open LOCAL_OPERATIONS_README.cmd"),
    (Join-Path $DesktopRoot "03_Documentation\Open Roadmap.cmd"),
    (Join-Path $DesktopRoot "04_Reports\Open LOCAL_HUB_MAP.cmd"),
    (Join-Path $DesktopRoot "05_Operations\Open Canon Emulator HTML.cmd"),
    (Join-Path $DesktopRoot "05_Operations\Open Emulator HTML.cmd"),
    (Join-Path $DesktopRoot "05_Operations\Open Grafana.cmd")
)

foreach ($conflictPath in $knownConflictFiles) {
    if (Test-Path -LiteralPath $conflictPath) {
        Move-Item -LiteralPath $conflictPath -Destination (Join-Path $archiveRoot ([System.IO.Path]::GetFileName($conflictPath))) -Force
    }
}

$rootStartHereCmd = @"
@echo off
start "" "$DesktopRoot\01_Start_Here\ICICSO Local Cockpit.html"
"@

Write-Utf8File -Path (Join-Path $DesktopRoot "START_HERE.cmd") -Content $rootStartHereCmd
Write-Utf8File -Path (Join-Path $DesktopRoot "01_Start_Here\START_HERE.cmd") -Content $rootStartHereCmd

foreach ($entry in $manifest.entries) {
    $folderName = Get-CategoryFolder -Category $entry.category
    $outputPath = Join-Path (Join-Path $DesktopRoot $folderName) $entry.fileName
    Write-Utf8File -Path $outputPath -Content (New-CmdLauncherContent -TargetId $entry.id)
}

$launcherEntries = @($manifest.entries | Where-Object { $_.category -eq "launcher" })
$documentationEntries = @($manifest.entries | Where-Object { $_.category -eq "documentation" })
$reportEntries = @($manifest.entries | Where-Object { $_.category -eq "report" })
$operationEntries = @($manifest.entries | Where-Object { $_.category -eq "operation" })

$startHereUri = Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath "START_HERE.md")
$systemStatusUri = Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath "SYSTEM_STATUS.md")
$nextActionsUri = Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath "NEXT_ACTIONS.md")
$localDevelopmentUri = Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath "docs/local-development.md")
$auditReportUri = Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath "AUDIT_REPORT.md")

$launcherListHtml = ($launcherEntries | ForEach-Object {
    $launcherPath = Join-Path (Join-Path $DesktopRoot "02_Launchers") $_.fileName
    $launcherUri = Convert-ToFileUri -Path $launcherPath
@"
          <a class="panel launcher-card" href="$launcherUri">
            <div class="meta">Launcher</div>
            <strong>$($_.label)</strong>
            <p>$($_.description)</p>
            <div class="path">02_Launchers\$($_.fileName)</div>
          </a>
"@
}) -join "`n"

$docLinksHtml = ($documentationEntries | ForEach-Object {
    $filePath = Resolve-RepoPath -RelativePath $_.target
    $fileUri = Convert-ToFileUri -Path $filePath
@"
          <a class="link-card" href="$fileUri">
            <strong>$($_.label)</strong>
            <span>$($_.description)</span>
          </a>
"@
}) -join "`n"

$reportLinksHtml = ($reportEntries | ForEach-Object {
    $filePath = Resolve-RepoPath -RelativePath $_.target
    $fileUri = Convert-ToFileUri -Path $filePath
@"
          <a class="link-card" href="$fileUri">
            <strong>$($_.label)</strong>
            <span>$($_.description)</span>
          </a>
"@
}) -join "`n"

$operationLinksHtml = ($operationEntries | ForEach-Object {
    $href = if ($_.targetType -eq "url") {
        $_.target
    }
    else {
        Convert-ToFileUri -Path (Resolve-RepoPath -RelativePath $_.target)
    }
@"
          <a class="link-card" href="$href">
            <strong>$($_.label)</strong>
            <span>$($_.description)</span>
          </a>
"@
}) -join "`n"

$desktopEntriesMd = @(
    '# Desktop Entrypoints',
    '',
    'Hub operativo generado desde el repo:',
    '',
    "- repo: `$repoRoot` -> $repoRoot",
    "- escritorio: `$DesktopRoot` -> $DesktopRoot",
    '',
    '## Regla',
    '',
    '- `02_Launchers`: arrancan, detienen o diagnostican.',
    '- `03_Documentation`: abren documentacion canonica.',
    '- `04_Reports`: abren mapas y auditorias.',
    '- `05_Operations`: abren producto, overview y fuentes operativas.',
    '',
    '## Superficies principales',
    '',
    '- mockup dashboard: `http://127.0.0.1:8090/index.html`',
    '- canon emulator: `http://127.0.0.1:8098/index.html`',
    '- gateway health: `http://127.0.0.1:3100/health`',
    '- block1 overview: `http://127.0.0.1:3100/block1/overview`',
    '',
    '## Documentacion principal',
    '',
    "- [START_HERE]($startHereUri)",
    "- [SYSTEM_STATUS]($systemStatusUri)",
    "- [NEXT_ACTIONS]($nextActionsUri)",
    "- [Local Development]($localDevelopmentUri)",
    "- [AUDIT_REPORT]($auditReportUri)"
) -join "`r`n"

$localHubMapLines = @(
    '# Local Hub Map',
    '',
    "Fecha de generacion: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    '',
    '## Estructura',
    ''
)
$localHubMapLines += $sections.GetEnumerator() | ForEach-Object { "- $($_.Key) : $($_.Value)" }
$localHubMapLines += @(
    '',
    '## Fuente de verdad',
    '',
    'La carpeta del escritorio ya no define rutas por su cuenta.',
    '',
    'Todo launcher `.cmd` delega en:',
    '',
    "- `$openScriptPath` -> $openScriptPath",
    '',
    'Todo destino operativo viene del manifest:',
    '',
    "- `$manifestPath` -> $manifestPath"
)
$localHubMapMd = $localHubMapLines -join "`r`n"

$operationsReadmeMd = @(
    '# Local Operations Readme',
    '',
    '## Uso diario',
    '',
    '1. Ejecuta `START_HERE.cmd`.',
    '2. Desde `02_Launchers`, usa `Start Mockup Local.cmd` para levantar el stack local.',
    '3. Abre `05_Operations\Open Mockup Dashboard.cmd` para entrar al dashboard.',
    '4. Usa `Run Continuum Doctor.cmd` si necesitas diagnostico.',
    '5. Usa `03_Documentation` y `04_Reports` para abrir la documentacion real del repo.',
    '',
    '## Mantenimiento',
    '',
    'Si cambian rutas, entrypoints o nombres de archivos en el repo, regenera esta carpeta con:',
    '',
    '```powershell',
    '.\scripts\Sync-DesktopHub.ps1',
    '```'
) -join "`r`n"

Write-Utf8File -Path (Join-Path $DesktopRoot "DESKTOP_ENTRYPOINTS.md") -Content $desktopEntriesMd
Write-Utf8File -Path (Join-Path $DesktopRoot "LOCAL_HUB_MAP.md") -Content $localHubMapMd
Write-Utf8File -Path (Join-Path $DesktopRoot "LOCAL_OPERATIONS_README.md") -Content $operationsReadmeMd

$cockpitHtml = @(
    '<!doctype html>',
    '<html lang="es">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <title>$desktopName</title>",
    '  <style>',
    '    :root {',
    '      color-scheme: dark;',
    '      --bg: #071217;',
    '      --panel: rgba(10, 22, 27, 0.92);',
    '      --panel-soft: rgba(15, 29, 35, 0.9);',
    '      --ink: #eef8f6;',
    '      --muted: #bfd2ce;',
    '      --line: rgba(118, 159, 151, 0.22);',
    '      --accent: #63cebf;',
    '      --accent-2: #d7a35f;',
    '      --shadow: 0 24px 60px rgba(0,0,0,.35);',
    '      --radius-lg: 24px;',
    '      --radius-md: 18px;',
    '    }',
    '    * { box-sizing: border-box; }',
    '    body {',
    '      margin: 0;',
    '      min-height: 100vh;',
    '      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;',
    '      color: var(--ink);',
    '      background: radial-gradient(circle at top left, rgba(99, 206, 191, 0.15), transparent 24%), linear-gradient(180deg, #0a171c, #04090c);',
    '      padding: 20px;',
    '    }',
    '    main { max-width: 1500px; margin: 0 auto; display: grid; gap: 18px; }',
    '    .hero, .section, .panel { border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--panel); box-shadow: var(--shadow); }',
    '    .hero { padding: 28px; display: grid; gap: 14px; }',
    '    .section { padding: 22px; }',
    '    .grid { display: grid; gap: 12px; }',
    '    .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }',
    '    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }',
    '    h1, h2, p { margin: 0; }',
    '    h1, h2 { font-family: "Space Grotesk", "IBM Plex Sans", sans-serif; letter-spacing: -0.03em; }',
    '    h1 { font-size: clamp(2.4rem, 5vw, 4.6rem); line-height: .95; max-width: 12ch; }',
    '    h2 { font-size: 1.5rem; }',
    '    p { color: var(--muted); line-height: 1.6; }',
    '    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 700; }',
    '    .actions { display: flex; flex-wrap: wrap; gap: 10px; }',
    '    .button, .link-card { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; border-radius: 999px; border: 1px solid var(--line); color: var(--ink); background: rgba(255,255,255,0.04); }',
    '    .button { padding: 12px 16px; }',
    '    .button.primary { background: linear-gradient(135deg, #79dacd, #4cb4a7); color: #071118; border: none; }',
    '    .panel { padding: 16px; background: var(--panel-soft); }',
    '    .launcher-card { display: block; color: var(--ink); text-decoration: none; transition: transform .16s ease, border-color .16s ease, background .16s ease; }',
    '    .launcher-card:hover { transform: translateY(-2px); border-color: rgba(99, 206, 191, 0.55); background: rgba(20, 40, 46, 0.96); }',
    '    .panel strong { display: block; margin-top: 6px; font-size: 1.12rem; }',
    '    .path { margin-top: 8px; color: var(--accent-2); font-family: Consolas, monospace; font-size: 0.92rem; }',
    '    .link-list { display: grid; gap: 10px; margin-top: 14px; }',
    '    .link-card { justify-content: flex-start; border-radius: var(--radius-md); padding: 14px 16px; }',
    '    .link-card strong, .link-card span { display: block; }',
    '    .link-card span { color: var(--muted); margin-top: 4px; }',
    '    .meta { color: var(--accent); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }',
    '    @media (max-width: 960px) { .grid.three, .grid.two { grid-template-columns: 1fr; } .actions { display: grid; } }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <section class="hero">',
    '      <div class="eyebrow">Hub operativo generado desde el repo</div>',
    '      <h1>ICICSO Local como punto de entrada limpio.</h1>',
    '      <p>Este hub separa launchers, documentacion, reportes y producto. El escritorio ya no mantiene wrappers sueltos ni rutas inventadas: todo sale del manifest del repo y se abre mediante launchers controlados.</p>',
    '      <div class="actions">',
    '        <a class="button primary" href="http://127.0.0.1:8090/index.html">Abrir mockup dashboard</a>',
    '        <a class="button" href="http://127.0.0.1:3100/health">Abrir gateway health</a>',
    "        <a class=""button"" href=""$startHereUri"">Abrir START_HERE</a>",
    '      </div>',
    '    </section>',
    '    <section class="section">',
    '      <h2>01. Launchers operativos</h2>',
    '      <p>Cada tarjeta abre el launcher `.cmd` real dentro de `02_Launchers`. Si Windows muestra aviso de seguridad, confirma la apertura del archivo local.</p>',
    '      <div class="grid three" style="margin-top:14px;">',
    $launcherListHtml,
    '      </div>',
    '    </section>',
    '    <section class="section">',
    '      <h2>02. Accesos de producto y operacion</h2>',
    '      <p>Estos accesos son HTTP o archivos reales del repo. Son los destinos que debes abrir una vez que el stack local este arriba.</p>',
    '      <div class="link-list">',
    $operationLinksHtml,
    '      </div>',
    '    </section>',
    '    <section class="section">',
    '      <div class="grid two">',
    '        <div>',
    '          <h2>03. Documentacion canonica</h2>',
    '          <p>Abre la documentacion real del repo, no wrappers intermedios.</p>',
    '          <div class="link-list">',
    $docLinksHtml,
    '          </div>',
    '        </div>',
    '        <div>',
    '          <h2>04. Reportes y mapas</h2>',
    '          <p>Accesos directos a auditorias, clasificaciones y mapas estructurales.</p>',
    '          <div class="link-list">',
    $reportLinksHtml,
    '          </div>',
    '        </div>',
    '      </div>',
    '    </section>',
    '  </main>',
    '</body>',
    '</html>'
) -join "`r`n"

if ([string]::IsNullOrWhiteSpace($cockpitHtml) -or $cockpitHtml.Length -lt 500) {
    throw "El cockpit HTML generado quedo vacio o incompleto."
}

Write-Utf8File -Path (Join-Path $DesktopRoot "01_Start_Here\ICICSO Local Cockpit.html") -Content $cockpitHtml
