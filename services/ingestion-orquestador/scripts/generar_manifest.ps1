$ErrorActionPreference = "Stop"

function Get-LayerMetadata {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    switch -Regex ($FileName) {
        '^L0-STR-' {
            return @{
                layer = 'L0'
                category = 'foundation_governance'
                document_group = 'strategic_foundation'
            }
        }
        '^L1-EVD-' {
            return @{
                layer = 'L1'
                category = 'evidence_governance'
                document_group = 'evidence'
            }
        }
        '^L2-ALG-' {
            return @{
                layer = 'L2'
                category = 'translation_engine'
                document_group = 'algorithmic_translation'
            }
        }
        '^L3-UNC-' {
            return @{
                layer = 'L3'
                category = 'epistemic_uncertainty'
                document_group = 'uncertainty'
            }
        }
        '^L4-ORQ-' {
            return @{
                layer = 'L4'
                category = 'operative_orchestration'
                document_group = 'orchestration'
            }
        }
        '^L5-CAS-' {
            return @{
                layer = 'L5'
                category = 'case_runtime'
                document_group = 'case_control'
            }
        }
        '^L6-GOV-' {
            return @{
                layer = 'L6'
                category = 'governance_consensus'
                document_group = 'consensus'
            }
        }
        '^(1|2|3|4|5|6) Output' {
            return @{
                layer = 'OUTPUT'
                category = 'core_output'
                document_group = 'output_artifacts'
            }
        }
        '^(Arquitectura Integral ICICSO|Institutional Cognitive Infrastructure For Clinical And Surgical Orchestration|Arquitectura - Documentos Inputs Outputs|Inputs & Outputs|Listado Documentos Inputs Outputs|Arbol Documental)' {
            return @{
                layer = 'ARCH'
                category = 'architecture_core'
                document_group = 'architecture'
            }
        }
        default {
            return @{
                layer = 'SUPPORT'
                category = 'supplementary'
                document_group = 'supporting_material'
            }
        }
    }
}

function Get-DocumentType {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Extension
    )

    switch ($Extension.ToLowerInvariant()) {
        '.docx' { return 'docx' }
        '.pdf' { return 'pdf' }
        '.xlsx' { return 'spreadsheet' }
        '.m4a' { return 'audio' }
        default { return 'other' }
    }
}

function Get-VersionHint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    $match = [regex]::Match($FileName, '(?i)\bv\d+(?:\.\d+)?\b')
    if ($match.Success) {
        return $match.Value
    }

    return $null
}

function Get-RelativePathCompat {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,

        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $baseUri = New-Object System.Uri(($BasePath.TrimEnd('\') + '\'))
    $targetUri = New-Object System.Uri($TargetPath)
    return [System.Uri]::UnescapeDataString(
        $baseUri.MakeRelativeUri($targetUri).ToString()
    ).Replace('/', '\')
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$catalogRoots = @(
    '01_Arquitectura_Base',
    '02_Capas',
    '03_Outputs',
    '04_Referencias_Externas',
    '05_Catalogos_Listados',
    '06_Trabajo_Colaborativo',
    '99_Archivo_Historico'
)

$manifestDir = Join-Path $projectRoot 'software_orquestador\manifest'
$manifestPath = Join-Path $manifestDir 'icicso_manifest.json'

New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null

$files = foreach ($relativeRoot in $catalogRoots) {
    $absoluteRoot = Join-Path $projectRoot $relativeRoot
    if (Test-Path -LiteralPath $absoluteRoot) {
        Get-ChildItem -Path $absoluteRoot -Recurse -File
    }
}

$files = $files | Sort-Object FullName

$documents = foreach ($file in $files) {
    $meta = Get-LayerMetadata -FileName $file.Name
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName
    $stableDocumentId = 'DOC-' + $hash.Hash.Substring(0, 12).ToUpperInvariant()

    [ordered]@{
        document_id = $stableDocumentId
        file_name = $file.Name
        absolute_path = $file.FullName
        relative_path = Get-RelativePathCompat -BasePath $projectRoot -TargetPath $file.FullName
        extension = $file.Extension
        document_type = Get-DocumentType -Extension $file.Extension
        layer = $meta.layer
        category = $meta.category
        document_group = $meta.document_group
        language = 'und'
        version_detected = Get-VersionHint -FileName $file.Name
        size_bytes = $file.Length
        last_write_time_utc = $file.LastWriteTimeUtc.ToString('o')
        hash_sha256 = $hash.Hash
        ingestion_timestamp_utc = (Get-Date).ToUniversalTime().ToString('o')
        source_status = 'local_source'
        derived_artifacts = @()
    }
}

$manifest = [ordered]@{
    manifest_name = 'ICICSO Local Source Manifest'
    generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    root_path = $projectRoot
    catalog_roots = $catalogRoots
    total_documents = $documents.Count
    documents = @($documents)
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Output "Manifest generated: $manifestPath"
Write-Output "Documents indexed: $($documents.Count)"
