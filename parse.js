// Convierte la hoja "Concentrado de vuelos" en los datos del buscador.
// Descarta teléfono, correo, fecha de nacimiento y costos.
(function (root) {
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const up = v => clean(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const empty = v => { const s = clean(v); return !s || s === '-' || s === '0'; };
  function toDate(v) {
    if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    if (typeof v === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
    const s = clean(v); const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return s;
  }
  function toTime(v) {
    if (typeof v === 'number') { const mins = Math.round((v - Math.floor(v)) * 1440); return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`; }
    const s = clean(v); const m = s.match(/^(\d{1,2}):?(\d{2})/);
    return m ? `${pad(m[1])}:${m[2]}` : '';
  }
  const GROUPS = [['c1', 'CONEXION I'], ['ida', 'DESTINO IDA'], ['reg', 'DESTINO REGRESO'], ['c2', 'CONEXION II'], ['res', 'DATOS DE LA RESERVA'], ['end', 'CARGOS']];

  function parse(grid) {
    const hi = grid.findIndex(r => r && r.some(c => up(c) === 'NOMBRE'));
    if (hi < 1) throw new Error('No encontré la columna "Nombre" en la hoja de vuelos.');
    const H = grid[hi].map(up), G = grid[hi - 1].map(up);
    const start = {};
    GROUPS.forEach(([k, label]) => {
      const i = G.findIndex(c => c && (label === 'CONEXION I' ? /CONEXION I$/.test(c) : c.includes(label)));
      if (i >= 0) start[k] = i;
    });
    if (start.ida == null || start.reg == null) throw new Error('No encontré los bloques "DESTINO IDA" y "DESTINO REGRESO".');
    const bounds = Object.values(start).concat(H.length).sort((a, b) => a - b);
    const range = k => { const s = start[k]; if (s == null) return null; return [s, bounds.find(b => b > s)]; };
    function cols(k) {
      const r = range(k); if (!r) return null; const m = {};
      for (let i = r[0]; i < r[1]; i++) { const h = H[i]; if (h) m[h] = i; } // última aparición gana
      return m;
    }
    const C = { c1: cols('c1'), ida: cols('ida'), reg: cols('reg'), c2: cols('c2'), res: cols('res') };
    const col = n => H.indexOf(n);
    const iName = col('NOMBRE'), iSt = col('ESTATUS'), iRegion = col('REGION');
    const iRol = H.findIndex(h => h.startsWith('ROL'));
    const iTr = col('TRASLADO'), iPe = H.findIndex(h => h.startsWith('PERNOCTA')), iSeg = H.findIndex(h => h.startsWith('SEGUIMIENTO'));
    // Texto aprobado para el traslado Tijuana → Ensenada (columna L).
    const SEG_TXT = 'A su llegada a Tijuana se le va a desplazar al Hotel Lucerna Tijuana para que desayunen y a las 12:00 hrs será el traslado al Hotel Torre Lucerna Ensenada (trayecto de 1 h 30 min).';
    // Texto amigable: minúsculas con nombres propios corregidos; quita domicilios particulares.
    const KEEP = {TIJUANA:'Tijuana', ENSENADA:'Ensenada', LUCERNA:'Lucerna', HOTEL:'Hotel', TORRE:'Torre', CUPON:'cupón', METLIFE:'MetLife', SERA:'será'};
    const friendly = (s, quitarDomicilio) => {
      let t = clean(s);
      if (!t || t === '-') return '';
      if (quitarDomicilio) t = t.replace(/\s*DESPLAZO\b(?!\s+DE\s+\d).*$/i, ' al domicilio registrado'); // no publica direcciones particulares
      t = t.split(' ').map(w => { const u = w.replace(/[.,]/g,'').toUpperCase(); const p = w.match(/[.,]+$/); const k = KEEP[u];
        if (k) return k + (p ? p[0] : ''); return /[a-záéíóúñ]/.test(w) ? w : w.toLowerCase(); }).join(' ');
      t = t.replace(/\b(\d{1,2})\s*hrs\b/gi, '$1:00 h').replace(/desplazo de (\d+):(\d+) minutos/i, '(trayecto de $1 h $2 min)').replace(/\bel desplazo a\b/i, 'el traslado a')
           .replace(/Hotel (Torre Lucerna) Hotel (Ensenada)/, 'Hotel $1 $2').replace(/\s+/g, ' ').trim();
      return t.charAt(0).toUpperCase() + t.slice(1) + (/[.)]$/.test(t) ? '' : '.');
    };
    const leg = (r, m) => {
      if (!m || empty(r[m['VUELO']])) return null;
      return { v: clean(r[m['VUELO']]).toUpperCase().replace(/VIVAAEROBUS/g, 'VIVA AEROBUS').replace(/\s+/g, ' '), f: toDate(r[m['FECHA']]), o: up(r[m['ORIGEN']] ?? ''), d: up(r[m['DESTINO']]),
               s: toTime(r[m['SALE']]), l: toTime(r[m['LLEGA']]) };
    };
    const rows = [];
    for (const r of grid.slice(hi + 1)) {
      if (!r || empty(r[iName])) continue;
      const res = C.res || {};
      // Reserva de ida (RESERVA LLEGADA / RESERVA IDA) y de regreso (RESERVA REGRESO).
      // Reportes anteriores traen una sola columna RESERVA AEROLINEA: se usa para ambos tramos.
      const rk = Object.keys(res);
      const idaKey = rk.find(k => /^RESERVA (LLEGADA|IDA)/.test(k));
      const regKey = rk.find(k => /^RESERVA (REGRESO|VUELTA|SALIDA)/.test(k));
      const unaKey = rk.find(k => /^RESERVA AEROLINEA/.test(k));
      const code = k => k && !empty(r[res[k]]) ? clean(r[res[k]]).toUpperCase() : '';
      const x = { n: up(r[iName]).replace(/AEROMEXICO/g, 'AM'), // corrige reemplazo accidental de AM -> AEROMEXICO en nombres
                 st: clean(r[iSt]).toUpperCase(), rol: iRol >= 0 ? clean(r[iRol]) : '', rg: iRegion >= 0 && !empty(r[iRegion]) ? up(r[iRegion]) : '',
        c1: leg(r, C.c1), ida: leg(r, C.ida), reg: leg(r, C.reg), c2: leg(r, C.c2),
        ci: idaKey ? code(idaKey) : code(unaKey), cr: regKey ? code(regKey) : code(unaKey) };
      x.notas = [['pe', iPe], ['seg', iSeg], ['tr', iTr]].map(([k, i]) => i >= 0 ? { k, t: k === 'seg' && /DESAYUN/i.test(clean(r[i])) && /ENSENADA/i.test(clean(r[i])) ? SEG_TXT : friendly(r[i], k === 'tr') } : null).filter(n => n && n.t);
      if (!x.notas.length) delete x.notas;
      if (!x.cr && x.ci && x.reg) x.cr = x.ci; // sin reserva de regreso: es la misma clave de la ida
      x.cl = x.ci || x.cr; // compatibilidad con páginas guardadas en el navegador
      if (x.c1 && x.ida && !x.ida.o) x.ida.o = x.c1.d;
      if (x.c2 && x.reg && !x.c2.o) x.c2.o = x.reg.d;
      rows.push(x);
    }
    return rows;
  }
  // Las claves no se publican: se guarda solo una huella PBKDF2 para poder buscar por clave exacta.
  const SALT = 'vuelos-ip-summit-v1', ITER = 150000;
  const normKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function keyHash(code) {
    const enc = new TextEncoder(), c = root.crypto.subtle;
    const k = await c.importKey('raw', enc.encode(normKey(code)), 'PBKDF2', false, ['deriveBits']);
    const bits = await c.deriveBits({ name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITER, hash: 'SHA-256' }, k, 128);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function protect(rows) {
    for (const r of rows) {
      const codes = new Set();
      [r.ci, r.cr].filter(Boolean).forEach(c => { codes.add(normKey(c)); c.split(/[^A-Z0-9]+/i).forEach(p => p.length >= 5 && codes.add(normKey(p))); });
      r.k = [];
      for (const c of codes) r.k.push(await keyHash(c));
      r.kc = r.ci ? 1 : 0; r.kp = r.cr ? 1 : 0;
      delete r.ci; delete r.cr;
    }
    return rows;
  }
  root.parseConcentrado = parse;
  root.protectClaves = protect;
  root.claveHash = keyHash;
  root.normClave = normKey;
  if (typeof module !== 'undefined') module.exports = { parse, protect, keyHash, normKey };
})(typeof window !== 'undefined' ? window : globalThis);
