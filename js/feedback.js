'use strict';
// Feedback: anyone can send a note to the game's owner. Only the owner, with the key the server knows, can read them.
const FB_URL = 'https://civ-sim-feedback.bringleyw.workers.dev/feedback';
const FB_KINDS = [['bug', 'Something is broken'], ['idea', 'An idea'], ['balance', 'Balance or realism'], ['praise', 'Something I liked'], ['other', 'Something else']];
const fbEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fbKey = { get() { try { return localStorage.getItem('aod.fbKey') || ''; } catch { return ''; } }, set(v) { try { v ? localStorage.setItem('aod.fbKey', v) : localStorage.removeItem('aod.fbKey'); } catch { } } };

function fbWorld() {
  try {
    if (typeof W === 'undefined' || !W || !W.towns) return {};
    return { year: Math.floor(year()), era: ERAS[W.eraNow], people: W.people.length + (W.folkN || 0), towns: W.towns.length, realms: W.polities.filter(p => p.alive).length, size: W.w + 'x' + W.h, seed: W.seed, speed: Game.speed, tick: W.tick };
  } catch { return {}; }
}
// ---- crash reports: sent on their own, each different crash once, at most a few per session ----
const fbCrashSeen = new Set();
function reportCrash(err, where) {
  const msg = String((err && err.message) || err || 'unknown error').slice(0, 300), stack = String((err && err.stack) || '').slice(0, 2600);
  const sig = msg + '|' + (stack.split('\n')[1] || '');
  if (fbCrashSeen.has(sig) || fbCrashSeen.size >= 5) return;
  fbCrashSeen.add(sig);
  let recent = '';
  try { recent = W && W.log ? W.log.slice(-6).map(e => `${e.yr} ${e.kind}: ${e.text}`).join('\n').slice(0, 700) : ''; } catch { }
  const text = `Crash ${where}: ${msg}\n\n${stack}${recent ? '\n\nLast chronicle lines:\n' + recent : ''}`;
  try {
    fetch(FB_URL, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'crash', text, meta: Object.assign(fbWorld(), { ua: navigator.userAgent.slice(0, 120) }) }) }).catch(() => { });
  } catch { }
}
window.addEventListener('error', e => reportCrash(e.error || e.message, 'on the page'));
window.addEventListener('unhandledrejection', e => reportCrash(e.reason, 'in a background task'));
function openFeedback() {
  const m = $('fbModal');
  m.hidden = false;
  $('fbSendBox').hidden = false; $('fbOwnerBox').hidden = true;
  $('fbMsg').textContent = '';
  setTimeout(() => $('fbText').focus(), 0);
}
async function sendFeedback() {
  const text = $('fbText').value.trim(), msg = $('fbMsg'), btn = $('fbSend');
  if (text.length < 3) { msg.textContent = 'Write a little more first.'; return; }
  btn.disabled = true; msg.textContent = 'Sending…';
  try {
    const r = await fetch(FB_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: $('fbKind').value, text, name: $('fbName').value, contact: $('fbContact').value, website: $('fbHp').value, meta: $('fbMeta').checked ? fbWorld() : {} }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'The server said no (' + r.status + ').');
    $('fbText').value = '';
    msg.textContent = 'Sent. Thank you!';
  } catch (e) {
    msg.textContent = (e && e.message && !/fetch/i.test(e.message) ? e.message : 'Couldn’t reach the feedback server. Check your connection and try again.');
  } finally { btn.disabled = false; }
}
// ---- the owner's view ----
function openOwner() {
  $('fbSendBox').hidden = true; $('fbOwnerBox').hidden = false;
  $('fbKey').value = fbKey.get();
  if (fbKey.get()) loadFeedback(false); else { $('fbList').innerHTML = ''; $('fbOwnerMsg').textContent = 'Enter your owner key to read what people have sent.'; }
}
let fbCursor = null;
async function loadFeedback(more) {
  const key = $('fbKey').value.trim(), msg = $('fbOwnerMsg'), list = $('fbList');
  if (!key) { msg.textContent = 'Enter your owner key first.'; return; }
  if (!more) { fbCursor = null; list.innerHTML = ''; }
  msg.textContent = 'Loading…';
  try {
    const r = await fetch(FB_URL + (more && fbCursor ? '?cursor=' + encodeURIComponent(fbCursor) : ''), { headers: { Authorization: 'Bearer ' + key } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { fbKey.set(''); msg.textContent = 'That key isn’t the owner’s.'; return; }
    if (!r.ok) throw new Error(j.error || 'The server said no (' + r.status + ').');
    fbKey.set(key);
    fbCursor = j.cursor;
    list.insertAdjacentHTML('beforeend', j.items.map(fbItemHTML).join(''));
    const n = list.children.length;
    msg.textContent = n ? `${n} note${n > 1 ? 's' : ''}${fbCursor ? ', more below' : ''}.` : 'Nobody has sent anything yet.';
    $('fbMore').hidden = !fbCursor;
  } catch (e) { msg.textContent = e && e.message && !/fetch/i.test(e.message) ? e.message : 'Couldn’t reach the feedback server.'; }
}
function fbItemHTML(f) {
  const kind = f.kind === 'crash' ? 'Crash report' : (FB_KINDS.find(k => k[0] === f.kind) || FB_KINDS[4])[1];
  let meta = '';
  try { const m = JSON.parse(f.meta || '{}'); meta = Object.keys(m).length ? `Year ${m.year}, ${m.era || ''}, ${m.people} people, ${m.realms} realms, world ${m.size}${m.seed !== undefined ? ', seed ' + m.seed : ''}` : ''; } catch { }
  return `<div class="fbItem" data-id="${fbEsc(f.id)}"><div class="fbHead"><b>${fbEsc(kind)}</b><span>${fbEsc(new Date(f.at).toLocaleString())}</span>${f.name ? `<span>from ${fbEsc(f.name)}</span>` : ''}<button class="fbDel" title="Delete this note">Delete</button></div>`
    + `<div class="fbText">${fbEsc(f.text)}</div>${f.contact ? `<div class="fbSub">Reply to: ${fbEsc(f.contact)}</div>` : ''}${meta ? `<div class="fbSub">${fbEsc(meta)}</div>` : ''}</div>`;
}
async function deleteFeedback(el) {
  if (!confirm('Delete this note for good?')) return;
  const r = await fetch(FB_URL + '/' + encodeURIComponent(el.dataset.id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + $('fbKey').value.trim() } }).catch(() => null);
  if (r && r.ok) el.remove(); else $('fbOwnerMsg').textContent = 'Couldn’t delete that one.';
}
function initFeedback() {
  $('fbKind').innerHTML = FB_KINDS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  for (const id of ['bFeedback', 'oFeedback']) if ($(id)) $(id).onclick = openFeedback;
  $('fbSend').onclick = sendFeedback;
  $('fbOwner').onclick = openOwner;
  $('fbBack').onclick = () => { $('fbSendBox').hidden = false; $('fbOwnerBox').hidden = true; };
  $('fbLoad').onclick = () => loadFeedback(false);
  $('fbMore').onclick = () => loadFeedback(true);
  $('fbForget').onclick = () => { fbKey.set(''); $('fbKey').value = ''; $('fbList').innerHTML = ''; $('fbOwnerMsg').textContent = 'Key forgotten on this computer.'; };
  $('fbKey').addEventListener('keydown', e => { if (e.key === 'Enter') loadFeedback(false); });
  $('fbList').addEventListener('click', e => { const b = e.target.closest('.fbDel'); if (b) deleteFeedback(b.closest('.fbItem')); });
}
initFeedback();
