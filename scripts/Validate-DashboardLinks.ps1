param(
    [string] $DesktopRoot
)

$ErrorActionPreference = "Stop"

function Resolve-DesktopHubRoot {
    $candidates = @(
        (Join-Path ([Environment]::GetFolderPath("Desktop")) "ICICSO Local"),
        (Join-Path $env:USERPROFILE "OneDrive\Desktop\ICICSO Local"),
        (Join-Path $env:USERPROFILE "Desktop\ICICSO Local")
    ) | Select-Object -Unique

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
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
$dashboardRealityPath = Join-Path $repoRoot "config\runtime\dashboard-reality.json"
$openScriptPath = Join-Path $repoRoot "scripts\Open-ICICSO.ps1"
$cockpitPath = Join-Path $DesktopRoot "01_Start_Here\ICICSO Local Cockpit.html"
$repoLauncherHtml = Join-Path $repoRoot "tools\desktop-launcher\ICICSO-Local.html"
$rootDashboardPath = Join-Path $repoRoot "dashboard\index.html"
$output = [ordered]@{
    generated_at = (Get-Date).ToString("o")
    repo_root = $repoRoot
    desktop_root = $DesktopRoot
    manifest = $null
    dashboard_reality = $null
    cockpit = $null
    repo_launcher_html = $null
    root_dashboard = $null
    launchers = @()
    assets = @()
    routes = @()
    consistency = @()
    commands = @()
}

function Add-Result {
    param(
        [string] $Area,
        [string] $Name,
        [string] $Status,
        [string] $Detail
    )

    $item = [pscustomobject]@{
        name = $Name
        status = $Status
        detail = $Detail
    }

    $output[$Area] += $item
}

function Test-HttpUrl {
    param([string] $Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return [pscustomobject]@{
            ok = $true
            status_code = [int] $response.StatusCode
        }
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int] $_.Exception.Response.StatusCode
        }
        return [pscustomobject]@{
            ok = $false
            status_code = $statusCode
            error = $_.Exception.Message
        }
    }
}

if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Falta el manifest: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$output.manifest = [pscustomobject]@{
    path = $manifestPath
    entries = $manifest.entries.Count
}

if (-not (Test-Path -LiteralPath $dashboardRealityPath)) {
    throw "Falta el manifest de realidad del dashboard: $dashboardRealityPath"
}

$dashboardReality = Get-Content -LiteralPath $dashboardRealityPath -Raw | ConvertFrom-Json
$output.dashboard_reality = [pscustomobject]@{
    path = $dashboardRealityPath
    surfaces = $dashboardReality.surfaces.Count
    repo_modules = $dashboardReality.repoModules.Count
    docs = $dashboardReality.documentation.Count
}

if (-not (Test-Path -LiteralPath $cockpitPath)) {
    throw "Falta el cockpit del escritorio: $cockpitPath"
}

$cockpitHtml = Get-Content -LiteralPath $cockpitPath -Raw
$hrefPattern = '<a\b[^>]*\bhref="([^"]+)"'
$cockpitMatches = [regex]::Matches($cockpitHtml, $hrefPattern) | ForEach-Object { $_.Groups[1].Value }
$output.cockpit = [pscustomobject]@{
    path = $cockpitPath
    href_count = @($cockpitMatches).Count
}

$repoLauncherHtmlContent = Get-Content -LiteralPath $repoLauncherHtml -Raw
$repoLauncherMatches = [regex]::Matches($repoLauncherHtmlContent, $hrefPattern) | ForEach-Object { $_.Groups[1].Value }
$output.repo_launcher_html = [pscustomobject]@{
    path = $repoLauncherHtml
    href_count = @($repoLauncherMatches).Count
}

