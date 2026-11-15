# @edutictac/rebost-client

Cliente único del Rebost de EduTicTac (API `/api/assets/v1` de Commons). Sin framework ni dependencias.
Sustituye a los clientes duplicados de Commons (`client.js`), Blocs (`rebost.js`), Llibres (`rebost.js`) y EduCrea (`rebost.ts`, `rebostHub.ts`).

```js
import {RebostClient, fetchSelection} from '@edutictac/rebost-client';
import {newRequestId, pickerUrl, parseSelection} from '@edutictac/rebost-client/selection';

const rebost = new RebostClient();                       // mismo origen
const crea = new RebostClient({endpoint: 'https://commons.edutictac.es/api/assets/v1',
                               allowedOrigins: ['https://commons.edutictac.es']}); // otro origen: cookies + CORS
const {items} = await rebost.list({collection: 'catalog', type: 'sprite', q: 'gat'});
const {blob, credit, name} = await fetchSelection(rebost, items[0].id, {types: ['sprite'], locale: 'va'});
```

Selector en iframe: `pickerUrl({type, request: newRequestId()})` y validar cada mensaje con `parseSelection(event, {source: iframe.contentWindow, request})`.

Errores: `RebostError.code` ∈ `session | not_found | conflict | too_large | invalid | network | operation_failed`.

Contrato del selector: `docs/CONTRACT.md`. Modelo imagen/sonido: `docs/MODEL.md`.

Pruebas: `npm test` (Node 20+). Contrato del mensaje y de la API: ver `docs/rebost.md` en Commons.

## Estado
v0.1.0. Repos: git.edutictac.es/Edutictac/edutictac-rebost-client (principal) y github.com/Edutictac/edutictac-rebost-client (espejo). Usado por Llibres, Blocs y EduCrea como copia vendida (`scripts/sync-rebost-client.sh`); Commons pendiente.
