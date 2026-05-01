# Security Groups Plan

## Públicos

- ALB permite `80` y luego `443`

## Privados

- nodos EKS aceptan tráfico solo desde ALB y control plane según necesidad
- postgres y redis nunca expuestos por SG público

## Principio

Minimizar superficie pública. Solo frontend y API deben ser accesibles desde internet en staging.
