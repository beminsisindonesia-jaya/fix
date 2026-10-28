/* =====================================================
   apps-script.gs : penyimpanan aspirasi di Google Spreadsheet
   Cara pasang (sekali saja):
   1. Buat Google Spreadsheet baru (misal "Aspirasi BEM INSIS").
   2. Menu Ekstensi > Apps Script. Hapus isi bawaan, tempel seluruh kode ini.
   3. Ikon roda gigi (Setelan Proyek) > Properti skrip > Tambah properti:
        nama  : SANDI_ASPIRASI
        nilai : kata sandi admin aspirasi (pilih yang kuat, JANGAN "aspirasi123")
   4. Deploy > Deployment baru > jenis "Aplikasi web":
        Jalankan sebagai : Saya
        Yang memiliki akses : Siapa saja
      Salin URL yang berakhiran /exec, tempel ke URL_ASPIRASI di api.js.
   5. Setiap kali kode ini diubah: Deploy > Kelola deployment > Edit > Versi baru.
   Admin juga bisa membuka Spreadsheet-nya langsung kapan saja.
   ===================================================== */
const NAMA_SHEET = 'Aspirasi';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NAMA_SHEET);
    sh.appendRow(['Waktu', 'Nama', 'Pesan']);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/mm/yyyy HH:mm:ss');
  }
  return sh;
}

function sandiBenar_(sandi) {
  const asli = PropertiesService.getScriptProperties().getProperty('SANDI_ASPIRASI');
  return Boolean(asli) && typeof sandi === 'string' && sandi === asli;
}

// Mencegah isi yang diawali = + - @ dijalankan sebagai rumus di Spreadsheet
function aman_(t) {
  t = String(t || '');
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function doPost(e) {
  let hasil;
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.aksi === 'kirim') hasil = kirim_(d);
    else if (d.aksi === 'cek') hasil = { ok: sandiBenar_(d.sandi) };
    else if (d.aksi === 'daftar') hasil = daftar_(d);
    else hasil = { ok: false, galat: 'Permintaan tidak dikenal.' };
  } catch (err) {
    hasil = { ok: false, galat: 'Permintaan tidak valid.' };
  }
  return ContentService.createTextOutput(JSON.stringify(hasil)).setMimeType(ContentService.MimeType.JSON);
}

function kirim_(d) {
  const pesan = String(d.pesan || '').trim();
  const nama = String(d.nama || '').trim().slice(0, 80) || 'Anonim';
  if (pesan.length < 10 || pesan.length > 500) return { ok: false, galat: 'Pesan harus 10 sampai 500 karakter.' };
  const kunci = LockService.getScriptLock();
  kunci.waitLock(10000);               // cegah dua kiriman bersamaan saling menimpa
  try {
    // Batas laju seluruh situs: maksimal 30 aspirasi per 10 menit (melindungi Spreadsheet dari spam)
    const cache = CacheService.getScriptCache();
    const jumlah = Number(cache.get('hitung')) || 0;
    if (jumlah >= 30) return { ok: false, galat: 'Terlalu banyak kiriman saat ini. Coba lagi beberapa menit lagi.' };
    cache.put('hitung', String(jumlah + 1), 600);
    sheet_().appendRow([new Date(), aman_(nama), aman_(pesan)]);
  } finally {
    kunci.releaseLock();
  }
  return { ok: true };
}

function daftar_(d) {
  if (!sandiBenar_(d.sandi)) return { ok: false, galat: 'Kata sandi salah.' };
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return { ok: true, data: [] };
  const data = sh.getRange(2, 1, n, 3).getValues().map(b => ({
    waktu: b[0] instanceof Date ? b[0].toISOString() : String(b[0]),
    nama: String(b[1]),
    pesan: String(b[2])
  }));
  return { ok: true, data };
}
