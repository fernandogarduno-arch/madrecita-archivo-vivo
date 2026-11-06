import {photoDirectory} from './medios.js';
import {API_BASE} from '../admin/config.js';

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
