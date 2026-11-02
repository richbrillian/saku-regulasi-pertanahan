/* Saku Regulasi Pertanahan — data dari Google Sheet (langsung saat online, cadangan offline), teks resmi dari PDF peraturan */
'use strict';
const SHEET_ID = '12fYuEZi16weba1FdbsbTGy8cRwSxUx6EnKDrCPizu1o';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const csvURL = t => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(t)}`;
const CACHE_KEY = 'srp-sheet-v1', READ_KEY = 'srp-read-v1';

// ---------- Peraturan: posisi di hierarki, tab Sheet, dan file teks resmi ----------
// parent = peraturan yang menjadi dasarnya (untuk diagram alir); via = pasal/alasan hubungan
const REGS = [
  { id: 'uud', jenis: 'UUD', nomor: '1945', name: 'UUD NRI 1945', tentang: 'Undang-Undang Dasar Negara Republik Indonesia', info: 'Pasal 33 ayat (3): bumi, air, dan kekayaan alam dikuasai negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat. Pasal 18B ayat (2): pengakuan masyarakat hukum adat. Pasal 28H ayat (4): hak milik pribadi tidak boleh diambil sewenang-wenang.' },
  { id: 'uupa', tab: 'UUPA 5_1960', teks: 'UUPA', jenis: 'UU', nomor: '5/1960', name: 'UUPA (UU 5/1960)', tentang: 'Peraturan Dasar Pokok-Pokok Agraria', parent: 'uud', via: 'Ps 33 (3) UUD', pdf: 'https://peraturan.go.id/files/UU0051960.pdf' },
  { id: 'uu4-2011', tab: 'UU 4/2011', teks: 'UU4-2011', jenis: 'UU', nomor: '4/2011', name: 'UU 4/2011', tentang: 'Informasi Geospasial', parent: 'uud', via: 'dasar peta & data geospasial', pdf: 'https://peraturan.go.id/files/uu4-2011.pdf' },
  { id: 'uu6-2023', jenis: 'UU', nomor: '6/2023', name: 'UU 6/2023', tentang: 'Cipta Kerja (klaster pertanahan & tata ruang)', parent: 'uud', via: 'mengubah banyak UU sektoral', cat: true },
  { id: 'uu4-1996', tab: 'UU 4/1996', teks: 'UU4-1996', jenis: 'UU', nomor: '4/1996', name: 'UU 4/1996', tentang: 'Hak Tanggungan', parent: 'uupa', via: 'Ps 51 UUPA', pdf: 'https://peraturan.go.id/files/uu4-1996.pdf' },
  { id: 'uu2-2012', tab: 'UU No. 2 Tahun 2012', jenis: 'UU', nomor: '2/2012', name: 'UU 2/2012', tentang: 'Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum', parent: 'uupa', via: 'Ps 18 UUPA' },
  { id: 'pp24', tab: 'PP 24/1997', teks: 'PP24-1997', jenis: 'PP', nomor: '24/1997', name: 'PP 24/1997', tentang: 'Pendaftaran Tanah', parent: 'uupa', via: 'Ps 19 UUPA', pdf: 'https://peraturan.go.id/files/pp24-1997.pdf', key: true },
  { id: 'pp18', tab: 'PP 18/2021', teks: 'PP18-2021', jenis: 'PP', nomor: '18/2021', name: 'PP 18/2021', tentang: 'Hak Pengelolaan, Hak Atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah', parent: 'uupa', via: 'UUPA jo. UU Cipta Kerja', pdf: 'https://www.peraturan.go.id/files3/pp-no-18-tahun-2021_asli.pdf', key: true },
  { id: 'pp48', tab: 'PP 48/2025', teks: 'PP48-2025', jenis: 'PP', nomor: '48/2025', name: 'PP 48/2025', tentang: 'Penertiban Kawasan dan Tanah Telantar', parent: 'uupa', via: 'Ps 27, 34, 40 UUPA', pdf: 'https://www.peraturan.go.id/files/pp-no-48-tahun-2025.pdf' },
  { id: 'pp45-2021', jenis: 'PP', nomor: '45/2021', name: 'PP 45/2021', tentang: 'Penyelenggaraan Informasi Geospasial', parent: 'uu4-2011', cat: true },
  { id: 'ksp', jenis: 'Perpres', nomor: '9/2016 jo. 23/2021', name: 'Perpres Kebijakan Satu Peta', tentang: 'Percepatan Kebijakan Satu Peta', parent: 'uu4-2011', cat: true },
  { id: 'srgi', jenis: 'Perka BIG', nomor: '15/2013', name: 'Perka BIG 15/2013', tentang: 'Sistem Referensi Geospasial Indonesia (SRGI2013)', parent: 'uu4-2011', cat: true },
  { id: 'pmna3', tab: 'PERMEN 3/1997', teksAlt: ['PERMEN16-2021', 'PERMEN7-2019'], jenis: 'Permen', nomor: '3/1997', name: 'PMNA/KBPN 3/1997', tentang: 'Ketentuan Pelaksanaan PP 24/1997 (diubah Perkaban 8/2012, Permen 7/2019, Permen 16/2021)', parent: 'pp24', via: 'pelaksana PP 24/1997', key: true },
  { id: 'permen7-2019', teks: 'PERMEN7-2019', jenis: 'Permen', nomor: '7/2019', name: 'Permen 7/2019', tentang: 'Perubahan Kedua PMNA/KBPN 3/1997', parent: 'pmna3', via: 'perubahan II', pdf: 'https://www.peraturan.go.id/files/bn722-2019.pdf' },
  { id: 'permen16-2021', tab: 'PERMEN 16/2021', teks: 'PERMEN16-2021', jenis: 'Permen', nomor: '16/2021', name: 'Permen 16/2021', tentang: 'Perubahan Ketiga PMNA/KBPN 3/1997 (tanda batas, pengukuran, elektronik)', parent: 'pmna3', via: 'perubahan III', pdf: 'https://peraturan.go.id/files/bn953-2021.pdf', key: true },
  { id: 'juknis399', tab: 'JUKNIS 399/2021', jenis: 'Juknis', nomor: '399/2021', name: 'Juknis 399/2021', tentang: 'Pengukuran dan Pemetaan Berbasis Mitigasi Risiko', parent: 'permen16-2021', via: 'tindak lanjut Permen 16/2021', key: true },
  { id: 'se', tab: 'Surat Edaran', jenis: 'SE', nomor: 'kumpulan', name: 'Surat Edaran & Juknis', tentang: 'SE dan Juknis bidang Survei dan Pemetaan', parent: 'permen16-2021', via: 'peraturan kebijakan' },
  { id: 'permen6-2018', tab: 'PERMEN 6/2018', teks: 'PERMEN6-2018', jenis: 'Permen', nomor: '6/2018', name: 'Permen 6/2018', tentang: 'Pendaftaran Tanah Sistematis Lengkap (PTSL)', parent: 'pp24', via: 'pendaftaran sistematik', pdf: 'https://www.peraturan.go.id/files/bn501-2018.pdf', key: true },
  { id: 'permen9-2021', tab: 'PERMEN 9/2021', teks: 'PERMEN9-2021', jenis: 'Permen', nomor: '9/2021', name: 'Permen 9/2021', tentang: 'Surveyor Berlisensi (diubah Permen 8/2022)', parent: 'pp24', via: 'pelaksana pengukuran', pdf: 'https://www.peraturan.go.id/files/bn55-2021.pdf', key: true },
  { id: 'permen8-2022', teks: 'PERMEN8-2022', jenis: 'Permen', nomor: '8/2022', name: 'Permen 8/2022', tentang: 'Perubahan Permen 9/2021 (Surveyor Berlisensi)', parent: 'permen9-2021', via: 'perubahan', pdf: 'https://www.peraturan.go.id/files/bn396-2022.pdf' },
  { id: 'permen7-2020', tab: 'PERMEN 7/2020', teks: 'PERMEN7-2020', jenis: 'Permen', nomor: '7/2020', name: 'Permen 7/2020', tentang: 'KKNI Bidang Survei Kadastral (diubah Permen 31/2021)', parent: 'permen9-2021', via: 'kompetensi surveyor', pdf: 'https://www.peraturan.go.id/files/bn475-2020.pdf' },
  { id: 'permen18-2021', jenis: 'Permen', nomor: '18/2021', name: 'Permen 18/2021', tentang: 'Tata Cara Penetapan HPL dan Hak Atas Tanah', parent: 'pp18', cat: true },
  { id: 'permen3-2023', jenis: 'Permen', nomor: '3/2023', name: 'Permen 3/2023', tentang: 'Penerbitan Dokumen Elektronik dalam Pendaftaran Tanah', parent: 'pp18', cat: true },
  { id: 'permen5-2025', tab: 'PERMEN 9/2025', part: 'after', teks: 'PERMEN5-2025', jenis: 'Permen', nomor: '5/2025', name: 'Permen 5/2025', tentang: 'Pelimpahan Kewenangan Penetapan Hak dan Kegiatan Pendaftaran Tanah', parent: 'pp18', via: 'kewenangan', pdf: 'https://peraturan.go.id/files/permen-atrbpn-no-5-tahun-2025.pdf', key: true },
  { id: 'permen9-2025', tab: 'PERMEN 9/2025', part: 'before', teks: 'PERMEN9-2025', jenis: 'Permen', nomor: '9/2025', name: 'Permen 9/2025', tentang: 'Perubahan Permen 5/2025 (Pelimpahan Kewenangan)', parent: 'permen5-2025', via: 'perubahan', pdf: 'https://peraturan.go.id/files/permen-atrbpn-no-9-tahun-2025.pdf' },
  { id: 'se-telaah', tab: 'SE TELAAH SPASIAL 6 AGS 2025', jenis: 'SE', nomor: 'Ags 2025', name: 'SE Telaah Spasial 2025', tentang: 'Telaah spasial dalam pemberian, perpanjangan, pembaruan hak', parent: 'permen5-2025', via: 'peraturan kebijakan', key: true },
  { id: 'permen1-2023', jenis: 'Permen', nomor: '1/2023', name: 'Permen 1/2023', tentang: 'Penyelenggaraan IGT Pertanahan dan Ruang', parent: 'pp45-2021', cat: true },
  { id: 'permen1-2025', tab: 'PERMEN 1 TAHUN 2025', teks: 'PERMEN1-2025', jenis: 'Permen', nomor: '1/2025', name: 'Permen 1/2025', tentang: 'Pedoman Basis Data Informasi Geospasial Tematik Pertanahan', parent: 'permen1-2023', via: 'mengubah Lamp. Permen 1/2023', pdf: 'https://peraturan.go.id/files/permen-atrbpn-no-1-tahun-2025.pdf' },
  { id: 'permen27-2019', tab: 'PERMEN 27/2019', teks: 'PERMEN27-2019', jenis: 'Permen', nomor: '27/2019', name: 'Permen 27/2019', tentang: 'Pertimbangan Teknis Pertanahan (sudah dicabut)', dead: true, pdf: 'https://www.peraturan.go.id/files/bn1433-2019.pdf' },
  { id: 'uu5-1999', tab: 'UU 5/1999', jenis: 'UU', nomor: '5/1999', name: 'UU 5/1999', tentang: 'Larangan Praktik Monopoli (bukan peraturan pertanahan)', other: true },
  { id: 'kartu', tab: 'Kartu Saku', jenis: 'Ringkas', nomor: '', name: 'Kartu Saku', tentang: 'Pasal kunci untuk dibawa ke lapangan', other: true },
];
const LEVEL = { UUD: 'uud', UU: 'uu', PP: 'pp', Perpres: 'perpres', 'Perka BIG': 'perpres', Permen: 'permen', Juknis: 'juknis', SE: 'juknis', Ringkas: 'lain' };
const lc = r => `--lc:var(--l-${LEVEL[r.jenis] || 'lain'})`;
const BELAJAR_GROUPS = [['Undang-Undang', r => r.jenis === 'UU' && !r.other], ['Peraturan Pemerintah', r => r.jenis === 'PP'], ['Peraturan Menteri ATR/BPN', r => r.jenis === 'Permen' && !r.dead], ['Juknis & Surat Edaran', r => r.jenis === 'Juknis' || r.jenis === 'SE'], ['Lainnya & riwayat', r => r.dead || r.other || r.extra]];

// Jalur belajar bidang Survei & Pemetaan (urutan disarankan)
const JALUR = [
  ['Dasar', [['uupa', '19'], ['pp24', '1'], ['pp24', '9'], ['pp24', '11'], ['pp24', '12'], ['pp24', '13']]],
  ['Data fisik: pengukuran & pemetaan', [['pp24', '14'], ['pp24', '15'], ['pp24', '16'], ['pp24', '17'], ['pp24', '18'], ['pp24', '19'], ['pp24', '20'], ['pp24', '21'], ['pp24', '22']]],
  ['Tanda batas & teknis ukur (Permen 16/2021)', [['permen16-2021', '19A'], ['permen16-2021', '19B'], ['permen16-2021', '19C'], ['permen16-2021', '19D'], ['permen16-2021', '24'], ['permen16-2021', '26'], ['permen16-2021', '27']]],
  ['Pengumuman, sertipikat, kekuatan bukti', [['pp24', '26'], ['pp18', '88'], ['pp24', '32'], ['pp18', '84'], ['pp18', '96']]],
  ['PTSL', [['permen6-2018', '4'], ['permen6-2018', '19'], ['permen6-2018', '24'], ['permen6-2018', '25']]],
  ['Surveyor Berlisensi & kewenangan', [['permen9-2021', '2'], ['permen9-2021', '12'], ['permen9-2021', '15'], ['permen5-2025', '14'], ['permen5-2025', '15'], ['permen5-2025', '16']]],
  ['Informasi geospasial', [['uu4-2011', '19'], ['uu4-2011', '22'], ['uu4-2011', '46']]],
];

// ---------- util ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[–—]/g, '-').replace(/[^a-z0-9/.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } } };
function parseCSV(s) { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } if (f || r.length) { r.push(f); rows.push(r); } return rows; }
const keyOf = l => String(l || '').replace(/^Pasal\s+/i, '').trim();
const numSort = (a, b) => (parseInt(a) - parseInt(b)) || String(a).localeCompare(String(b));
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 1800); }
const STOP = new Set('yang dan di ke dari untuk dengan atau pada dalam ini itu oleh sebagaimana dimaksud ayat pasal huruf adalah dapat tidak sebagai serta bagi atas'.split(' '));
const wset = s => new Set(norm(s).split(' ').filter(w => w.length > 3 && !STOP.has(w)).map(w => w.slice(0, 6)));
function overlap(a, b) { const A = wset(a), B = wset(b); if (A.size < 4) return 1; let h = 0; A.forEach(w => B.has(w) && h++); return h / A.size; }
function excerpt(t, n = 190) { const s = String(t || '').replace(/^\(1\)\s*/, '').replace(/\n/g, ' '); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s; }

// ---------- data ----------
let RAW = null, SYNC = { source: 'none', at: null }, TEKS = null, D = null;
const TABS_FIXED = ['DAFTAR PERATURAN', 'BANK KASUS', 'PERATURAN PENTING', 'LINK PDF', 'LOG KOREKSI'];
async function loadSnapshot() {
  const cached = store.get(CACHE_KEY, null);
  if (cached && cached.tabs) { RAW = cached.tabs; SYNC = { source: 'cache', at: cached.at }; return; }
  const r = await fetch('snapshot.json'); const j = await r.json(); RAW = j.tabs; SYNC = { source: 'snapshot', at: j.at };
}
async function syncSheet(manual) {
  if (!navigator.onLine) { if (manual) toast('Sedang offline. Memakai data tersimpan.'); return false; }
  setSync('Menyinkronkan…');
  try {
    const daftar = parseCSV(await (await fetch(csvURL('DAFTAR PERATURAN'), { cache: 'no-store' })).text());
    const listed = daftar.map(r => r[1]).filter(t => t && !/^NAMA PERATURAN$/i.test(t));
    const tabs = [...new Set([...TABS_FIXED, ...REGS.filter(r => r.tab).map(r => r.tab), ...listed])];
    const out = { 'DAFTAR PERATURAN': daftar };
    await Promise.all(tabs.filter(t => t !== 'DAFTAR PERATURAN').map(async t => {
      try { const res = await fetch(csvURL(t), { cache: 'no-store' }); if (res.ok) { const txt = await res.text(); if (!/^\s*<!DOCTYPE/i.test(txt)) out[t] = parseCSV(txt); } } catch { }
    }));
    if (Object.keys(out).length < 5) throw new Error('data kurang');
    RAW = out; SYNC = { source: 'live', at: new Date().toISOString() };
    if (!store.set(CACHE_KEY, { tabs: out, at: SYNC.at })) console.warn('cache penuh');
    derive(); route(); if (manual) toast('Data terbaru dari Sheet sudah dimuat');
    return true;
  } catch (e) { setSyncLabel(); if (manual) toast('Gagal mengambil data Sheet. Memakai data tersimpan.'); return false; }
}
async function loadTeks() { if (TEKS) return TEKS; try { TEKS = await (await fetch('teks.json')).json(); } catch { TEKS = {}; } buildIndex(); return TEKS; }
function setSync(t) { const b = $('#sync'); b.textContent = t; b.className = 'sync' + (SYNC.source === 'live' ? ' live' : ''); }
function setSyncLabel() {
  const at = SYNC.at ? new Date(SYNC.at) : null;
  const when = at ? at.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  setSync(SYNC.source === 'live' ? `● Sheet · ${when}` : SYNC.source === 'cache' ? `Tersimpan · ${when}` : `Bawaan · ${when}`);
}

function rowsOf(tab) { const rows = RAW[tab] || []; return rows.filter(r => r.some(x => String(x).trim())); }
function derive() {
  const regs = REGS.map(r => ({ ...r }));
  // peraturan baru yang didaftarkan di DAFTAR PERATURAN tetapi belum ada di daftar aplikasi
  const known = new Set(regs.filter(r => r.tab).map(r => r.tab).concat(TABS_FIXED, ['CARI KASUS', 'HIERARKI PERATURAN', 'CEK KEKURANGAN', 'Wajib Dihapalkan', 'Wajib Dihapal', 'DASHBOARD', 'PERMEN 21/2019']));
  const ringkas = {};
  rowsOf('DAFTAR PERATURAN').forEach(r => { if (r[1]) ringkas[r[1]] = r[2]; });
  Object.keys(RAW).forEach(t => { if (!known.has(t) && rowsOf(t).length > 1) regs.push({ id: 'x-' + norm(t).replace(/[^a-z0-9]+/g, '-'), tab: t, jenis: /^PP/i.test(t) ? 'PP' : /^UU/i.test(t) ? 'UU' : /^PERMEN/i.test(t) ? 'Permen' : /^(SE|JUKNIS)/i.test(t) ? 'SE' : 'Ringkas', nomor: '', name: t, tentang: ringkas[t] || 'Tab baru di Sheet', extra: true }); });
  const links = {}; rowsOf('LINK PDF').slice(1).forEach(r => { if (r[0] && r[1]) links[r[0]] = r[1] || r[2]; });
  const items = {};
  for (const reg of regs) {
    if (!reg.tab) continue;
    if (!reg.pdf && links[reg.tab]) reg.pdf = links[reg.tab];
    if (!reg.tentang && ringkas[reg.tab]) reg.tentang = ringkas[reg.tab];
    let rows = rowsOf(reg.tab);
    if (reg.part) { const i = rows.findIndex(r => /^permen 5\/2025$/i.test(String(r[0]).trim())); rows = reg.part === 'before' ? (i > 0 ? rows.slice(0, i) : rows) : (i > 0 ? rows.slice(i + 1) : []); }
    const list = [];
    if (reg.tab === 'Kartu Saku') {
      let sec = '';
      rows.forEach(r => { if (r[0] && !r[1] && !r[2]) { sec = r[0]; return; } if (!r[2] || r[0] === 'BAGIAN') return; list.push({ key: r[1], label: r[1], inti: r[2], jelas: '', status: '', dasar: r[3], sec: r[0] || sec }); });
    } else {
      rows.forEach((r, i) => { const label = String(r[0] || '').trim(); if (!label && !r[1]) return; if (/^pasal$/i.test(label) && /inti/i.test(r[1] || '')) return; list.push({ key: keyOf(label), label, inti: (r[1] || '').trim(), jelas: (r[2] || '').trim(), status: (r[3] || '').trim(), dasar: (r[4] || '').trim() }); });
    }
    items[reg.id] = list;
  }
  const cases = rowsOf('BANK KASUS').slice(1).filter(r => r[2]).map(r => ({ kat: r[0], inti: r[1], kasus: r[2], jelas: r[3], langkah: r[4], tab: r[5], dasar: r[6], pasal: r[7] }));
  const cat = rowsOf('PERATURAN PENTING').slice(1).filter(r => r[1]).map(r => ({ no: r[0], jenis: r[1], nomor: r[2], tentang: r[3], status: r[4], bidang: r[5], poin: r[6] }));
  const log = rowsOf('LOG KOREKSI').slice(1).map(r => ({ tab: r[0], pasal: r[1], kolom: r[2], lama: r[3], baru: r[4], alasan: r[5], yakin: r[6] }));
  D = { regs, byId: Object.fromEntries(regs.map(r => [r.id, r])), items, cases, cat, log };
  buildIndex(); setSyncLabel();
}
function teksOf(reg) { return TEKS && reg.teks ? TEKS[reg.teks] : null; }
function teksFor(reg, key) {
  if (!TEKS) return null;
  for (const f of [reg.teks, ...(reg.teksAlt || [])].filter(Boolean)) { const p = TEKS[f]?.pasal.find(p => p.no === key); if (p) return { ...p, src: f }; }
  return null;
}
// Daftar pasal sebuah peraturan: urutan teks resmi bila ada, dilengkapi ringkasan dari Sheet
function pasalList(reg) {
  const rows = D.items[reg.id] || [], T = teksOf(reg);
  if (!T) return rows.map(r => ({ key: r.key, label: r.label, row: r, t: reg.teksAlt ? teksFor(reg, r.key) : null }));
  const byKey = new Map(rows.map(r => [r.key, r]));
  const list = T.pasal.filter(p => !p.no.endsWith('*')).map(p => ({ key: p.no, label: 'Pasal ' + p.no, row: byKey.get(p.no) || null, t: p }));
  const ks = new Set(list.map(x => x.key));
  rows.forEach(r => { if (!ks.has(r.key)) list.push({ key: r.key, label: r.label, row: r, t: null, extra: true }); });
  return list;
}
function summaryOf(e) {
  const inti = e.row?.inti;
  const bad = inti && e.t && overlap(inti, e.t.text) < 0.3;
  return { text: inti && !bad ? inti : (e.t ? excerpt(e.t.text) : inti || ''), auto: !inti && !!e.t, mismatch: bad, sheet: inti };
}
const READ = new Set(store.get(READ_KEY, []));
const isRead = (rid, k) => READ.has(rid + '|' + k);
function toggleRead(rid, k) { const id = rid + '|' + k; READ.has(id) ? READ.delete(id) : READ.add(id); store.set(READ_KEY, [...READ]); }

// ---------- pencarian ----------
const SYN = {
  patok: ['tanda batas', 'patok'], 'tanda batas': ['patok'], batas: ['batas', 'penetapan batas', 'tanda batas'], girik: ['girik', 'bekas milik adat', 'petuk', 'letter c', 'pipil'], petuk: ['girik', 'bekas milik adat'],
  ukur: ['ukur', 'pengukuran'], pengukuran: ['ukur', 'pengukuran'], ptsl: ['ptsl', 'sistematis lengkap', 'sistematik'], kjsb: ['kjsb', 'kantor jasa surveyor', 'surveyor berlisensi'], skb: ['surveyor kadaster', 'surveyor berlisensi', 'surveyor kadastral'],
  pbt: ['peta bidang', 'pbt'], su: ['surat ukur'], gu: ['gambar ukur'], nib: ['nib', 'nomor identifikasi bidang'], tdt: ['titik dasar teknik', 'tdt', 'kdkn', 'cors'], cors: ['cors', 'kdkn', 'titik dasar teknik'],
  overlap: ['tumpang tindih', 'overlap'], rekonstruksi: ['pengembalian batas', 'rekonstruksi'], pecah: ['pemecahan', 'pecah'], gabung: ['penggabungan', 'gabung'], sengketa: ['sengketa', 'konflik', 'perkara', 'keberatan'],
  sertifikat: ['sertipikat', 'sertifikat'], sertipikat: ['sertipikat', 'sertifikat'], telantar: ['telantar', 'terlantar'], terlantar: ['telantar'], lsd: ['lahan sawah', 'lsd'], hutan: ['kawasan hutan', 'hutan'],
  telaah: ['telaah spasial', 'telaah'], kkpr: ['kkpr', 'kesesuaian kegiatan pemanfaatan ruang', 'tata ruang'], hgu: ['hgu', 'hak guna usaha'], hgb: ['hgb', 'hak guna bangunan'], hpl: ['hak pengelolaan', 'hpl'], ht: ['hak tanggungan'],
  waris: ['waris', 'pewarisan'], koordinat: ['koordinat', 'srgi'], kewenangan: ['kewenangan', 'pelimpahan'], ulayat: ['ulayat', 'masyarakat hukum adat'], biaya: ['biaya', 'tarif', 'pnbp']
};
const REG_HINTS = [[/\buupa\b|\buu ?5\/1960\b/, 'uupa'], [/\buu ?4\/1996\b|\buuht\b/, 'uu4-1996'], [/\buu ?2\/2012\b/, 'uu2-2012'], [/\buu ?4\/2011\b/, 'uu4-2011'], [/\bpp ?24(\/1997)?\b/, 'pp24'], [/\bpp ?18(\/2021)?\b/, 'pp18'], [/\bpp ?48(\/2025)?\b/, 'pp48'], [/\b(pmna|permen) ?3(\/1997)?\b/, 'pmna3'], [/\bpermen ?16(\/2021)?\b/, 'permen16-2021'], [/\bpermen ?6(\/2018)?\b/, 'permen6-2018'], [/\bpermen ?9\/2021\b/, 'permen9-2021'], [/\bpermen ?9\/2025\b/, 'permen9-2025'], [/\bpermen ?5(\/2025)?\b/, 'permen5-2025'], [/\bpermen ?7\/2020\b/, 'permen7-2020'], [/\bpermen ?1\/2025\b/, 'permen1-2025'], [/\bjuknis ?399\b/, 'juknis399']];
const QSTOP = new Set(['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'atau', 'pada', 'dalam', 'apa', 'bagaimana', 'jika', 'kalau', 'tentang', 'ini', 'itu', 'ada', 'tidak', 'bisa', 'harus', 'apakah', 'pasal', 'ps', 'nomor', 'tahun']);
let IDX = [];
function buildIndex() {
  if (!D) return;
  IDX = [];
  for (const reg of D.regs) {
    if (!reg.tab && !reg.teks) continue;
    for (const e of pasalList(reg)) { const s = summaryOf(e); IDX.push({ type: 'pasal', reg, e, k: norm(e.key), head: norm(reg.name + ' ' + (reg.tab || '')), a: norm(s.text + ' ' + (e.row?.inti || '')), b: norm((e.row ? e.row.jelas + ' ' + e.row.dasar : '')), c: e.t ? norm(e.t.text) : '' }); }
  }
  D.cases.forEach(c => IDX.push({ type: 'kasus', c, k: '', head: norm(c.kat), a: norm(c.kasus + ' ' + c.inti), b: norm(c.jelas + ' ' + c.langkah + ' ' + c.dasar + ' ' + c.pasal), c: '' }));
  D.cat.forEach(c => IDX.push({ type: 'katalog', c, k: '', head: norm(c.jenis + ' ' + c.nomor), a: norm(c.tentang + ' ' + c.poin), b: norm(c.bidang + ' ' + c.status), c: '' }));
}
function parseQ(raw) {
  let q = norm(raw), reg = null, pasal = null;
  for (const [re, id] of REG_HINTS) if (re.test(q)) { reg = id; q = q.replace(re, ' '); break; }
  const pm = q.match(/\b(?:pasal|ps)\s*([0-9]+[a-z]?)\b/); if (pm) { pasal = pm[1]; q = q.replace(pm[0], ' '); } else if (reg) { const n = q.match(/^\s*([0-9]+[a-z]?)\s*$/); if (n) { pasal = n[1]; q = ''; } }
  const groups = [];
  for (const k of Object.keys(SYN).filter(k => k.includes(' '))) if (q.includes(k)) { groups.push([k, ...SYN[k]]); q = q.replace(k, ' '); }
  q.split(' ').filter(w => w && !QSTOP.has(w) && (w.length > 1 || /\d/.test(w))).forEach(w => groups.push([w, ...(SYN[w] || [])].map(norm)));
  return { reg, pasal, groups };
}
const hw = (s, t) => { const i = s.indexOf(t); return i < 0 ? 0 : (i === 0 || s[i - 1] === ' ') ? 2 : 1; };
function search(raw, type = 'semua') {
  const Q = parseQ(raw); if (!Q.groups.length && !Q.reg && !Q.pasal) return { Q, res: [] };
  const res = [];
  for (const d of IDX) {
    if (type !== 'semua' && d.type !== type) continue;
    let s = 0, hit = 0;
    if (Q.reg) { if (d.type === 'pasal' && d.reg.id === Q.reg) s += 6; else if (Q.pasal || !Q.groups.length) continue; }
    if (Q.pasal) { if (d.type === 'pasal' && d.k === Q.pasal) s += 40; else if (!Q.groups.length) continue; }
    for (const g of Q.groups) {
      let best = 0;
      for (const t of g) { const w = t.includes(' ') ? 1.4 : 1; best = Math.max(best, hw(d.a, t) * 3 * w, hw(d.head, t) * 2, d.k === t ? 8 : 0, hw(d.b, t) * w, hw(d.c, t) * 0.8 * w); }
      if (best) { hit++; s += best; }
    }
    if (Q.groups.length && !hit) continue;
    if (hit === Q.groups.length) s += 6;
    if (d.type === 'pasal' && d.reg.key) s += 0.7;
    res.push({ d, s, full: hit === Q.groups.length });
  }
  const full = res.filter(r => r.full);
  return { Q, res: (full.length >= 3 ? full : res).sort((x, y) => y.s - x.s) };
}
function hl(text, Q) {
  const h = esc(text), terms = [...new Set(Q.groups.flat())].filter(t => t.length > 1).sort((a, b) => b.length - a.length);
  if (!terms.length) return h;
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|') + ')', 'gi');
  return h.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(re, '<mark>$1</mark>'));
}
function snippet(t, Q) { const s = String(t).replace(/\n/g, ' '); const terms = Q.groups.flat(); let i = -1; for (const x of terms) { i = norm(s).indexOf(x); if (i >= 0) break; } if (i < 0) return excerpt(s, 160); const a = Math.max(0, i - 60); return (a ? '…' : '') + s.slice(a, a + 200) + '…'; }

// ---------- tampilan ----------
const href = (rid, k) => `#/r/${rid}` + (k != null ? '/' + encodeURIComponent(k) : '');
function statusPill(s) {
  if (!s) return ''; const t = s.toLowerCase();
  const c = /dicabut|dihapus|tidak berlaku/.test(t) ? 'p-bad' : /diubah|berubah|ditambah|baru|sebagian|cek|perlu/.test(t) ? 'p-warn' : /berlaku/.test(t) ? 'p-ok' : 'p-neutral';
  return `<span class="pill ${c}">${esc(s.length > 26 ? s.slice(0, 24) + '…' : s)}</span>`;
}
const jenisTag = r => `<span class="jenis" style="${lc(r)}">${esc(r.jenis)}</span>`;
function resPasal(d, Q) {
  const { reg, e } = d, s = summaryOf(e), txt = Q && e.t && !hw(norm(s.text), (Q.groups[0] || [''])[0]) && Q.groups.length ? snippet(e.t.text, Q) : '';
  return `<a class="card res" href="${href(reg.id, e.key)}"><div class="num">${esc(/^\d/.test(e.key) ? 'Ps ' + e.key : e.label)}</div>
  <div class="meta"><span class="reg">${esc(reg.name)}</span>${statusPill(e.row?.status)}${s.mismatch ? '<span class="pill p-warn">Ringkasan perlu dicek</span>' : ''}${isRead(reg.id, e.key) ? '<span class="pill p-ok">✓ paham</span>' : ''}</div>
  <p>${Q ? hl(s.text, Q) : esc(s.text)}</p>${txt ? `<p class="sub">Teks resmi: ${hl(txt, Q)}</p>` : ''}</a>`;
}
function resKasus(c, Q) {
  return `<div class="card res"><div class="num">KASUS</div><div class="meta"><span class="reg">${esc(c.kat)}</span><span class="muted">${Q ? hl(c.dasar, Q) : esc(c.dasar)}</span></div>
  <p><b>${Q ? hl(c.kasus, Q) : esc(c.kasus)}</b></p><div><p class="sub">${Q ? hl(c.jelas, Q) : esc(c.jelas)}</p>
  <details><summary class="reg" style="cursor:pointer">Langkah penanganan · ${esc(c.pasal)}</summary><p style="white-space:pre-line;margin:6px 0 0">${esc(String(c.langkah).replace(/ (\d\)) /g, '\n$1 '))}</p></details></div></div>`;
}
function resKatalog(c, Q) {
  return `<div class="card res"><div class="num">${esc(c.jenis)}<br><span class="muted">${esc(c.nomor)}</span></div><div class="meta"><span class="reg">${Q ? hl(c.tentang, Q) : esc(c.tentang)}</span>${statusPill(c.status)}</div><p>${Q ? hl(c.poin, Q) : esc(c.poin)}</p><p class="sub">Bidang: ${esc(c.bidang)}</p></div>`;
}

