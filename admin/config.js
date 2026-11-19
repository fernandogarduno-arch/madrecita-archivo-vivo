const localPreview=['127.0.0.1','localhost'].includes(location.hostname) && ['4178','4179'].includes(location.port);
export const API_BASE = localPreview ? location.origin : 'https://madrecita-coleccion-api-retana.gamasis.chatgpt.site';
