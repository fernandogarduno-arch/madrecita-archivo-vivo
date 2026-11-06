import {photoDirectory} from './medios.js';
import {API_BASE} from '../admin/config.js';
import {studyFor} from './curaduria.js';

export const housePhoto = new URL('../botella/referencia-cava.webp', import.meta.url).href;
export const houseCaption = 'Imagen de referencia · Reserva Retana';

export const newImageLabel = '✳ Nueva imagen';
export function newImageBadge() {
  const badge = document.createElement('span');
  badge.className = 'new-image-badge';
  badge.textContent = newImageLabel;
  badge.hidden = true;
  return badge;
}

// La referencia pertenece a la interfaz, nunca a las fotos documentales de la ficha.
export function showRecordImage(img, record, describe = () => {}, first = record.photos?.[0]) {
  const candidates = [first, ...(record.photos || []).filter(p => p !== first)].filter(Boolean);
  const study = studyFor(record);
  if (study) candidates.push(study);
  let next = 0;
  function showNext() {
    let url, photo;
    while (!url && next < candidates.length) {
      photo = candidates[next++];
      url = photo.editorial ? photo.url : resolvePublicPhoto(photo);
    }
    if (url) {
      img.alt = photo.editorial ? photo.view+' · '+record.name : record.name;
      img.dataset.imageKind = photo.kind || 'photo';
      describe(photo);
      img.onerror = showNext;
      img.src = url;
    } else {
      describe(null);
      img.onerror = null;
      img.alt = houseCaption;
      img.dataset.imageKind = 'house';
      img.src = housePhoto;
    }
  }
  showNext();
}

export function resolvePublicPhoto(photo) {
  if (!photo || typeof photo.src !== 'string') return '';
  try {
    if (photo.adminPhoto) {
      const url = new URL(photo.src);
      const api = new URL(API_BASE);
      return url.origin === api.origin && url.pathname.startsWith('/api/photos/') && url.protocol === 'https:' ? url.href : '';
    }
    const base = new URL(photoDirectory, import.meta.url);
    const url = new URL(photo.src, base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : '';
  } catch {
    return '';
  }
}