const ICON = {
  cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  belajar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>',
  hierarki: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/></svg>',
  latihan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  lain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};
function tabbar(cur) {
  $('#tabbar').innerHTML = [['cari', 'Cari', '#/'], ['belajar', 'Belajar', '#/belajar'], ['hierarki', 'Hierarki', '#/hierarki'], ['latihan', 'Latihan', '#/latihan'], ['lain', 'Lainnya', '#/lain']]
    .map(([k, l, h]) => `<a href="${h}" ${k === cur ? 'aria-current="page"' : ''}>${ICON[k]}<span>${l}</span></a>`).join('');
}

// Beranda / cari
const QUICK = ['tanda batas', 'pengembalian batas', 'girik', 'PTSL kluster', 'pengumuman', 'pemecahan', 'surveyor berlisensi', 'telaah spasial', 'tumpang tindih', 'pp 24 pasal 17', 'kewenangan pengukuran'];
let FTYPE = 'semua';
function vCari() {
  const q = $('#q').value.trim();
  if (!q) {
    const prog = JALUR.flatMap(([, l]) => l), done = prog.filter(([r, k]) => isRead(r, k)).length;
    $('#main').innerHTML = `<div class="stack">
      <div class="chips">${QUICK.map(c => `<button class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <a class="card" href="#/belajar" style="text-decoration:none;color:inherit"><div class="eyebrow">Jalur belajar Survei &amp; Pemetaan</div>
        <h2 style="margin:4px 0 8px">${done} dari ${prog.length} pasal kunci sudah dipahami</h2><div class="bar"><i style="width:${Math.round(done / prog.length * 100)}%"></i></div>
        <p class="muted" style="margin:8px 0 0">Mulai dari UUPA Pasal 19, lalu PP 24/1997, tanda batas, PTSL, sampai Surveyor Berlisensi.</p></a>
      <div class="sec"><h2>Pasal yang paling sering dipakai</h2>
      ${[['pp24', '17'], ['pp24', '19'], ['permen16-2021', '19A'], ['permen6-2018', '25'], ['pp18', '96'], ['permen5-2025', '14']].map(([r, k]) => { const reg = D.byId[r]; const e = pasalList(reg).find(e => e.key === k); return e ? resPasal({ reg, e }, null) : ''; }).join('')}</div></div>`;
    return;
  }
  const { Q, res } = search(q, FTYPE);
  const segs = [['semua', 'Semua'], ['pasal', 'Pasal'], ['kasus', 'Kasus'], ['katalog', 'Katalog']];
  $('#main').innerHTML = `<div class="stack"><div class="row"><div class="chips">${segs.map(([k, l]) => `<button class="chip" data-type="${k}" aria-pressed="${k === FTYPE}">${l}</button>`).join('')}</div><span class="muted" style="font:500 12px var(--f-mono);margin-left:auto">${res.length} hasil${TEKS ? '' : ' · teks resmi dimuat…'}</span></div>
    ${res.length ? res.slice(0, 60).map(({ d }) => d.type === 'pasal' ? resPasal(d, Q) : d.type === 'kasus' ? resKasus(d.c, Q) : resKatalog(d.c, Q)).join('') : `<div class="card muted">Tidak ada hasil untuk “${esc(q)}”. Coba kata lain, misalnya istilah di lapangan seperti “patok” atau nomor pasal.</div>`}</div>`;
}

// Belajar: daftar peraturan
function regProgress(reg) { const l = pasalList(reg); const n = l.filter(e => isRead(reg.id, e.key)).length; return { n, total: l.length }; }
function vBelajar() {
  const jal = JALUR.map(([t, l]) => {
    const done = l.filter(([r, k]) => isRead(r, k)).length;
    return `<details class="card" ${done < l.length && !vBelajar.opened ? (vBelajar.opened = 'open') : ''}><summary style="cursor:pointer;display:flex;gap:10px;align-items:center"><b style="font-family:var(--f-display)">${esc(t)}</b><span class="muted" style="margin-left:auto;font:500 12px var(--f-mono)">${done}/${l.length}</span></summary>
      <div class="plist" style="margin-top:10px">${l.map(([r, k]) => { const reg = D.byId[r]; const e = reg && pasalList(reg).find(e => e.key === k); if (!e) return ''; return `<a class="prow" href="${href(r, k)}"><span class="n">${esc(k)}</span><span class="t">${esc(summaryOf(e).text)}<small>${esc(reg.name)}</small></span><span class="ck">${isRead(r, k) ? '✓' : ''}</span></a>`; }).join('')}</div></details>`;
  }).join('');
  vBelajar.opened = null;
  const groups = BELAJAR_GROUPS.map(([t, f]) => {
    const regs = D.regs.filter(r => (r.tab || r.teks) && f(r) && (D.items[r.id]?.length || r.teks));
    if (!regs.length) return '';
    return `<div class="sec"><h2>${esc(t)}</h2><div class="reglist">${regs.map(r => { const p = regProgress(r); return `<a class="card regcard" href="${href(r.id)}"><div class="row">${jenisTag(r)}${r.dead ? '<span class="pill p-bad">Dicabut</span>' : ''}${r.extra ? '<span class="pill p-neutral">Baru di Sheet</span>' : ''}</div><span class="nm">${esc(r.name)}</span><span class="ab">${esc(r.tentang)}</span><div class="bar"><i style="width:${p.total ? Math.round(p.n / p.total * 100) : 0}%"></i></div><span class="muted" style="font:500 12px var(--f-mono)">${p.n}/${p.total} pasal dipahami</span></a>`; }).join('')}</div></div>`;
  }).join('');
  $('#main').innerHTML = `<div class="stack"><h1>Belajar</h1><p class="muted" style="margin:0">Pilih peraturan untuk melihat ringkasan tiap pasal. Ketuk pasal untuk membaca teks lengkapnya. Tandai “Saya paham” agar kemajuan Anda tercatat.</p>
    <div class="sec"><h2>Jalur Survei &amp; Pemetaan</h2>${jal}</div>${groups}</div>`;
}

// Halaman satu peraturan
function vReg(rid) {
  const reg = D.byId[rid]; if (!reg) return vNotFound();
  if (!reg.tab && !reg.teks) return vCatNode(reg);
  const list = pasalList(reg), p = regProgress(reg), parent = reg.parent && D.byId[reg.parent];
  const kids = D.regs.filter(r => r.parent === rid);
  const T = teksOf(reg);
  let body = '', curBab = null, open = false;
  const rowsHTML = list.map(e => { const s = summaryOf(e); return `<a class="prow" href="${href(rid, e.key)}"><span class="n">${esc(/^\d/.test(e.key) ? e.key : e.label)}</span><span class="t">${esc(s.text)}${s.mismatch ? '<small style="color:var(--warn)">Ringkasan di Sheet tidak cocok dengan teks resmi</small>' : s.auto ? '<small>Ringkasan otomatis dari teks resmi</small>' : ''}</span><span class="ck">${isRead(rid, e.key) ? '✓' : ''}</span></a>`; });
  if (T && list.some(e => e.t?.bab)) {
    list.forEach((e, i) => { const bab = e.t?.bab || (e.extra ? 'Lainnya di Sheet' : curBab); if (bab !== curBab) { if (open) body += '</div></details>'; body += `<details class="bab" open><summary>${esc(bab || 'Ketentuan')}</summary><div class="plist">`; open = true; curBab = bab; } body += rowsHTML[i]; });
    if (open) body += '</div></details>';
  } else body = `<div class="plist">${rowsHTML.join('')}</div>`;
  $('#main').innerHTML = `<div class="stack">
    <div class="crumb"><a href="#/belajar">Belajar</a><span class="muted">/</span><span>${esc(reg.name)}</span></div>
    <div class="row">${jenisTag(reg)}${reg.dead ? '<span class="pill p-bad">Dicabut</span>' : ''}</div>
    <h1>${esc(reg.name)}</h1><p style="margin:0;font-size:17px">${esc(reg.tentang)}</p>
    <div class="card stack" style="gap:6px">
      ${parent ? `<div>Dasar hukum di atasnya: <a href="${href(parent.id)}">${esc(parent.name)}</a>${reg.via ? ` <span class="muted">(${esc(reg.via)})</span>` : ''}</div>` : ''}
      ${kids.length ? `<div>Peraturan pelaksananya: ${kids.map(k => `<a href="${href(k.id)}">${esc(k.name)}</a>`).join(', ')}</div>` : ''}
      <div class="row"><a class="btn" href="#/hierarki?fokus=${rid}">Lihat di hierarki</a>${reg.pdf ? `<a class="btn" href="${esc(reg.pdf)}" target="_blank" rel="noopener">PDF resmi ↗</a>` : ''}<a class="btn" href="#/latihan?r=${rid}">Latihan soal</a></div>
      <div><div class="bar"><i style="width:${p.total ? Math.round(p.n / p.total * 100) : 0}%"></i></div><span class="muted" style="font:500 12px var(--f-mono)">${p.n}/${p.total} pasal dipahami</span></div>
    </div>
    ${reg.dead ? '<div class="warnbox">Peraturan ini sudah dicabut. Dipelajari sebagai riwayat; cek penggantinya di Katalog.</div>' : ''}
    ${reg.id === 'uu5-1999' ? '<div class="warnbox">UU 5/1999 adalah UU Larangan Praktik Monopoli, bukan peraturan pertanahan. Kemungkinan tab ini tertukar dengan UU 5/1960 (UUPA).</div>' : ''}
    ${T && T.umum ? `<details class="card"><summary style="cursor:pointer;font-weight:700">Penjelasan umum (resmi)</summary><p class="teks" style="margin-top:8px">${esc(T.umum)}</p></details>` : ''}
    ${!T && !reg.teksAlt ? '<div class="lead">Teks lengkap peraturan ini belum ada di aplikasi. Ringkasan di bawah dari Sheet; buka PDF resmi untuk teks lengkap.</div>' : ''}
    ${reg.teksAlt ? '<div class="lead">Teks asli PMNA 3/1997 belum tersedia. Untuk pasal yang diubah, aplikasi menampilkan teks setelah perubahan (Permen 7/2019 atau Permen 16/2021).</div>' : ''}
    <h2 style="margin-top:8px">Pasal demi pasal <span class="muted" style="font:500 13px var(--f-mono)">${list.length}</span></h2>${body}</div>`;
}
function fmtTeks(t) {
  return esc(t).split('\n').map(l => /^\(\d+[a-z]?\)/.test(l) ? `<span class="ay">${l}</span>` : /^([a-z]\.|\d+[.)]|[a-z]\))\s/.test(l) ? `<span class="hf">${l}</span>` : `<span class="ay" style="padding-left:0;text-indent:0">${l}</span>`).join('');
}
// Halaman satu pasal
function vPasal(rid, key) {
  const reg = D.byId[rid]; if (!reg) return vNotFound();
  const list = pasalList(reg), i = list.findIndex(e => e.key === key); if (i < 0) return vNotFound();
  const e = list[i], s = summaryOf(e), t = e.t || (reg.teksAlt ? teksFor(reg, key) : null), prev = list[i - 1], next = list[i + 1];
  const rel = D.cases.filter(c => { const p = norm(c.pasal + ' ' + c.dasar); const rn = norm(reg.name).split(' ')[0] + ' ' + norm(reg.nomor); return p.includes(norm(reg.nomor)) && new RegExp(`\\b(ps|pasal)\\s*${key.toLowerCase()}\\b`).test(p); });
  const read = isRead(rid, key);
  $('#main').innerHTML = `<div class="stack">
    <div class="crumb"><a href="#/belajar">Belajar</a><span class="muted">/</span><a href="${href(rid)}">${esc(reg.name)}</a><span class="muted">/</span><span>${esc(e.label)}</span></div>
    ${t?.bab ? `<div class="eyebrow">${esc(t.bab)}${t.bagian ? ' · ' + esc(t.bagian) : ''}</div>` : ''}
    <h1>${esc(reg.name)} · ${esc(/^\d/.test(e.key) ? 'Pasal ' + e.key : e.label)}</h1>
    <div class="card stack" style="gap:6px;border-left:4px solid var(--accent)"><div class="eyebrow" style="color:var(--accent)">Ringkasan</div>
      <p style="margin:0;font-size:17px">${esc(s.text)}</p>
      ${s.mismatch ? `<div class="warnbox">Ringkasan di Sheet untuk pasal ini tidak cocok dengan teks resmi, jadi yang ditampilkan adalah kutipan teks resmi. Isi di Sheet: “${esc(s.sheet)}”</div>` : ''}
      ${s.auto ? '<p class="muted" style="margin:0;font-size:13px">Ringkasan diambil otomatis dari kalimat awal teks resmi.</p>' : ''}
      ${e.row?.jelas ? `<p style="margin:0" class="muted">${esc(e.row.jelas)}</p>` : ''}
      ${e.row?.status || e.row?.dasar ? `<div class="row">${statusPill(e.row.status)}<span class="muted" style="font-size:14px">${esc(e.row.dasar && e.row.dasar !== '–' ? e.row.dasar : '')}</span></div>` : ''}
    </div>
    ${t ? `<div class="card"><div class="eyebrow">Teks resmi${t.src && t.src !== reg.teks ? ' setelah perubahan (' + esc(D.regs.find(r => r.teks === t.src)?.name || t.src) + ')' : ''}</div><div class="teks" style="margin-top:8px">${fmtTeks(t.text)}</div></div>
      ${t.pen && !/^cukup jelas\.?$/i.test(t.pen) ? `<details class="card" open><summary style="cursor:pointer;font-weight:700">Penjelasan resmi pasal ini</summary><div class="teks" style="margin-top:8px">${fmtTeks(t.pen)}</div></details>` : t.pen ? '<p class="muted" style="margin:0">Penjelasan resmi: cukup jelas.</p>' : ''}`
      : `<div class="lead">Teks lengkap pasal ini belum tersedia di aplikasi.${reg.pdf ? ` <a href="${esc(reg.pdf)}" target="_blank" rel="noopener">Buka PDF resmi ↗</a>` : ''}</div>`}
    ${rel.length ? `<div class="sec"><h2>Kasus lapangan terkait</h2>${rel.slice(0, 4).map(c => resKasus(c, null)).join('')}</div>` : ''}
    <div class="row"><button class="btn ${read ? 'ok' : 'pri'}" id="readbtn" data-rid="${rid}" data-key="${esc(key)}">${read ? '✓ Sudah paham' : 'Saya paham pasal ini'}</button><button class="btn" data-copy="${esc(`${reg.name} ${e.label}: ${s.text}`)}">Salin kutipan</button></div>
    <div class="navpn"><a class="btn" ${prev ? `href="${href(rid, prev.key)}"` : 'disabled'}>← ${esc(prev ? prev.label : 'Awal')}</a><a class="btn" ${next ? `href="${href(rid, next.key)}"` : 'disabled'}>${esc(next ? next.label : 'Akhir')} →</a></div></div>`;
  window.scrollTo(0, 0);
}
function vCatNode(reg) {
  const c = D.cat.find(c => norm(c.nomor).startsWith(norm(reg.nomor).split(' ')[0]) && norm(c.jenis).includes(norm(reg.jenis).split(' ')[0].toLowerCase().slice(0, 4)));
  $('#main').innerHTML = `<div class="stack"><div class="crumb"><a href="#/hierarki">Hierarki</a><span class="muted">/</span><span>${esc(reg.name)}</span></div>
    <div class="row">${jenisTag(reg)}</div><h1>${esc(reg.name)}</h1><p style="margin:0;font-size:17px">${esc(reg.tentang)}</p>
    ${reg.info ? `<div class="card">${esc(reg.info)}</div>` : ''}
    ${c ? `<div class="card stack" style="gap:6px"><div class="row">${statusPill(c.status)}<span class="muted">${esc(c.bidang)}</span></div><p style="margin:0">${esc(c.poin)}</p></div>` : ''}
    <div class="lead">Ringkasan pasal untuk peraturan ini belum ada di Sheet. Tambahkan tab baru di Sheet dan daftarkan di DAFTAR PERATURAN, maka akan muncul di menu Belajar.</div>
    ${D.regs.filter(r => r.parent === reg.id).length ? `<div class="card">Peraturan pelaksananya: ${D.regs.filter(r => r.parent === reg.id).map(k => `<a href="${href(k.id)}">${esc(k.name)}</a>`).join(', ')}</div>` : ''}</div>`;
}

// Hierarki: diagram alir
function vHierarki(params) {
  const fokus = params.get('fokus');
  const node = r => `<a class="node ${r.cat ? 'cat' : ''} ${r.dead ? 'dead' : ''}" style="${lc(r)}${r.id === fokus ? ';box-shadow:0 0 0 4px var(--accent-soft)' : ''}" href="${href(r.id)}" id="n-${r.id}"><span class="jenis" style="${lc(r)}">${esc(r.jenis)}</span><b>${esc(r.name)}</b><small>${esc(r.tentang)}</small>${r.via ? `<span class="via">↑ ${esc(r.via)}</span>` : ''}</a>`;
  const tree = id => { const kids = D.regs.filter(r => r.parent === id); return kids.length ? `<ul>${kids.map(k => `<li>${node(k)}${tree(k.id)}</li>`).join('')}</ul>` : ''; };
  const root = D.byId.uud;
  const z = store.get('srp-zoom', 0.85);
  const mode = params.get('mode') || (innerWidth < 700 ? 'alir' : 'bagan');
  const flow = id => { const kids = D.regs.filter(r => r.parent === id); return kids.length ? `<ul>${kids.map(k => `<li>${node(k)}${flow(k.id)}</li>`).join('')}</ul>` : ''; };
  const chart = mode === 'alir'
    ? `<div class="flow"><ul style="border:0;margin:0;padding:0"><li style="padding:0">${node(root)}${flow('uud')}</li></ul></div>`
    : `<div class="row"><span class="muted" style="font-size:14px">Ukuran</span><input type="range" id="zoom" min="0.45" max="1.1" step="0.05" value="${z}" aria-label="Ukuran diagram" style="flex:1;max-width:240px"></div>
    <div class="chartwrap" id="chartwrap"><div class="tree" id="tree" style="transform:scale(${z});width:max-content"><ul><li>${node(root)}${tree('uud')}</li></ul></div></div>`;
  const levels = [['1', 'UUD NRI 1945', 'Sumber hak menguasai negara (Ps 33 ayat 3).'], ['2', 'Ketetapan MPR', 'TAP MPR IX/MPR/2001: arah pembaruan agraria.'], ['3', 'Undang-Undang / Perppu', 'UUPA sebagai induk; UU sektoral mengatur hal khusus.'], ['4', 'Peraturan Pemerintah', 'PP 24/1997 dan PP 18/2021 pegangan utama Survei & Pemetaan.'], ['5', 'Peraturan Presiden', 'Kelembagaan dan program nasional (Kebijakan Satu Peta, Reforma Agraria).'], ['6–7', 'Perda Provinsi / Kab-Kota', 'RTRW, RDTR: dipakai saat telaah spasial.'], ['8', 'Peraturan Menteri ATR/BPN', 'Aturan teknis sehari-hari di Kantah/Kanwil (diakui Ps 8 UU 12/2011).'], ['9–10', 'Keputusan, Juknis, Surat Edaran', 'Petunjuk pelaksanaan; tidak boleh menambah norma di atasnya.']];
  $('#main').innerHTML = `<div class="stack"><h1>Hierarki peraturan</h1>
    <p class="muted" style="margin:0">Dibaca dari atas ke bawah. Garis menunjukkan peraturan mana yang menjadi dasar peraturan di bawahnya. Ketuk kotak untuk membuka peraturannya.</p>
    <div class="legend">${[['UUD', 'uud'], ['UU', 'uu'], ['PP', 'pp'], ['Perpres/BIG', 'perpres'], ['Permen', 'permen'], ['Juknis/SE', 'juknis']].map(([l, k]) => `<span><i style="--lc:var(--l-${k})"></i>${l}</span>`).join('')}<span><i style="--lc:transparent;border:2px dashed var(--muted)"></i>belum ada ringkasan pasal</span></div>
    <div class="chips"><a class="chip" style="text-decoration:none" href="#/hierarki?mode=alir${fokus ? '&fokus=' + fokus : ''}" aria-pressed="${mode === 'alir'}">Diagram alir (menurun)</a><a class="chip" style="text-decoration:none" href="#/hierarki?mode=bagan${fokus ? '&fokus=' + fokus : ''}" aria-pressed="${mode === 'bagan'}">Bagan lebar</a></div>
    ${chart}
    <div class="card"><b>Asas bila aturan bertentangan:</b> <i>lex superior</i> (yang lebih tinggi menang), <i>lex specialis</i> (yang khusus menang), <i>lex posterior</i> (yang lebih baru menang).</div>
    <div class="sec"><h2>Tingkatan menurut UU 12/2011</h2><div class="levels">${levels.map(([n, t, d]) => `<div class="lvl"><div class="no">${n}</div><div><h3>${t}</h3><div class="muted" style="font-size:14.5px">${d}</div></div></div>`).join('')}</div></div>
    ${D.regs.some(r => r.dead) ? `<div class="sec"><h2>Sudah dicabut</h2><div class="row">${D.regs.filter(r => r.dead).map(r => `<a class="node dead" style="${lc(r)}" href="${href(r.id)}"><span class="jenis" style="${lc(r)}">${esc(r.jenis)}</span><b>${esc(r.name)}</b><small>${esc(r.tentang)}</small></a>`).join('')}</div></div>` : ''}</div>`;
  if (mode === 'bagan') { fitTree(); const w = $('#chartwrap'); w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2; }
  if (fokus) setTimeout(() => $('#n-' + fokus)?.scrollIntoView({ block: 'center', inline: 'center' }), 50);
}
function fitTree() { const t = $('#tree'), w = $('#chartwrap'); if (!t || !w) return; const z = +$('#zoom').value; t.style.transform = `scale(${z})`; t.parentElement.style.height = ''; w.style.height = (t.scrollHeight * z + 34) + 'px'; t.style.marginRight = -(t.scrollWidth * (1 - z)) + 'px'; }

// Latihan soal
let QUIZ = null;
function quizPool(reg) {
  return pasalList(reg).map(e => ({ e, s: summaryOf(e) })).filter(x => x.s.text.length >= 35 && !/^(ketentuan umum|definisi|ketentuan peralihan|mulai berlaku|ketentuan lebih lanjut)/i.test(x.s.text) && !/^\(perlu dicek\)/i.test(x.s.text));
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function newQuiz(rid) {
  const regs = rid ? [D.byId[rid]] : D.regs.filter(r => r.key);
  const qs = [];
  for (let n = 0; n < 10; n++) {
    const reg = regs[n % regs.length], pool = quizPool(reg); if (pool.length < 4) continue;
    const pick = shuffle(pool).slice(0, 4), ans = pick[0], type = Math.random() < 0.5 ? 'isi' : 'nomor';
    qs.push({ reg, type, ans, opts: shuffle(pick) });
  }
  QUIZ = { rid, qs: shuffle(qs), i: 0, score: 0, answered: null };
}
function vLatihan(params) {
  const rid = params.get('r') || '';
  if (!QUIZ || QUIZ.rid !== (rid || undefined) && QUIZ.rid !== rid) newQuiz(rid || undefined);
  const opts = D.regs.filter(r => quizPool(r).length >= 4);
  const head = `<div class="row"><h1 style="margin-right:auto">Latihan</h1><select id="qreg" aria-label="Pilih peraturan"><option value="">Campuran pasal kunci</option>${opts.map(r => `<option value="${r.id}" ${r.id === rid ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>`;
  if (!QUIZ.qs.length) { $('#main').innerHTML = `<div class="stack">${head}<div class="card muted">Belum cukup pasal untuk membuat soal.</div></div>`; return; }
  if (QUIZ.i >= QUIZ.qs.length) {
    const pct = Math.round(QUIZ.score / QUIZ.qs.length * 100);
    $('#main').innerHTML = `<div class="stack">${head}<div class="card stack" style="align-items:flex-start"><div class="score">${QUIZ.score}/${QUIZ.qs.length}</div><p style="margin:0">${pct >= 80 ? 'Bagus. Anda sudah menguasai pasal-pasal ini.' : pct >= 50 ? 'Lumayan. Baca ulang pasal yang salah, lalu coba lagi.' : 'Pelajari dulu pasal-pasalnya di menu Belajar, lalu coba lagi.'}</p><button class="btn pri" id="qagain">Main lagi</button></div></div>`;
    return;
  }
  const q = QUIZ.qs[QUIZ.i], label = e => /^\d/.test(e.key) ? 'Pasal ' + e.key : e.label;
  const prompt = q.type === 'isi' ? `Apa isi <b>${esc(q.reg.name)} ${esc(label(q.ans.e))}</b>?` : `Ketentuan ini ada di pasal berapa dalam <b>${esc(q.reg.name)}</b>?<blockquote style="margin:10px 0 0;padding-left:12px;border-left:3px solid var(--accent)">${esc(q.ans.s.text)}</blockquote>`;
  const a = QUIZ.answered;
  $('#main').innerHTML = `<div class="stack">${head}<div class="muted" style="font:500 12px var(--f-mono)">Soal ${QUIZ.i + 1} dari ${QUIZ.qs.length} · skor ${QUIZ.score}</div>
    <div class="card" style="font-size:17px">${prompt}</div>
    <div class="stack">${q.opts.map((o, k) => { const cls = a == null ? '' : o === q.ans ? 'right' : k === a ? 'wrong' : ''; return `<button class="opt ${cls}" data-opt="${k}" ${a != null ? 'disabled' : ''}>${esc(q.type === 'isi' ? o.s.text : label(o.e))}</button>`; }).join('')}</div>
    ${a != null ? `<div class="row"><a class="btn" href="${href(q.reg.id, q.ans.e.key)}">Baca ${esc(label(q.ans.e))}</a><button class="btn pri" id="qnext">Lanjut →</button></div>` : ''}</div>`;
}

// Lainnya
function vLain() {
  $('#main').innerHTML = `<div class="stack"><h1>Lainnya</h1>
    <a class="card" href="#/kasus" style="text-decoration:none;color:inherit"><h2>Kasus lapangan</h2><p class="muted" style="margin:4px 0 0">${D.cases.length} kasus survei dan pemetaan beserta dasar hukum dan langkah penanganannya.</p></a>
    <a class="card" href="#/katalog" style="text-decoration:none;color:inherit"><h2>Katalog peraturan</h2><p class="muted" style="margin:4px 0 0">${D.cat.length} peraturan: status berlaku/dicabut dan pasal kuncinya.</p></a>
    <a class="card" href="#/koreksi" style="text-decoration:none;color:inherit"><h2>Catatan koreksi</h2><p class="muted" style="margin:4px 0 0">Isi Sheet yang sudah diperbaiki beserta isi lamanya.</p></a>
    <div class="card stack" style="gap:8px"><h2>Data &amp; pembaruan</h2>
      <p style="margin:0">Ringkasan, kasus, dan katalog diambil langsung dari <a href="${SHEET_URL}" target="_blank" rel="noopener">Google Sheet Ringkasan UUPA</a> setiap aplikasi dibuka saat online. Ubah isi Sheet, lalu ketuk Perbarui. Tab peraturan baru yang didaftarkan di DAFTAR PERATURAN otomatis muncul di menu Belajar.</p>
      <p style="margin:0" class="muted">Sumber saat ini: ${SYNC.source === 'live' ? 'Sheet (langsung)' : SYNC.source === 'cache' ? 'data tersimpan di HP' : 'data bawaan aplikasi'}${SYNC.at ? ', ' + new Date(SYNC.at).toLocaleString('id-ID') : ''}. Teks resmi pasal diambil dari PDF peraturan.go.id.</p>
      <div class="row"><button class="btn pri" id="resync">Perbarui dari Sheet</button><button class="btn" id="resetread">Hapus tanda “paham”</button></div></div>
    <div class="card"><h2>Pasang di HP</h2><p style="margin:4px 0 0">Buka halaman ini di Chrome Android, ketuk menu ⋮ lalu <b>Instal aplikasi</b> (atau <b>Tambahkan ke layar utama</b>). Setelah terpasang, aplikasi tetap bisa dibuka tanpa internet.</p></div></div>`;
}
function vKasus(params) {
  const k = params.get('k') || ''; const kats = [...new Set(D.cases.map(c => c.kat))];
  $('#main').innerHTML = `<div class="stack"><div class="crumb"><a href="#/lain">Lainnya</a><span class="muted">/</span><span>Kasus lapangan</span></div><h1>Kasus lapangan</h1>
    <div class="chips">${['', ...kats].map(x => `<a class="chip" href="#/kasus${x ? '?k=' + encodeURIComponent(x) : ''}" aria-pressed="${x === k}" style="text-decoration:none">${esc(x || 'Semua')}</a>`).join('')}</div>
    ${D.cases.filter(c => !k || c.kat === k).map(c => resKasus(c, null)).join('')}</div>`;
}
function vKatalog(params) {
  const f = params.get('f') || '';
  const m = c => !f || (f === 'dicabut' ? /dicabut/i.test(c.status) : f === 'survei' ? /survei/i.test(c.bidang) : !/dicabut/i.test(c.status));
  const rows = D.cat.filter(m);
  $('#main').innerHTML = `<div class="stack"><div class="crumb"><a href="#/lain">Lainnya</a><span class="muted">/</span><span>Katalog</span></div><h1>Katalog peraturan</h1>
    <div class="chips">${[['', 'Semua'], ['berlaku', 'Masih berlaku'], ['survei', 'Survei & Pemetaan'], ['dicabut', 'Sudah dicabut']].map(([k, l]) => `<a class="chip" style="text-decoration:none" href="#/katalog${k ? '?f=' + k : ''}" aria-pressed="${k === f}">${l}</a>`).join('')}</div>
    <div class="tbl"><table><thead><tr><th>Jenis / Nomor</th><th>Tentang</th><th>Status</th><th>Pasal kunci</th></tr></thead><tbody>${rows.map(c => `<tr><td style="font:700 13px var(--f-mono);white-space:nowrap">${esc(c.jenis)}<br>${esc(c.nomor)}</td><td>${esc(c.tentang)}<br><small class="muted">${esc(c.bidang)}</small></td><td>${statusPill(c.status)}</td><td>${esc(c.poin)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function vKoreksi() {
  $('#main').innerHTML = `<div class="stack"><div class="crumb"><a href="#/lain">Lainnya</a><span class="muted">/</span><span>Catatan koreksi</span></div><h1>Catatan koreksi</h1>
    <p class="muted" style="margin:0">Dari tab LOG KOREKSI di Sheet.</p>
    ${D.log.length ? D.log.map(l => `<div class="card stack" style="gap:4px"><div class="row"><span class="reg">${esc(l.tab)}</span><b style="font-family:var(--f-mono)">${esc(l.pasal)}</b><span class="muted">${esc(l.kolom)}</span>${statusPill(l.yakin === 'Yakin' ? 'Yakin' : 'Cek teks resmi')}</div>${l.lama ? `<div class="muted" style="text-decoration:line-through">${esc(l.lama)}</div>` : ''}<div>${esc(l.baru)}</div>${l.alasan ? `<div class="muted" style="font-size:14px">${esc(l.alasan)}</div>` : ''}</div>`).join('') : '<div class="card muted">Belum ada catatan.</div>'}</div>`;
}
function vNotFound() { $('#main').innerHTML = '<div class="card">Halaman tidak ditemukan. <a href="#/">Kembali ke beranda</a></div>'; }

// ---------- router ----------
function route() {
  if (!D) return;
  const h = location.hash.slice(1) || '/'; const [path, qs] = h.split('?'); const params = new URLSearchParams(qs || ''); const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const top = seg[0] || '';
  tabbar({ '': 'cari', belajar: 'belajar', r: 'belajar', hierarki: 'hierarki', latihan: 'latihan', lain: 'lain', kasus: 'lain', katalog: 'lain', koreksi: 'lain' }[top] || 'cari');
  if (top !== '' && $('#q').value) { $('#q').value = ''; $('#clear').hidden = true; }
  if (top === '') vCari();
  else if (top === 'belajar') vBelajar();
  else if (top === 'r') seg[2] != null ? vPasal(seg[1], seg[2]) : vReg(seg[1]);
  else if (top === 'hierarki') vHierarki(params);
  else if (top === 'latihan') vLatihan(params);
  else if (top === 'lain') vLain();
  else if (top === 'kasus') vKasus(params);
  else if (top === 'katalog') vKatalog(params);
  else if (top === 'koreksi') vKoreksi();
  else vNotFound();
  if (top !== 'r' || seg[2] == null) window.scrollTo(0, 0);
}

// ---------- events ----------
let deb;
$('#q').addEventListener('input', () => { $('#clear').hidden = !$('#q').value; clearTimeout(deb); deb = setTimeout(() => { if (location.hash && location.hash !== '#/') { history.replaceState(null, '', '#/'); tabbar('cari'); } vCari(); }, 100); });
$('#clear').addEventListener('click', () => { $('#q').value = ''; $('#clear').hidden = true; $('#q').focus(); vCari(); });
$('#sync').addEventListener('click', () => syncSheet(true));
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.q) { $('#q').value = b.dataset.q; $('#clear').hidden = false; return vCari(); }
  if (b.dataset.type) { FTYPE = b.dataset.type; return vCari(); }
  if (b.id === 'readbtn') { toggleRead(b.dataset.rid, b.dataset.key); const r = isRead(b.dataset.rid, b.dataset.key); b.className = 'btn ' + (r ? 'ok' : 'pri'); b.textContent = r ? '✓ Sudah paham' : 'Saya paham pasal ini'; if (r) toast('Tercatat. Lanjut ke pasal berikutnya.'); return; }
  if (b.dataset.copy) { try { await navigator.clipboard.writeText(b.dataset.copy); toast('Kutipan disalin'); } catch { toast('Tidak bisa menyalin'); } return; }
  if (b.dataset.opt != null && QUIZ && QUIZ.answered == null) { const q = QUIZ.qs[QUIZ.i]; QUIZ.answered = +b.dataset.opt; if (q.opts[QUIZ.answered] === q.ans) QUIZ.score++; return vLatihan(new URLSearchParams(location.hash.split('?')[1] || '')); }
  if (b.id === 'qnext') { QUIZ.i++; QUIZ.answered = null; return vLatihan(new URLSearchParams(location.hash.split('?')[1] || '')); }
  if (b.id === 'qagain') { QUIZ = null; return vLatihan(new URLSearchParams(location.hash.split('?')[1] || '')); }
  if (b.id === 'resync') return syncSheet(true);
  if (b.id === 'resetread') { READ.clear(); store.set(READ_KEY, []); toast('Tanda “paham” dihapus'); return; }
});
document.addEventListener('change', e => { if (e.target.id === 'qreg') { QUIZ = null; location.hash = '#/latihan' + (e.target.value ? '?r=' + e.target.value : ''); } });
document.addEventListener('input', e => { if (e.target.id === 'zoom') { store.set('srp-zoom', +e.target.value); fitTree(); } });
window.addEventListener('hashchange', route);
window.addEventListener('online', () => syncSheet(false));

(async function start() {
  try { await loadSnapshot(); } catch { RAW = {}; }
  derive(); route();
  loadTeks().then(() => { buildIndex(); route(); });
  syncSheet(false);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