$rootDashboardHtml = Get-Content -LiteralPath $rootDashboardPath -Raw
$rootDashboardMatches = [regex]::Matches($rootDashboardHtml, $hrefPattern) | ForEach-Object { $_.Groups[1].Value }
$rootDashboardStates = [regex]::Matches($rootDashboardHtml, 'class="chip ([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$output.root_dashboard = [pscustomobject]@{
    path = $rootDashboardPath
    href_count = @($rootDashboardMatches).Count
    state_count = @($rootDashboardStates).Count
}

foreach ($entry in $manifest.entries) {
    $resolved = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $openScriptPath -Target $entry.id -ResolveOnly
    $resolvedObj = ($resolved -join "") | ConvertFrom-Json

    $status = "ok"
    $detail = $resolvedObj.ResolvedTarget

    if (-not $resolvedObj -or -not $resolvedObj.ResolvedTarget) {
        Add-Result -Area "launchers" -Name $entry.id -Status "broken" -Detail "ResolveOnly no devolvio un target valido"
        continue
    }

    if ($entry.targetType -in @("file", "folder", "cmd", "script")) {
        if (-not (Test-Path -LiteralPath $resolvedObj.ResolvedTarget)) {
            $status = "broken"
            $detail = "No existe: $($resolvedObj.ResolvedTarget)"
        }
    }

    if ($entry.targetType -eq "url") {
        $http = Test-HttpUrl -Url $resolvedObj.ResolvedTarget
        if ($http.ok) {
            $detail = "$($resolvedObj.ResolvedTarget) [$($http.status_code)]"
        }
        else {
            $status = "warn"
            $detail = "$($resolvedObj.ResolvedTarget) [$($http.status_code)] $($http.error)"
        }
    }

    Add-Result -Area "launchers" -Name $entry.id -Status $status -Detail $detail
}

$assetPaths = @(
    (Join-Path $DesktopRoot "06_Assets\folder.svg"),
    (Join-Path $DesktopRoot "06_Assets\launch.svg"),
    (Join-Path $DesktopRoot "06_Assets\report.svg")
)

foreach ($assetPath in $assetPaths) {
    $assetStatus = if (Test-Path -LiteralPath $assetPath) { "ok" } else { "broken" }
    Add-Result -Area "assets" -Name ([System.IO.Path]::GetFileName($assetPath)) -Status $assetStatus -Detail $assetPath
}

foreach ($href in $rootDashboardMatches) {
    if ($href -eq "#") {
        Add-Result -Area "routes" -Name "root-dashboard:$href" -Status "broken" -Detail "href muerto en dashboard raiz"
        continue
    }

    if ($href -like "#*") {
        Add-Result -Area "routes" -Name "root-dashboard:$href" -Status "ok" -Detail "ancla interna"
        continue
    }

    if ($href -like "http*") {
        $http = Test-HttpUrl -Url $href
        $status = if ($http.ok) { "ok" } elseif ($http.status_code) { "warn" } else { "warn" }
        $detail = if ($http.ok) { "HTTP $($http.status_code)" } else { "$($href) [$($http.status_code)] $($http.error)" }
        Add-Result -Area "routes" -Name "root-dashboard:$href" -Status $status -Detail $detail
        continue
    }

    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $rootDashboardPath) $href))
    Add-Result -Area "routes" -Name "root-dashboard:$href" -Status ($(if (Test-Path -LiteralPath $absolutePath) { "ok" } else { "broken" })) -Detail $absolutePath
}

foreach ($href in $cockpitMatches) {
    if ($href -eq "#") {
        Add-Result -Area "routes" -Name "cockpit:$href" -Status "broken" -Detail "href muerto en cockpit"
        continue
    }

    if ($href -like "file://*") {
        $localPath = [System.Uri]$href
        $exists = Test-Path -LiteralPath $localPath.LocalPath
        Add-Result -Area "routes" -Name "cockpit:$href" -Status ($(if ($exists) { "ok" } else { "broken" })) -Detail $localPath.LocalPath
        continue
    }

    if ($href -like "http*") {
        $http = Test-HttpUrl -Url $href
        Add-Result -Area "routes" -Name "cockpit:$href" -Status ($(if ($http.ok) { "ok" } else { "warn" })) -Detail ($(if ($http.ok) { "HTTP $($http.status_code)" } else { $http.error }))
    }
}

