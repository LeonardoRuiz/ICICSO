# Backup Restore Runbook

## Prerrequisitos

- Python disponible en PATH.
- Docker Desktop abierto.
- Kubernetes activo si se va a operar sobre `icicso-postgres` en K8s.
- Backup objetivo accesible en disco local.

## Backup manual de Postgres

PowerShell:

```powershell
.\scripts\backup-postgres.ps1
```

Shell:

```bash
./scripts/backup-postgres.sh
```

## Backup documental

PowerShell:

```powershell
.\scripts\backup-documents.ps1
```

## Backup completo

```powershell
.\scripts\backup-full-local.ps1
```

Salida esperada:

- directorio bajo `backups/local/full/<timestamp>/`
- dump SQL de Postgres
- zip de `.data/`
- inventario con checksums

## Restore parcial de Postgres

```powershell
.\scripts\restore-postgres.ps1 -InputPath .\backups\local\postgres\<timestamp>\postgres.sql -Force
```

## Restore documental

```powershell
.\scripts\restore-documents.ps1 -InputPath .\backups\local\documents\<timestamp>\documents.zip -Force
```

## Restore completo

```powershell
.\scripts\restore-full-local.ps1 -InputPath .\backups\local\full\<timestamp> -Force
```

## Validación post-incidente

1. Ejecutar `.\scripts\storage-status.ps1`
2. Verificar que `.data/` tenga archivos JSON esperados
3. Verificar conectividad Postgres
4. Levantar stack y correr smoke tests existentes
