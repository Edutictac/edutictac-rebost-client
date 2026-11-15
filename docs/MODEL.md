# Modelo de recurso del Rebost

Un recurso es una **imagen** o un **sonido**. El servidor los distingue por `type`:

| `kind` (cliente) | `type` del servidor | Contenido | Límite |
|---|---|---|---|
| `image` | `sprite`, `background`, `object`, `illustration` | PNG normalizado | 5 MiB |
| `sound` | `sound` | OGG, MP3 o WAV | 2 MiB |

`kindOf(item)` devuelve el `kind`. No se añade ningún campo al servidor: cambiar los metadatos de los
catálogos cambiaría sus revisiones (se calculan sobre los metadatos canónicos) y rompería los créditos ya guardados.

Campos comunes de los metadatos: `id` (`img-` + 64 hex), `name`, `type`, `revision`, `collection`
(`mine`, `catalog`, `scratch`, `effects`), `credit`, `license`, `provenance`. Las imágenes añaden `width`, `height`.

## Descargar un recurso
`fetchResource(client, id, {kinds, types, locale})` lee metadatos, contenido y créditos de la misma revisión
(`conflict` si cambia mientras tanto) y devuelve `{kind, item, name, blob, credit}`. Las imágenes pasan por
`fetchSelection` (firma PNG, fuente y licencia); los sonidos se validan por firma (`sniffSound`).

## Guardar
`client.add(blob, {name, type, credit, license})`: `type: 'sound'` aplica el límite de 2 MiB (`sound_limit`).
