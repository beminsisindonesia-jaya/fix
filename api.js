/* =====================================================
   api.js : PUSAT DATA
   Semua halaman (situs publik & admin) mengambil/menyimpan
   data lewat file ini, yang berbicara dengan server di folder api/
   (api/index.php). Nama fungsi dan bentuk data jangan diubah,
   maka halaman lain tidak perlu disentuh.
   ===================================================== */

const ALAMAT_API = 'api/index.php';
const KUNCI_LOGIN = 'inspire_admin';
const KUNCI_SANDI_ASPIRASI = 'inspire_sandi_aspirasi';

// OPSIONAL: alamat Web App Google Apps Script bila aspirasi ingin disimpan di Google Spreadsheet.
// Biarkan KOSONG agar aspirasi disimpan di server situs ini dan dilihat lewat halaman admin aspirasi.
const URL_ASPIRASI = '';

// Pengelompokan kegiatan di halaman "Seluruh dokumentasi".
// KATEGORI = jenis kegiatan (mudah dipahami pengunjung, stabil dari kabinet ke kabinet).
// Tambah, hapus, atau ganti nama di sini; halaman admin dan filter ikut berubah otomatis.
// (id jangan diganti kalau sudah ada data tersimpan dengan id itu.)
const KATEGORI = [
  { id: 'akademik',   nama: 'Akademik' },
  { id: 'keagamaan',  nama: 'Keagamaan' },
  { id: 'sosial',     nama: 'Pengabdian masyarakat' },
  { id: 'olahraga',   nama: 'Olahraga' },
  { id: 'seni',       nama: 'Seni dan budaya' },
  { id: 'organisasi', nama: 'Organisasi dan kepemimpinan' }
];

// Divisi penyelenggara (opsional, jadi filter kedua).
const DIVISI = ['Ibadah', 'Kesejahteraan Mahasiswa', 'Media dan Informasi', 'Pendidikan', 'Public Relation'];

function namaKategori(id) {
  const k = KATEGORI.find(x => x.id === id);
  return k ? k.nama : id;
}

// Bentuk satu data dokumentasi:
// { id, judul, tanggal: 'YYYY-MM-DD', kategori: id dari KATEGORI, divisi: nama divisi (boleh kosong),
//   rasio: lebar/tinggi foto, foto: 'alamat foto sampul', mini: 'alamat gambar kecil', album: 'tautan album Drive (boleh kosong)' }
// Satu data = satu KEGIATAN, dengan satu foto sampul. Foto lengkap ada di album Drive.

// Hanya tautan http/https yang dianggap aman (menolak "javascript:" dan sejenisnya)
function tautanAman(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

// Panggilan ke api/index.php. GET bila tanpa muatan, POST (JSON) bila ada muatan.
async function panggilServer(rute, muatan) {
  const opsi = muatan === undefined
    ? { credentials: 'same-origin' }
    : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, body: JSON.stringify(muatan) };
  let r;
  try {
    r = await fetch(`${ALAMAT_API}?r=${rute}`, opsi);
  } catch (err) {
    throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internetmu.');
  }
  let data = null;
  try { data = await r.json(); } catch (err) { /* bukan JSON */ }

  if (r.status === 401 && rute !== 'masuk') {                    // sesi berakhir: kembali ke halaman login
    sessionStorage.removeItem(KUNCI_LOGIN);
    sessionStorage.removeItem(KUNCI_SANDI_ASPIRASI);
    if (/\/(admin|aspirasi)(\.html)?$/.test(location.pathname)) location.replace('login.html');
    throw new Error('Sesi berakhir. Silakan masuk lagi.');
  }
  if (!r.ok) {
    const e = new Error((data && data.galat) || `Server bermasalah (kode ${r.status}). Coba lagi nanti.`);
    e.status = r.status;
    throw e;
  }
  if (data === null) throw new Error('Balasan server tidak dikenali. Pastikan folder "api" sudah ikut diunggah.');
  return data;
}

