#!/usr/bin/env pwsh
#
# Script de validación y reparación del runtime local ICICSO
# Fase 2: Reparación del runtime local
#
# Uso: .\scripts\phase2-repair-runtime.ps1
#

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-Status {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

function Write-Info {
    param([string]$Message)
    if ($Verbose) {
        Write-Host "ℹ $Message" -ForegroundColor Cyan
    }
}

Write-Host "ICICSO Phase 2: Runtime Repair" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Validate workspace structure
Write-Info "Step 1: Validating workspace structure..."

$requiredPaths = @(
    "icicso-local/packages/canonical-types/src/index.ts",
    "icicso-local/packages/contracts/src/block1.ts",
    "icicso-local/packages/database/src/block1-store.ts",
    "icicso-local/apps/audit-service/src/index.ts",
    "icicso-local/tsconfig.base.json"
)

foreach ($path in $requiredPaths) {
    $fullPath = Join-Path $projectRoot $path
    if (-not (Test-Path $fullPath)) {
        Write-Error-Custom "Missing required file: $path"
    }
    Write-Info "✓ Found: $path"
}

Write-Status "Workspace structure validated"
Write-Host ""

# Step 2: Verify tsconfig path aliases
Write-Info "Step 2: Checking TypeScript path aliases..."

$tsconfigPath = Join-Path $projectRoot "icicso-local/tsconfig.base.json"
$tsconfigContent = Get-Content $tsconfigPath -Raw
if ($tsconfigContent -match '"paths"') {
    Write-Status "TypeScript path aliases configured"
} else {
    Write-Error-Custom "Path aliases not configured in tsconfig.base.json"
}

Write-Host ""

# Step 3: Verify audit event types alignment
Write-Info "Step 3: Checking audit event types alignment..."

$canonicalTypesPath = Join-Path $projectRoot "icicso-local/packages/canonical-types/src/index.ts"
$canonicalTypesContent = Get-Content $canonicalTypesPath -Raw

$contractsPath = Join-Path $projectRoot "icicso-local/packages/contracts/src/block1.ts"
$contractsContent = Get-Content $contractsPath -Raw

# Check if contracts imports from canonical-types
if ($contractsContent -match "from\s+['\"]@icicso/canonical-types['\"]") {
    Write-Status "contracts properly imports from canonical-types"
} else {
    Write-Error-Custom "contracts does not import from canonical-types. Manual fix required."
}

# Verify types in canonical-types include all required event types
$requiredEventTypes = @(
    "login",
    "login_failed",
    "logout",
    "create_case",
    "read_case",
    "document.ingested",
    "access_denied",
    "access_granted_sensitive",
    "privileged_action",
    "permission_changed",
    "role_changed",
    "backup_executed",
    "restore_executed",
    "config_changed"
)

$missingTypes = @()
foreach ($eventType in $requiredEventTypes) {
    if ($canonicalTypesContent -notmatch "`"$eventType`"") {
        $missingTypes += $eventType
    }
}

if ($missingTypes.Count -eq 0) {
    Write-Status "All required audit event types present in canonical-types"
} else {
    Write-Error-Custom "Missing audit event types: $($missingTypes -join ', ')"
}

Write-Host ""

# Step 4: Validate package.json dependencies
Write-Info "Step 4: Validating package.json dependencies..."

$auditServicePackagePath = Join-Path $projectRoot "icicso-local/apps/audit-service/package.json"
$auditServicePackageContent = Get-Content $auditServicePackagePath -Raw

$requiredDeps = @(
    "@icicso/config",
    "@icicso/contracts",
    "@icicso/database",
    "@icicso/logger"
)

foreach ($dep in $requiredDeps) {
    if ($auditServicePackageContent -match "`"$dep`"") {
        Write-Info "✓ Dependency found: $dep"
    } else {
        Write-Error-Custom "Missing dependency in audit-service: $dep"
    }
}

Write-Status "All required dependencies present"
Write-Host ""

# Step 5: Summary
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Status "✓ Workspace structure is correct"
Write-Status "✓ TypeScript path aliases configured"
Write-Status "✓ Audit event types aligned"
Write-Status "✓ Package dependencies correct"

Write-Host ""
Write-Host "Runtime repair validation PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install dependencies: pnpm install"
Write-Host "2. Build packages: pnpm build"
Write-Host "3. Start runtime: .\scripts\start-icicso-mockup.ps1"
Write-Host "4. Verify health: .\scripts\Invoke-ContinuumDoctor.ps1"
