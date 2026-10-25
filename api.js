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
const KUNCI_PILIHAN = 'inspire_foto_pilihan';
const SANDI_DEMO = 'inspire123'; // HANYA DEMO. Login asli harus di server.

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

// DIVISI penyelenggara (opsional, jadi filter kedua). CONTOH: ganti dengan divisi BEM yang sebenarnya.
const DIVISI = ['Pendidikan', 'Media dan Informasi', 'Sosial Masyarakat', 'Keagamaan', 'Olahraga dan Seni', 'Kaderisasi', 'Kesekretariatan'];

function namaKategori(id) {
  const k = KATEGORI.find(x => x.id === id);
  return k ? k.nama : id;
}

// Tautan folder arsip lengkap di Google Drive (kartu terakhir di galeri).
// >>> GANTI dengan tautan folder yang asli. Folder harus diatur
//     "Siapa saja yang memiliki link: Penampil" (bukan Editor).
const ARSIP_LENGKAP = 'https://drive.google.com/drive/folders/GANTI_DENGAN_ID_FOLDER';

// Data contoh yang tampil bila belum ada dokumentasi tersimpan
const DATA_CONTOH = [
  { id: 'c01', judul: 'Penyambutan Mahasiswa Baru', tanggal: '2026-07-18', kategori: 'organisasi', divisi: 'Kaderisasi', rasio: 1.5, foto: '' },
  { id: 'c02', judul: 'Seminar Nasional Tafsir', tanggal: '2026-08-12', kategori: 'akademik', divisi: 'Pendidikan', rasio: 1.778, foto: '' },
  { id: 'c03', judul: 'Turnamen Futsal Antar Angkatan', tanggal: '2026-08-12', kategori: 'olahraga', divisi: 'Olahraga dan Seni', rasio: 1.333, foto: '' },
  { id: 'c04', judul: 'Bakti Sosial Desa Binaan', tanggal: '2026-09-03', kategori: 'sosial', divisi: 'Sosial Masyarakat', rasio: 1.5, foto: '' },
  { id: 'c05', judul: 'Kajian Rutin Pekanan', tanggal: '2026-09-18', kategori: 'keagamaan', divisi: 'Keagamaan', rasio: 1.0, foto: '' },
  { id: 'c06', judul: 'Pelatihan Kepemimpinan', tanggal: '2026-09-25', kategori: 'organisasi', divisi: 'Kaderisasi', rasio: 1.778, foto: '' },
  { id: 'c07', judul: 'Santunan Anak Yatim', tanggal: '2026-10-02', kategori: 'sosial', divisi: 'Sosial Masyarakat', rasio: 1.333, foto: '', album: ARSIP_LENGKAP },
  { id: 'c08', judul: 'Lomba Kaligrafi', tanggal: '2026-10-05', kategori: 'seni', divisi: 'Olahraga dan Seni', rasio: 0.75, foto: '' },
  { id: 'c09', judul: 'Peringatan Maulid Nabi', tanggal: '2026-10-10', kategori: 'keagamaan', divisi: 'Keagamaan', rasio: 1.5, foto: '', album: ARSIP_LENGKAP },
  { id: 'c10', judul: 'Diskusi Publik Pendidikan', tanggal: '2026-10-15', kategori: 'akademik', divisi: 'Pendidikan', rasio: 1.333, foto: '' },
  { id: 'c11', judul: 'Jalan Sehat Kampus', tanggal: '2026-10-18', kategori: 'olahraga', divisi: 'Olahraga dan Seni', rasio: 1.778, foto: '' },
  { id: 'c12', judul: 'Pelatihan Jurnalistik', tanggal: '2026-10-20', kategori: 'akademik', divisi: 'Media dan Informasi', rasio: 1.5, foto: '' }
];

// Foto pilihan untuk dua roll di beranda (roll 1 = ikhwan, roll 2 = akhwat).
// Bentuk: { id, kelompok: 'ikhwan'|'akhwat', foto: 'alamat foto', rasio: lebar/tinggi foto (misal 1.5), keterangan: 'teks alternatif (boleh kosong)' }
const RASIO_CONTOH = [1.5, 0.75, 1.333, 1.778, 1, 1.5, 0.8, 1.333]; // variasi agar bingkai film terlihat hidup
const PILIHAN_CONTOH = ['ikhwan', 'akhwat'].flatMap(k =>
  RASIO_CONTOH.map((r, i) => ({ id: `p-${k}-${i + 1}`, kelompok: k, foto: '', rasio: r, keterangan: `Contoh foto ${k} ${i + 1}` })));

// Bentuk satu data dokumentasi (untuk halaman arsip lengkap nanti):
// { id, judul, tanggal: 'YYYY-MM-DD', kategori: id dari KATEGORI, divisi: nama divisi (boleh kosong),
//   rasio: lebar/tinggi foto, foto: 'alamat foto sampul', album: 'tautan album Google Drive (boleh kosong)' }
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

function bacaPilihan() {
  try {
    const teks = localStorage.getItem(KUNCI_PILIHAN);
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

  // ----- Foto pilihan beranda (dua roll) -----
  // HADI: GET /api/foto-pilihan, POST /api/foto-pilihan (FormData: kelompok, foto, keterangan),
  //       DELETE /api/foto-pilihan/:id
  async ambilFotoPilihan() {
    return bacaPilihan() || PILIHAN_CONTOH;
  },
  async tambahFotoPilihan(item) {
    const daftar = bacaPilihan() || [];
    daftar.unshift({ ...item, id: 'p' + Date.now() }); // yang terbaru di depan
    try {
      localStorage.setItem(KUNCI_PILIHAN, JSON.stringify(daftar));
    } catch (err) {
      throw new Error('Penyimpanan browser penuh. Hapus beberapa foto lama (ini batas mode demo).');
    }
  },
  async hapusFotoPilihan(id) {
    const daftar = (bacaPilihan() || PILIHAN_CONTOH).filter(f => f.id !== id);
    localStorage.setItem(KUNCI_PILIHAN, JSON.stringify(daftar));
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
