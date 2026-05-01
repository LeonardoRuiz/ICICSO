# Nodegroup Plan

## Recomendación

- managed node group único
- instancia pequeña de propósito general
- capacidad mínima 2 nodos

## Perfil

- nodos privados
- salida a internet vía NAT o endpoints necesarios
- tolerancias simples, sin especialización por workload

## Justificación

Un node group basta para staging porque el objetivo es validar despliegue, ingreso, rollout y smoke tests, no tolerancia total a fallos.
