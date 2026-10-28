/* =====================================================
   aspirasi.js : admin aspirasi (hanya melihat)
   Kolom: nomor, waktu dikirim, nama, isi aspirasi.
   Data lewat API.ambilAspirasi() di api.js.
   ===================================================== */
const toast = document.getElementById('toast');
const badan = document.getElementById('badan');
const galat = document.getElementById('galat');
const cari = document.getElementById('cari');
let semua = [];

function tampilkanToast(teks) {
  toast.textContent = teks;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

if (MODE_DEMO_ASPIRASI) document.getElementById('demoBanner').hidden = false;

document.getElementById('keluarBtn').addEventListener('click', () => {
  API.keluar();
  location.href = 'login.html';
});

const formatWaktu = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
};

function tampil() {
  const kata = cari.value.trim().toLowerCase();
  const data = semua.filter(a => !kata || (a.nama + ' ' + a.pesan).toLowerCase().includes(kata));
  document.getElementById('jumlah').textContent = kata ? `(${data.length} dari ${semua.length})` : `(${semua.length})`;
  badan.innerHTML = '';

  if (data.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'kosong';
    td.textContent = semua.length ? 'Tidak ada aspirasi yang cocok.' : 'Belum ada aspirasi masuk.';
    tr.appendChild(td);
    badan.appendChild(tr);
    return;
  }

  data.forEach((a, i) => {
    const tr = document.createElement('tr');
    const sel = (kelas, teks) => { const td = document.createElement('td'); td.className = kelas; td.textContent = teks; return td; }; // textContent: aman dari kode berbahaya
    const nama = sel('nama', a.nama || 'Anonim');
    if (!a.nama || a.nama === 'Anonim') nama.classList.add('anonim');
    tr.append(sel('no', i + 1), sel('waktu', formatWaktu(a.waktu)), nama, sel('isi', a.pesan));
    badan.appendChild(tr);
  });
}

async function muat() {
  galat.textContent = '';
  try {
    semua = await API.ambilAspirasi();
    tampil();
  } catch (err) {
    galat.textContent = err.message;
  }
}

cari.addEventListener('input', tampil);
document.getElementById('segarkanBtn').addEventListener('click', async () => { await muat(); if (!galat.textContent) tampilkanToast('Data diperbarui.'); });

// Unduh CSV (bisa dibuka di Excel/Sheets). Awalan ' mencegah isi yang diawali = + - @ dibaca sebagai rumus.
document.getElementById('unduhBtn').addEventListener('click', () => {
  if (semua.length === 0) { tampilkanToast('Belum ada data untuk diunduh.'); return; }
  const aman = t => { t = String(t ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
  const baris = [['Waktu', 'Nama', 'Pesan'].map(aman).join(',')]
    .concat(semua.map(a => [formatWaktu(a.waktu), a.nama, a.pesan].map(aman).join(',')));
  const blob = new Blob(['\ufeff' + baris.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aspirasi-${new Date().toLocaleDateString('sv-SE')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

muat();
