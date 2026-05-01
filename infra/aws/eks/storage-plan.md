# Storage Plan

## Decisión de esta fase

- PostgreSQL: dentro del clúster
- Redis: dentro del clúster
- PVCs sobre EBS `gp3`

## Por qué

- reduce tiempo de llegada a staging
- reaprovecha manifiestos ya existentes
- evita introducir RDS/ElastiCache demasiado pronto

## Riesgos

- backups y restore siguen siendo responsabilidad operativa del equipo
- disponibilidad inferior a un servicio administrado
- upgrades más delicados

## Recomendación siguiente

- mover PostgreSQL a RDS antes de producción
- evaluar si Redis amerita ElastiCache o si puede seguir efímero
