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
const KUNCI_ASPIRASI = 'inspire_aspirasi';
const KUNCI_SANDI_ASPIRASI = 'inspire_sandi_aspirasi';
const SANDI_DEMO = 'inspire123';           // admin DOKUMENTASI. HANYA DEMO. Login asli harus di server.
const SANDI_DEMO_ASPIRASI = 'aspirasi123'; // admin ASPIRASI.   HANYA DEMO.

// Alamat Web App Google Apps Script (lihat apps-script.gs). Selama KOSONG, aspirasi
// disimpan di browser ini saja (mode demo). Isi dengan alamat yang berakhiran /exec
// agar aspirasi masuk ke Google Spreadsheet sungguhan.
const URL_ASPIRASI = '';
const MODE_DEMO_ASPIRASI = !URL_ASPIRASI;

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
  { id: 'c01', judul: 'Penyambutan Mahasiswa Baru', tanggal: '2026-07-18', kategori: 'organisasi', divisi: 'Kaderisasi', rasio: 1.5, foto: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800' },
  { id: 'c02', judul: 'Seminar Nasional Tafsir', tanggal: '2026-08-12', kategori: 'akademik', divisi: 'Pendidikan', rasio: 1.778, foto: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=800' },
  { id: 'c03', judul: 'Turnamen Futsal Antar Angkatan', tanggal: '2026-08-12', kategori: 'olahraga', divisi: 'Olahraga dan Seni', rasio: 1.333, foto: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=800' },
  { id: 'c04', judul: 'Bakti Sosial Desa Binaan', tanggal: '2026-09-03', kategori: 'sosial', divisi: 'Sosial Masyarakat', rasio: 1.5, foto: 'https://images.unsplash.com/photo-1593113589914-07599018dd2a?auto=format&fit=crop&q=80&w=800' },
  { id: 'c05', judul: 'Kajian Rutin Pekanan', tanggal: '2026-09-18', kategori: 'keagamaan', divisi: 'Keagamaan', rasio: 1.0, foto: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=80&w=800' }
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

  // ----- Aspirasi -----
  // Dikirim pengunjung dari beranda. Bentuk: { nama, pesan }.
  // Mode Apps Script: tersimpan sebagai baris baru di Google Spreadsheet.
  // HADI (bila pakai server sendiri): POST /api/aspirasi  (publik, beri batas laju agar tidak di-spam)
  async kirimAspirasi({ nama, pesan }) {
    if (URL_ASPIRASI) {
      const res = await panggilServerAspirasi({ aksi: 'kirim', nama, pesan });
      if (!res.ok) throw new Error(res.galat || 'Aspirasi belum terkirim. Coba lagi.');
      return;
    }
    const daftar = JSON.parse(localStorage.getItem(KUNCI_ASPIRASI) || '[]');
    daftar.push({ id: 'a' + Date.now(), waktu: new Date().toISOString(), nama, pesan });
    localStorage.setItem(KUNCI_ASPIRASI, JSON.stringify(daftar));
  },

  // Hanya untuk admin aspirasi. Mengembalikan [{ waktu (ISO), nama, pesan }], terbaru di atas.
  // HADI (bila pakai server sendiri): GET /api/aspirasi, WAJIB dicek di server (peran "aspirasi").
  async ambilAspirasi() {
    let daftar;
    if (URL_ASPIRASI) {
      const res = await panggilServerAspirasi({ aksi: 'daftar', sandi: sessionStorage.getItem(KUNCI_SANDI_ASPIRASI) || '' });
      if (!res.ok) throw new Error(res.galat || 'Gagal memuat aspirasi.');
      daftar = res.data;
    } else {
      daftar = JSON.parse(localStorage.getItem(KUNCI_ASPIRASI) || '[]');
    }
    return daftar.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)));
  },

  // ----- Login admin (DEMO) -----
  // Ada dua peran: 'dokumentasi' dan 'aspirasi'. Masing-masing punya kata sandi sendiri.
  // HADI: ganti dengan login server (sesi/cookie atau token) yang mengembalikan peran.
  // Pengecekan sandi di JavaScript TIDAK AMAN karena bisa dibaca lewat "View Source".
  // Khusus peran 'aspirasi' dengan Apps Script, sandi dicek di server Google (bukan di sini).
  async masuk(peran, sandi) {
    if (peran === 'aspirasi' && URL_ASPIRASI) {
      let res;
      try { res = await panggilServerAspirasi({ aksi: 'cek', sandi }); } catch (err) { return false; }
      if (!res.ok) return false;
    } else {
      const benar = peran === 'aspirasi' ? SANDI_DEMO_ASPIRASI : peran === 'dokumentasi' ? SANDI_DEMO : null;
      if (benar === null || sandi !== benar) return false;
    }
    sessionStorage.setItem(KUNCI_LOGIN, peran);
    if (peran === 'aspirasi') sessionStorage.setItem(KUNCI_SANDI_ASPIRASI, sandi);
    return true;
  },
  keluar() {
    sessionStorage.removeItem(KUNCI_LOGIN);
    sessionStorage.removeItem(KUNCI_SANDI_ASPIRASI);
  },
  peran() { return sessionStorage.getItem(KUNCI_LOGIN); },
  // sudahMasuk('aspirasi') = sudah masuk sebagai peran itu; sudahMasuk() = masuk sebagai peran apa pun
  sudahMasuk(peran) {
    const p = sessionStorage.getItem(KUNCI_LOGIN);
    return peran ? p === peran : Boolean(p);
  }
};

// Panggilan ke Google Apps Script. Memakai text/plain agar tidak memicu preflight CORS.
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
