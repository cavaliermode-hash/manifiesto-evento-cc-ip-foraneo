/* Cifrado del manifiesto con PIN: PBKDF2-SHA256 + AES-GCM (Web Crypto). */
(function(root){
  const ITER = 250000, C = (root.crypto && root.crypto.subtle) ? root.crypto : require('crypto').webcrypto;
  const b64 = u => { let s=''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
  const unb = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const norm = pin => String(pin || '').trim().toLowerCase();
  async function key(pin, salt, iter){
    const base = await C.subtle.importKey('raw', new TextEncoder().encode(norm(pin)), 'PBKDF2', false, ['deriveKey']);
    return C.subtle.deriveKey({name:'PBKDF2', salt, iterations: iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  async function cifrar(obj, pin){
    const salt = C.getRandomValues(new Uint8Array(16)), iv = C.getRandomValues(new Uint8Array(12));
    const ct = await C.subtle.encrypt({name:'AES-GCM', iv}, await key(pin, salt, ITER), new TextEncoder().encode(JSON.stringify(obj)));
    return {n: ITER, s: b64(salt), i: b64(iv), c: b64(new Uint8Array(ct))};
  }
  async function descifrar(enc, pin){
    const pt = await C.subtle.decrypt({name:'AES-GCM', iv: unb(enc.i)}, await key(pin, unb(enc.s), enc.n), unb(enc.c));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  const api = {cifrar, descifrar};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cifra = api;
})(typeof window !== 'undefined' ? window : globalThis);