const API = {
  // ----- Dokumentasi ("Seluruh dokumentasi") -----
  async ambilSemua() { return panggilServer('dokumentasi'); },          // terbaru di atas
  async tambah(item) { await panggilServer('dokumentasi', item); },
  async hapus(id) { await panggilServer('dokumentasi_hapus', { id }); },

  // ----- Foto pilihan beranda (dua roll) -----
  async ambilFotoPilihan() { return panggilServer('pilihan'); },
  async tambahFotoPilihan(item) { await panggilServer('pilihan', item); },
  async hapusFotoPilihan(id) { await panggilServer('pilihan_hapus', { id }); },

  // ----- Aspirasi -----
  // Dikirim pengunjung dari beranda. Bentuk: { nama, pesan }.
  async kirimAspirasi({ nama, pesan }) {
    if (URL_ASPIRASI) {
      const res = await panggilServerAspirasi({ aksi: 'kirim', nama, pesan });
      if (!res.ok) throw new Error(res.galat || 'Aspirasi belum terkirim. Coba lagi.');
      return;
    }
    await panggilServer('aspirasi', { nama, pesan });
  },

  // Hanya untuk admin aspirasi. Mengembalikan [{ waktu (ISO), nama, pesan }], terbaru di atas.
  async ambilAspirasi() {
    let daftar;
    if (URL_ASPIRASI) {
      const res = await panggilServerAspirasi({ aksi: 'daftar', sandi: sessionStorage.getItem(KUNCI_SANDI_ASPIRASI) || '' });
      if (!res.ok) throw new Error(res.galat || 'Gagal memuat aspirasi.');
      daftar = res.data;
    } else {
      daftar = await panggilServer('aspirasi');
    }
    return daftar.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)));
  },

  // ----- Login admin -----
  // Dua peran: 'dokumentasi' dan 'aspirasi'. Kata sandi dicek di server (api/config.php), bukan di sini.
  async masuk(peran, sandi) {
    if (peran === 'aspirasi' && URL_ASPIRASI) {
      let res;
      try { res = await panggilServerAspirasi({ aksi: 'cek', sandi }); } catch (err) { return false; }
      if (!res.ok) return false;
    } else {
      try {
        const res = await panggilServer('masuk', { peran, sandi });
        if (!res.ok) return false;
      } catch (err) {
        if (err.status === 401) return false;                  // sandi salah
        throw err;                                             // masalah lain (server, sandi belum diganti, dll.)
      }
    }
    sessionStorage.setItem(KUNCI_LOGIN, peran);
    if (peran === 'aspirasi') sessionStorage.setItem(KUNCI_SANDI_ASPIRASI, sandi);
    return true;
  },
  async keluar() {
    sessionStorage.removeItem(KUNCI_LOGIN);
    sessionStorage.removeItem(KUNCI_SANDI_ASPIRASI);
    try { await panggilServer('keluar', {}); } catch (err) { /* abaikan */ }
  },
  // Memastikan sesi di server masih berlaku (dipanggil halaman admin). Bila tidak: kembali ke login.
  async cekSesi(peran) {
    if (peran === 'aspirasi' && URL_ASPIRASI) return true;
    try {
      const r = await panggilServer('sesi');
      if (r && r.peran === peran) return true;
    } catch (err) { /* anggap belum masuk */ }
    sessionStorage.removeItem(KUNCI_LOGIN);
    location.replace('login.html');
    return false;
  },
  peran() { return sessionStorage.getItem(KUNCI_LOGIN); },
  // sudahMasuk('aspirasi') = sudah masuk sebagai peran itu; sudahMasuk() = masuk sebagai peran apa pun
  sudahMasuk(peran) {
    const p = sessionStorage.getItem(KUNCI_LOGIN);
    return peran ? p === peran : Boolean(p);
  }
};

// Panggilan ke Google Apps Script (opsional). Memakai text/plain agar tidak memicu preflight CORS.
async function panggilServerAspirasi(muatan) {
  let r;
  try {
    r = await fetch(URL_ASPIRASI, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(muatan) });
  } catch (err) {
    throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internetmu.');
  }
  if (!r.ok) throw new Error('Server sedang bermasalah. Coba lagi nanti.');
  return r.json();
}

// Mengubah '2026-08-12' menjadi '12 Agustus 2026'
function formatTanggal(iso) {
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
