import test from 'node:test';
import assert from 'node:assert/strict';
import {RebostClient, RebostError, fetchSelection} from '../src/index.js';
import {parseSelection} from '../src/selection.js';

const ID = 'img-' + 'a'.repeat(64);
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
globalThis.location = new URL('https://commons.test/assets/');

function fake(routes) {
  return async (url, opts) => {
    const path = new URL(url, 'https://commons.test').pathname.replace('/api/assets/v1', '');
    const r = routes[path];
    if (!r) return new Response('{"detail":"nf"}', {status: 404});
    return typeof r === 'function' ? r(opts) : r;
  };
}
const json = o => new Response(JSON.stringify(o), {headers: {'content-type': 'application/json'}});

test('rechaza otros orígenes salvo permitidos', () => {
  assert.throws(() => new RebostClient({endpoint: 'https://x.test/api/assets/v1'}), /same_origin_required/);
  const c = new RebostClient({endpoint: 'https://crea.test/api/assets/v1', allowedOrigins: ['https://crea.test']});
  assert.equal(c.credentials, 'include');
});

test('IDs inválidos y errores tipados', async () => {
  const c = new RebostClient({fetch: fake({})});
  await assert.rejects(c.item('../x'), e => e.code === 'invalid_id');
  await assert.rejects(c.item(ID), e => e instanceof RebostError && e.code === 'not_found' && e.status === 404);
});

test('fetchSelection devuelve blob y crédito coherentes', async () => {
  const item = {id: ID, name: 'Gat', names: {ca: 'Gat', es: 'Gato'}, type: 'sprite', collection: 'catalog', revision: 2,
    source_id: 's', source_revision: '1', source_path: 'p', source_repository: 'r', license: 'CC0', attribution: 'a'};
  const c = new RebostClient({fetch: fake({
    ['/items/' + ID]: () => json(item),
    ['/items/' + ID + '/content']: () => new Response(PNG, {headers: {'content-type': 'image/png'}}),
    ['/items/' + ID + '/source']: () => new Response('src', {headers: {'content-type': 'text/plain'}}),
    ['/items/' + ID + '/license']: () => new Response('lic', {headers: {'content-type': 'text/plain'}}),
  })});
  const r = await fetchSelection(c, ID, {types: ['sprite'], locale: 'es'});
  assert.equal(r.name, 'Gato');
  assert.equal(r.credit.licenseText, 'lic');
  assert.equal(r.credit.license, 'CC0');
  await assert.rejects(fetchSelection(c, ID, {types: ['background']}), e => e.code === 'invalid');
});

test('fetchSelection detecta cambio de revisión', async () => {
  let n = 0;
  const c = new RebostClient({fetch: fake({
    ['/items/' + ID]: () => json({id: ID, name: 'x', type: 'sprite', collection: 'mine', revision: ++n}),
    ['/items/' + ID + '/content']: () => new Response(PNG, {headers: {'content-type': 'image/png'}}),
  })});
  await assert.rejects(fetchSelection(c, ID), e => e.code === 'conflict');
});

test('PNG falso rechazado', async () => {
  const c = new RebostClient({fetch: fake({
    ['/items/' + ID]: () => json({id: ID, type: 'sprite', revision: 1}),
    ['/items/' + ID + '/content']: () => new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), {headers: {'content-type': 'image/png'}}),
  })});
  await assert.rejects(fetchSelection(c, ID), e => e.code === 'invalid');
});

test('parseSelection valida origen, fuente, petición y formato', () => {
  const win = {}, base = {origin: 'https://commons.test', source: win};
  const ok = {format: 'rebost-selection', version: 1, request: 'r1', id: ID};
  const opt = {source: win, request: 'r1'};
  assert.deepEqual(parseSelection({...base, data: ok}, opt), {id: ID, family: false});
  assert.deepEqual(parseSelection({...base, data: {...ok, cancel: true}}, opt), {cancel: true});
  assert.equal(parseSelection({...base, origin: 'https://evil.test', data: ok}, opt), null);
  assert.equal(parseSelection({...base, source: {}, data: ok}, opt), null);
  assert.equal(parseSelection({...base, data: {...ok, request: 'r2'}}, opt), null);
  assert.equal(parseSelection({...base, data: {...ok, family: true}}, opt), null);
  assert.deepEqual(parseSelection({...base, data: {...ok, family: true, familyRevision: 3}}, opt),
    {id: ID, family: true, familyRevision: 3});
});

test('verifyPng:false omite la comprobación de firma', async () => {
  const c = new RebostClient({fetch: fake({
    ['/items/' + ID]: () => json({id: ID, type: 'sprite', revision: 1}),
    ['/items/' + ID + '/content']: () => new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), {headers: {'content-type': 'image/png'}}),
  })});
  assert.equal((await fetchSelection(c, ID, {verifyPng: false})).blob.size, 8);
});
