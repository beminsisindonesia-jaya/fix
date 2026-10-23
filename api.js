/* =====================================================
   api.js : PUSAT DATA
   Semua halaman (situs publik & admin) mengambil/menyimpan
   data lewat file ini. Sekarang datanya disimpan di browser
   (localStorage) hanya untuk DEMO.

   >>> HADI: cukup ganti isi fungsi di bawah dengan fetch ke
       server. Nama fungsi dan bentuk data jangan diubah,
       maka halaman lain tidak perlu disentuh.
   ===================================================== */

const KUNCI_DATA = 'inspire_dokumentasi';
const KUNCI_LOGIN = 'inspire_admin';
const SANDI_DEMO = 'inspire123'; // HANYA DEMO. Login asli harus di server.

// Tautan folder arsip lengkap di Google Drive (kartu terakhir di galeri).
// >>> GANTI dengan tautan folder yang asli. Folder harus diatur
//     "Siapa saja yang memiliki link: Penampil" (bukan Editor).
const ARSIP_LENGKAP = 'https://drive.google.com/drive/folders/GANTI_DENGAN_ID_FOLDER';

// Data contoh yang tampil bila belum ada dokumentasi tersimpan
const DATA_CONTOH = [
  { id: 'c1', judul: 'Seminar Nasional Tafsir',  tanggal: '2026-08-12', kategori: 'akademik',  foto: '' },
  { id: 'c2', judul: 'Bakti Sosial Desa Binaan', tanggal: '2026-09-03', kategori: 'sosial',    foto: '' },
  { id: 'c3', judul: 'Kajian Rutin Pekanan',     tanggal: '2026-09-18', kategori: 'keagamaan', foto: '' },
  { id: 'c4', judul: 'Pelatihan Kepemimpinan',   tanggal: '2026-09-25', kategori: 'akademik',  foto: '' },
  { id: 'c5', judul: 'Santunan Anak Yatim',      tanggal: '2026-10-02', kategori: 'sosial',    foto: '', album: ARSIP_LENGKAP },
  { id: 'c6', judul: 'Peringatan Maulid Nabi',   tanggal: '2026-10-10', kategori: 'keagamaan', foto: '', album: ARSIP_LENGKAP }
];

// Bentuk satu data dokumentasi:
// { id, judul, tanggal: 'YYYY-MM-DD', kategori: 'akademik'|'sosial'|'keagamaan',
//   foto: 'alamat foto sampul', album: 'tautan album Google Drive (boleh kosong)' }
// Satu data = satu KEGIATAN, dengan satu foto sampul. Foto lengkap ada di album Drive.

// Hanya tautan http/https yang dianggap aman (menolak "javascript:" dan sejenisnya)
function tautanAman(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function bacaLokal() {
  try {
    const teks = localStorage.getItem(KUNCI_DATA);
    if (teks) return JSON.parse(teks);
  } catch (err) { /* abaikan, pakai data contoh */ }
  return null;
}

function urutkanTerbaru(daftar) {
  return [...daftar].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

const API = {
  // Ambil semua dokumentasi (terbaru di atas)
  // HADI: return (await fetch('/api/dokumentasi')).json();
  async ambilSemua() {
    return urutkanTerbaru(bacaLokal() || DATA_CONTOH);
  },

  // Tambah satu dokumentasi baru
  // HADI: kirim FormData (judul, tanggal, kategori, file foto) lewat
  //       fetch('/api/dokumentasi', { method: 'POST', body: formData })
  async tambah(item) {
    const daftar = bacaLokal() || [];
    daftar.push({ ...item, id: 'd' + Date.now() });
    try {
      localStorage.setItem(KUNCI_DATA, JSON.stringify(daftar));
    } catch (err) {
      throw new Error('Penyimpanan browser penuh. Hapus beberapa data lama (ini batas mode demo).');
    }
  },

  // Hapus satu dokumentasi
  // HADI: fetch('/api/dokumentasi/' + id, { method: 'DELETE' })
  async hapus(id) {
    const daftar = (bacaLokal() || DATA_CONTOH).filter(d => d.id !== id);
    localStorage.setItem(KUNCI_DATA, JSON.stringify(daftar));
  },

  // ----- Login admin (DEMO) -----
  // HADI: ganti dengan login server (sesi/cookie atau token). Pengecekan
  // sandi di JavaScript seperti ini TIDAK AMAN karena siapa pun bisa
  // membacanya lewat "View Source".
  async masuk(sandi) {
    if (sandi !== SANDI_DEMO) return false;
    sessionStorage.setItem(KUNCI_LOGIN, '1');
    return true;
  },
  keluar() { sessionStorage.removeItem(KUNCI_LOGIN); },
  sudahMasuk() { return sessionStorage.getItem(KUNCI_LOGIN) === '1'; }
};

// Mengubah '2026-08-12' menjadi '12 Agustus 2026'
function formatTanggal(iso) {
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
