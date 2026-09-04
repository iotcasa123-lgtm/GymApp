const CACHE = 'gym-v1';
const ASSETS = ['/index.html', '/manifest.json'];

// ── Supabase ping ──────────────────────────────────────────────────
const SB_URL = 'https://gftxuxutcbwbqxeswdsf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHh1eHV0Y2J3YnF4ZXN3ZHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDk5NzgsImV4cCI6MjEwNDEyNTk3OH0.8Zz9K-uRm0Bsfc7vgEZ4Bs3kc8_acxFE0N2tVuvM0oc'; //
const PING_INTERVAL_MS = 5 * 24 * 60 * 60 * 1000;
const PING_KEY = 'gym_last_ping';
// ──────────────────────────────────────────────────────────────────

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    pingIfNeeded()
  ]));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('jsdelivr')) return;
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'gym-ping') e.waitUntil(pingSupabase());
});

async function pingIfNeeded() {
  try {
    const db = await openDB();
    const last = await dbGet(db, PING_KEY);
    if (!last || (Date.now() - parseInt(last)) > PING_INTERVAL_MS) {
      await pingSupabase();
      await dbSet(db, PING_KEY, String(Date.now()));
    }
  } catch {}
}

async function pingSupabase() {
  try {
    await fetch(`${SB_URL}/rest/v1/users?select=id&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
  } catch {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gym-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}
function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv').objectStore('kv').get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}
function dbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}
