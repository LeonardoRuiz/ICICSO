# Dashboards Guide

Estado del documento:

- deprecado como inventario confiable de dashboards;
- los nombres de paneles previos no fueron revalidados como parte de la remediación.

Ruta operativa real hoy:

1. ejecutar `.\scripts\Invoke-ContinuumDoctor.ps1`
2. revisar `http://127.0.0.1:3100/health` si el gateway está vivo
3. revisar logs en `logs\mockup\` cuando el mockup local haya arrancado

Hasta no revalidar observabilidad end-to-end, no tratar este documento como fuente de verdad de Grafana o Prometheus.