foreach ($href in $repoLauncherMatches) {
    if ($href -eq "#") {
        Add-Result -Area "routes" -Name "repo-launcher:$href" -Status "broken" -Detail "href muerto en html del repo"
        continue
    }

    if ($href -like "http*") {
        $http = Test-HttpUrl -Url $href
        Add-Result -Area "routes" -Name "repo-launcher:$href" -Status ($(if ($http.ok) { "ok" } else { "warn" })) -Detail ($(if ($http.ok) { "HTTP $($http.status_code)" } else { $http.error }))
        continue
    }

    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $repoLauncherHtml) $href))
    Add-Result -Area "routes" -Name "repo-launcher:$href" -Status ($(if (Test-Path -LiteralPath $absolutePath) { "ok" } else { "broken" })) -Detail $absolutePath
}

$forbiddenHits = @()
foreach ($forbiddenTarget in $dashboardReality.forbiddenTargets) {
    if ($rootDashboardHtml -match [regex]::Escape($forbiddenTarget)) {
        $forbiddenHits += $forbiddenTarget
    }
}

$stateViolations = @($rootDashboardStates | Where-Object { $_ -notin $dashboardReality.allowedStates })

$consistencyChecks = @(
    @{
        name = "mockup-dashboard-url"
        expected = "http://127.0.0.1:8090/index.html"
        source = $cockpitHtml -match [regex]::Escape("http://127.0.0.1:8090/index.html")
    },
    @{
        name = "gateway-health-url"
        expected = "http://127.0.0.1:3100/health"
        source = $cockpitHtml -match [regex]::Escape("http://127.0.0.1:3100/health")
    },
    @{
        name = "docs-local-development"
        expected = "docs/local-development.md"
        source = $repoLauncherHtmlContent -match [regex]::Escape("docs/desktop-hub-operations.md")
    },
    @{
        name = "desktop-entrypoints-doc"
        expected = "START_HERE.md"
        source = (Get-Content -LiteralPath (Join-Path $DesktopRoot "DESKTOP_ENTRYPOINTS.md") -Raw) -match [regex]::Escape("START_HERE.md")
    },
    @{
        name = "root-dashboard-no-dead-hash-links"
        expected = "sin href=#"
        source = -not ($rootDashboardMatches -contains "#")
    },
    @{
        name = "root-dashboard-forbidden-targets"
        expected = "sin puertos legacy como entrada oficial"
        source = $forbiddenHits.Count -eq 0
    },
    @{
        name = "root-dashboard-allowed-states"
        expected = ($dashboardReality.allowedStates -join ", ")
        source = $stateViolations.Count -eq 0
    },
    @{
        name = "root-dashboard-has-system-status"
        expected = "SYSTEM_STATUS.md"
        source = $rootDashboardHtml -match [regex]::Escape("../SYSTEM_STATUS.md")
    },
    @{
        name = "root-dashboard-has-manifest"
        expected = "config/runtime/dashboard-reality.json"
        source = $rootDashboardHtml -match [regex]::Escape("../config/runtime/dashboard-reality.json")
    }
)

foreach ($check in $consistencyChecks) {
    Add-Result -Area "consistency" -Name $check.name -Status ($(if ($check.source) { "ok" } else { "broken" })) -Detail $check.expected
}

$output.commands = @(
    ".\scripts\Sync-DesktopHub.ps1",
    ".\scripts\start-icicso-mockup.ps1",
    ".\scripts\Invoke-ContinuumDoctor.ps1",
    "C:\Users\leona\OneDrive\Desktop\ICICSO Local\START_HERE.cmd"
)

$output | ConvertTo-Json -Depth 8
