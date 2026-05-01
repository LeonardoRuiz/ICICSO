# Frontend Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | modo de ejecución del servidor estático | sí | no | `development` | no | local/dev/staging/prod | comportamiento inconsistente | enum |
| `FRONTEND_HOST` | host de bind | sí | sí | `0.0.0.0` | no | local/dev/staging/prod | no levanta el servidor | string no vacío |
| `FRONTEND_PORT` | puerto de bind | sí | sí | `8080` | no | local/dev/staging/prod | no expone frontend | puerto |
| `GATEWAY_API_URL` | URL base del gateway | sí | sí | `http://127.0.0.1:3100` | no | local/dev/staging/prod | frontend no conversa con API | URL http(s) |
| `INGRESS_HOST` | host esperado en K8s local | sí | sí | `icicso.localtest.me` | no | local/dev/staging/prod | links/ingress inconsistentes | hostname |
| `BUILD_ID` | identificador de build | no | sí | `local-dev` | no | local/dev/staging/prod | menor trazabilidad | string |
