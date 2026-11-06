import { API_BASE } from '../admin/config.js';
import { mergeCollection } from './indices-vivos.js';

const dataRoot = new URL('./datos/', import.meta.url);
const endpoint = API_BASE.replace(/\/+$/, '') + '/api/public';
let inflight;
let signature;
let checkedAt = 0;
let checking = false;

function stateSignature(changes) {
  if (!Array.isArray(changes)) throw new Error('No se pudo confirmar la colección publicada.');
  return JSON.stringify(changes.map(row => [row.id, row.version, row.active]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
}

function publicationStatus() {
  return json(endpoint, { cache: 'no-store', credentials: 'omit' });
}

async function json(url, options = {}) {
  const signal = AbortSignal.timeout(12000);
  const response = await fetch(url, { ...options, signal });
  if (!response.ok) throw new Error('No se pudo confirmar la exposición actual.');
  return response.json();
}

async function load() {
  const [catalog, locations, producers, geography, publication] = await Promise.all([
    ...['catalogo','lugares','productores','regiones'].map(name => json(new URL(name+'.json',dataRoot))),
    publicationStatus()
  ]);
  const merged = mergeCollection({ catalog, locations, producers, geography, changes: publication.changes });
  signature = stateSignature(publication.changes);
  checkedAt = Date.now();
  return merged;
}

export function loadPublicCollection() {
  if (!inflight) inflight = load().catch(error => {
    inflight = null;
    throw error;
  });
  return inflight;
}

addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});

async function revalidate() {
  if (checking || document.hidden || Date.now() - checkedAt < 5000) return;
  checking = true;
  checkedAt = Date.now();
  try {
    const publication = await publicationStatus();
    if (stateSignature(publication.changes) !== signature) location.reload();
  } catch {
    if (signature !== undefined) location.reload();
  } finally {
    checking = false;
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void revalidate(); });
setInterval(revalidate, 60000);
