# Contrato del selector del Rebost (v1)

El selector es la página `/assets/` de Commons. Las aplicaciones la incrustan en un `<iframe>` del **mismo origen** (proxy) y reciben la elección por `postMessage`.

## Parámetros de la URL
| Parámetro | Valores | Notas |
|---|---|---|
| `mode` | `pick` | obligatorio; solo funciona dentro de un iframe |
| `request` | cadena aleatoria | la devuelve el selector en cada mensaje; usar `newRequestId()` |
| `type` | `sprite` (por defecto), `background` | filtra los tipos que se pueden elegir |
| `lang` | `es`, `ca`, `va`, `en` | idioma de la interfaz |
| `collection` | `mine`, `catalog`, `scratch` | pestaña inicial |
| `supports_families` + `selection` | `1` + `sprite` | permite elegir un personaje con todas sus poses |

Construir con `pickerUrl({type, request, lang, collection, families})`.

## Mensaje del selector → aplicación (`window.parent.postMessage(msg, location.origin)`)
```json
{"format": "rebost-selection", "version": 1, "request": "…", "id": "img-<64 hex>", "name": "texto opcional"}
{"format": "rebost-selection", "version": 1, "request": "…", "id": "img-…", "family": true, "familyRevision": 3}
{"format": "rebost-selection", "version": 1, "request": "…", "cancel": true}
```
El receptor debe comprobar con `parseSelection(event, {source: iframe.contentWindow, request})`: mismo origen, misma ventana, `request` coincidente, formato y versión, id con el patrón exacto. `name` es solo informativo: **nunca** fiarse del nombre del mensaje; leer los metadatos con `RebostClient.item(id)`.

## Evolución
Cambios compatibles (campos opcionales nuevos) mantienen `version: 1`. Un cambio incompatible sube `version` y el receptor debe ignorar versiones desconocidas (`parseSelection` devuelve `null`). La imagen se descarga siempre con `fetchSelection`, no desde el mensaje.
