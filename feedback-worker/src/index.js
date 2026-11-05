// Feedback for Ages of Dust. Anyone can send a note; only the owner, holding OWNER_KEY (a Worker secret), can read or delete them.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const KINDS = ['bug', 'idea', 'balance', 'praise', 'other', 'crash'];
const PER_HOUR = 8;
const str = (v, n) => (typeof v === 'string' ? v : '').replace(/\u0000/g, '').trim().slice(0, n);

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}
function isOwner(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!env.OWNER_KEY || !h.startsWith('Bearer ')) return false;
  const a = new TextEncoder().encode(h.slice(7).trim()), b = new TextEncoder().encode(env.OWNER_KEY.trim());
  return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
}

async function send(req, env) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Not JSON' }, 400); }
  const text = str(body.text, 4000);
  if (text.length < 3) return json({ error: 'Write a little more first.' }, 400);
  if (str(body.website, 10)) return json({ ok: true });  // a field people never see: only bots fill it
  // the address is only ever kept hashed, and only for an hour, to stop floods
  const who = await hash((req.headers.get('CF-Connecting-IP') || '') + (env.OWNER_KEY || ''));
  const rk = 'rl:' + who, used = +(await env.FEEDBACK.get(rk)) || 0;
  if (used >= PER_HOUR) return json({ error: 'That is a lot of feedback for one hour. Try again later.' }, 429);
  await env.FEEDBACK.put(rk, String(used + 1), { expirationTtl: 3600 });
  let meta = '';
  try { meta = JSON.stringify(body.meta || {}).slice(0, 600); } catch { meta = ''; }
  const at = Date.now();
  // newest first in key order
  const id = String(9999999999999 - at).padStart(13, '0') + '-' + crypto.randomUUID().slice(0, 8);
  const item = { id, at, kind: KINDS.includes(body.kind) ? body.kind : 'other', text, name: str(body.name, 60), contact: str(body.contact, 120), meta, ua: str(req.headers.get('User-Agent'), 160) };
  await env.FEEDBACK.put('fb:' + id, JSON.stringify(item));
  return json({ ok: true });
}

async function list(req, env, url) {
  if (!isOwner(req, env)) return json({ error: 'Only the owner can read feedback.' }, 401);
  const cursor = url.searchParams.get('cursor') || undefined;
  const page = await env.FEEDBACK.list({ prefix: 'fb:', limit: 100, cursor });
  const items = (await Promise.all(page.keys.map(k => env.FEEDBACK.get(k.name, 'json')))).filter(Boolean);
  return json({ items, cursor: page.list_complete ? null : page.cursor });
}

async function remove(req, env, id) {
  if (!isOwner(req, env)) return json({ error: 'Only the owner can delete feedback.' }, 401);
  if (!/^[0-9a-f-]{10,40}$/.test(id)) return json({ error: 'Bad id' }, 400);
  await env.FEEDBACK.delete('fb:' + id);
  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/feedback' && req.method === 'POST') return send(req, env);
    if (url.pathname === '/feedback' && req.method === 'GET') return list(req, env, url);
    if (url.pathname.startsWith('/feedback/') && req.method === 'DELETE') return remove(req, env, url.pathname.slice(10));
    return json({ error: 'Not found' }, 404);
  },
};
