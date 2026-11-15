import test from 'node:test';
import assert from 'node:assert/strict';
import {RebostClient, RebostError, fetchSelection, fetchResource, kindOf, sniffSound, LIMITS} from '../src/index.js';
import {parseSelection, selectionMessage, cancelMessage, pickerUrl} from '../src/selection.js';

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

test('message usa el detalle del servidor y add() informa image_limit', async () => {
  const c = new RebostClient({fetch: async () => new Response('{"detail":"revision_conflict"}', {status: 412})});
  await assert.rejects(c.remove({id: ID, revision: 1}), e => e.code === 'conflict' && e.message === 'revision_conflict');
  const big = {size: 6 * 1024 * 1024, type: 'image/png'};
  await assert.rejects(c.add(big, {name: 'x', type: 'sprite'}), e => e.code === 'too_large' && e.message === 'image_limit');
});

test('update, duplicate y remove envían If-Match y cuerpo esperados', async () => {
  const calls = [];
  const c = new RebostClient({fetch: async (url, o) => { calls.push([o.method, new URL(url, 'https://commons.test').pathname, o.headers, o.body]); return json({id: ID, revision: 4}); }});
  const item = {id: ID, revision: 3};
  await c.update(item, {name: 'Nou', type: 'object'});
  await c.duplicate(item);
  await c.remove(item);
  assert.deepEqual(calls.map(x => x[0]), ['PATCH', 'POST', 'DELETE']);
  assert.ok(calls.every(x => x[2]['If-Match'] === '"3"'));
  assert.equal(calls[0][3], '{"name":"Nou","type":"object"}');
  assert.ok(calls[1][1].endsWith('/copies'));
});

test('los mensajes construidos los acepta parseSelection (emisor y receptor comparten contrato)', () => {
  const win = {}, ev = data => ({origin: 'https://commons.test', source: win, data}), opt = {source: win, request: 'r9'};
  assert.deepEqual(parseSelection(ev(selectionMessage({request: 'r9', id: ID, name: 'Gat'})), opt), {id: ID, family: false});
  assert.deepEqual(parseSelection(ev(selectionMessage({request: 'r9', id: ID, family: {revision: 5}})), opt),
    {id: ID, family: true, familyRevision: 5});
  assert.deepEqual(parseSelection(ev(cancelMessage('r9')), opt), {cancel: true});
  assert.equal(parseSelection(ev(cancelMessage('otra')), opt), null);
});

test('pickerUrl incluye familias y colección', () => {
  const u = new URL(pickerUrl({type: 'sprite', request: 'r', lang: 'va', collection: 'scratch', families: true}), 'https://commons.test');
  assert.equal(u.searchParams.get('supports_families'), '1');
  assert.equal(u.searchParams.get('selection'), 'sprite');
  assert.equal(u.searchParams.get('collection'), 'scratch');
  assert.equal(u.searchParams.get('mode'), 'pick');
});

const OGG = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2, 3, 4, 5, 6, 7, 8]);

test('kindOf y sniffSound', () => {
  assert.equal(kindOf({type: 'sound'}), 'sound');
  assert.equal(kindOf({type: 'sprite'}), 'image');
  assert.equal(sniffSound(OGG), 'audio/ogg');
  assert.equal(sniffSound(new Uint8Array([0x49, 0x44, 0x33, 4])), 'audio/mpeg');
  assert.equal(sniffSound(new TextEncoder().encode('RIFF1234WAVEfmt ')), 'audio/wav');
  assert.equal(sniffSound(new Uint8Array([1, 2, 3, 4])), '');
});

test('fetchResource: sonido válido con crédito, rechazo por firma, tipo y kinds', async () => {
  const meta = {id: ID, name: 'Plof', type: 'sound', collection: 'effects', revision: 3, license: 'CC0', source_id: 'kenney'};
  const routes = {['/items/' + ID]: () => json(meta), ['/items/' + ID + '/content']: () => new Response(OGG, {headers: {'content-type': 'audio/ogg'}})};
  const c = new RebostClient({fetch: fake(routes)});
  const r = await fetchResource(c, ID);
  assert.equal(r.kind, 'sound');
  assert.equal(r.blob.type, 'audio/ogg');
  assert.equal(r.credit.license, 'CC0');
  await assert.rejects(fetchResource(c, ID, {kinds: ['image']}), e => e.code === 'invalid');
  routes['/items/' + ID + '/content'] = () => new Response(new Uint8Array(12), {headers: {'content-type': 'audio/ogg'}});
  await assert.rejects(fetchResource(c, ID), e => e.code === 'invalid');
});

test('fetchResource delega las imágenes en fetchSelection y add() limita sonidos a 2 MiB', async () => {
  const c = new RebostClient({fetch: fake({
    ['/items/' + ID]: () => json({id: ID, type: 'sprite', revision: 1, collection: 'mine'}),
    ['/items/' + ID + '/content']: () => new Response(PNG, {headers: {'content-type': 'image/png'}}),
  })});
  assert.equal((await fetchResource(c, ID)).kind, 'image');
  const big = {size: LIMITS.sound + 1, type: 'audio/ogg'};
  await assert.rejects(c.add(big, {name: 'x', type: 'sound'}), e => e.message === 'sound_limit');
});
