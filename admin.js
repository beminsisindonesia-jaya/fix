/* =====================================================
   admin.js : foto pilihan beranda, dokumentasi, dan daftar
   Semua data lewat objek API di api.js.
   Login ada di halaman terpisah (login.html + login.js).
   ===================================================== */
const toast = document.getElementById('toast');

function tampilkanToast(teks) {
  toast.textContent = teks;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

/* =====================================================
   1. KELUAR: hapus sesi lalu kembali ke halaman login
   ===================================================== */
document.getElementById('keluarBtn').addEventListener('click', () => {
  API.keluar();
  location.href = 'login.html';
});

/* =====================================================
   2. ALAT BANTU FOTO
   ===================================================== */
const hariIni = () => new Date().toLocaleDateString('sv-SE'); // format YYYY-MM-DD

// Memuat file gambar menjadi objek <img> (URL sementara dibebaskan oleh pemanggil)
function muatGambar(file) {
  return new Promise((selesai, gagal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => selesai(img);
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('File ini bukan gambar yang valid.')); };
    img.src = url;
  });
}

// Mengolah foto: boleh dipotong (area) lalu dikecilkan agar sisi terpanjang <= sisiMaks.
// Mengembalikan { foto: alamat data JPEG, rasio: lebar/tinggi }.
async function olahFoto(file, sisiMaks, kualitas, area) {
  const img = await muatGambar(file);
  try {
    const sx = area ? area.sx : 0;
    const sy = area ? area.sy : 0;
    const sw = area ? area.sw : img.naturalWidth;
    const sh = area ? area.sh : img.naturalHeight;
    const skala = Math.min(1, sisiMaks / Math.max(sw, sh));

    const kanvas = document.createElement('canvas');
    kanvas.width = Math.max(1, Math.round(sw * skala));
    kanvas.height = Math.max(1, Math.round(sh * skala));
    const ctx = kanvas.getContext('2d');
    ctx.fillStyle = '#fff';                       // latar putih untuk PNG transparan
    ctx.fillRect(0, 0, kanvas.width, kanvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, kanvas.width, kanvas.height);

    return { foto: kanvas.toDataURL('image/jpeg', kualitas), rasio: Math.round((sw / sh) * 1000) / 1000 };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

// Membuat satu baris daftar (foto kecil, teks, tombol hapus)
function buatBaris({ foto, judul, meta, onHapus }) {
  const li = document.createElement('li');
  li.className = 'item';

  const kotakFoto = document.createElement('div');
  kotakFoto.className = 'item-foto';
  if (foto) {
    const img = document.createElement('img');
    img.src = foto;
    img.alt = '';
    kotakFoto.appendChild(img);
  } else {
    kotakFoto.textContent = 'Contoh';
  }

  const info = document.createElement('div');
  info.className = 'item-info';
  const j = document.createElement('strong');
  j.textContent = judul;                          // textContent: aman dari kode berbahaya
  const m = document.createElement('span');
  m.textContent = meta;
  info.append(j, m);

  const hapus = document.createElement('button');
  hapus.className = 'hapus';
  hapus.textContent = 'Hapus';
  hapus.addEventListener('click', onHapus);

  li.append(kotakFoto, info, hapus);
  return li;
}

/* =====================================================
   3. FOTO PILIHAN BERANDA (roll ikhwan & akhwat)
   Bingkai "asli": seluruh foto, lebar mengikuti foto.
   Bingkai "potong": semua 4:3, bagian foto dipilih lewat alat potong.
   ===================================================== */
const pilihanForm = document.getElementById('pilihanForm');
const inputFotoPilihan = document.getElementById('fotoPilihan');
const pilihBingkai = document.getElementById('bingkai');
const pratinjauAsli = document.getElementById('pratinjauAsli');
const pratinjauAsliImg = document.getElementById('pratinjauAsliImg');
const kropArea = document.getElementById('kropArea');
const kropBingkai = document.getElementById('kropBingkai');
const kropImg = document.getElementById('kropImg');
const kropZoom = document.getElementById('kropZoom');
const pilihanError = document.getElementById('pilihanError');
const simpanPilihanBtn = document.getElementById('simpanPilihanBtn');

// Keadaan alat potong: gambar, ukuran bingkai (cw x ch), skala dasar (s0), perbesaran, dan posisi
const krop = { img: null, w: 0, h: 0, cw: 0, ch: 0, s0: 1, zoom: 1, x: 0, y: 0 };

function terapkanKrop() {
  const s = krop.s0 * krop.zoom;
  const dw = krop.w * s;
  const dh = krop.h * s;
  krop.x = Math.min(0, Math.max(krop.cw - dw, krop.x));   // foto selalu menutupi bingkai
  krop.y = Math.min(0, Math.max(krop.ch - dh, krop.y));
  kropImg.style.width = dw + 'px';
  kropImg.style.height = dh + 'px';
  kropImg.style.transform = `translate(${krop.x}px, ${krop.y}px)`;
}

async function perbaruiPratinjauPilihan() {
  pilihanError.textContent = '';
  pratinjauAsli.hidden = true;
  kropArea.hidden = true;
  krop.img = null;

  const file = inputFotoPilihan.files[0];
  if (!file) return;

  if (pilihBingkai.value === 'asli') {
    pratinjauAsliImg.src = URL.createObjectURL(file);
    pratinjauAsli.hidden = false;
    return;
  }

  try {
    const img = await muatGambar(file);
    krop.img = img;
    krop.w = img.naturalWidth;
    krop.h = img.naturalHeight;
    kropImg.src = img.src;
    kropArea.hidden = false;                              // tampilkan dulu agar ukurannya bisa dibaca
    krop.cw = kropBingkai.getBoundingClientRect().width;
    krop.ch = krop.cw * 3 / 4;                              // tepat 4:3, tanpa pembulatan piksel
    krop.s0 = Math.max(krop.cw / krop.w, krop.ch / krop.h); // skala "menutupi" bingkai
    krop.zoom = 1;
    kropZoom.value = 1;
    krop.x = (krop.cw - krop.w * krop.s0) / 2;              // mulai dari tengah foto
    krop.y = (krop.ch - krop.h * krop.s0) / 2;
    terapkanKrop();
  } catch (err) {
    pilihanError.textContent = err.message;
  }
}
inputFotoPilihan.addEventListener('change', perbaruiPratinjauPilihan);
pilihBingkai.addEventListener('change', perbaruiPratinjauPilihan);

// Geser foto dengan mouse atau jari
let seret = null;
kropBingkai.addEventListener('pointerdown', e => {
  if (!krop.img) return;
  seret = { px: e.clientX, py: e.clientY, x: krop.x, y: krop.y };
  kropBingkai.setPointerCapture(e.pointerId);
});
kropBingkai.addEventListener('pointermove', e => {
  if (!seret) return;
  krop.x = seret.x + (e.clientX - seret.px);
  krop.y = seret.y + (e.clientY - seret.py);
  terapkanKrop();
});
['pointerup', 'pointercancel'].forEach(n => kropBingkai.addEventListener(n, () => { seret = null; }));

// Perbesar sambil menjaga titik tengah bingkai tetap sama
kropZoom.addEventListener('input', () => {
  if (!krop.img) return;
  const sLama = krop.s0 * krop.zoom;
  const cx = (krop.cw / 2 - krop.x) / sLama;
  const cy = (krop.ch / 2 - krop.y) / sLama;
  krop.zoom = Number(kropZoom.value);
  const sBaru = krop.s0 * krop.zoom;
  krop.x = krop.cw / 2 - cx * sBaru;
  krop.y = krop.ch / 2 - cy * sBaru;
  terapkanKrop();
});

pilihanForm.addEventListener('submit', async e => {
  e.preventDefault();
  pilihanError.textContent = '';

  const kelompok = document.getElementById('kelompok').value;
  const file = inputFotoPilihan.files[0];
  const keterangan = document.getElementById('keterangan').value.trim();

  if (!file) { pilihanError.textContent = 'Pilih satu foto.'; return; }
  if (!file.type.startsWith('image/')) { pilihanError.textContent = 'File harus berupa gambar (JPG atau PNG).'; return; }
  if (pilihBingkai.value === 'potong' && !krop.img) { pilihanError.textContent = 'Foto sedang disiapkan, coba lagi sebentar.'; return; }

  simpanPilihanBtn.disabled = true;
  simpanPilihanBtn.textContent = 'Menyimpan...';
  try {
    let hasil;
    if (pilihBingkai.value === 'potong') {
      const s = krop.s0 * krop.zoom;                      // bagian foto yang terlihat di bingkai
      hasil = await olahFoto(file, 1200, 0.85, { sx: -krop.x / s, sy: -krop.y / s, sw: krop.cw / s, sh: krop.ch / s });
    } else {
      hasil = await olahFoto(file, 1200, 0.85);
    }
    await API.tambahFotoPilihan({ kelompok, foto: hasil.foto, rasio: hasil.rasio, keterangan });

    pilihanForm.reset();
    pratinjauAsli.hidden = true;
    kropArea.hidden = true;
    krop.img = null;
    tampilkanToast('Foto pilihan tersimpan.');
    muatPilihan();
  } catch (err) {
    pilihanError.textContent = err.message;
  } finally {
    simpanPilihanBtn.disabled = false;
    simpanPilihanBtn.textContent = 'Simpan foto pilihan';
  }
});

async function muatPilihan() {
  const data = await API.ambilFotoPilihan();
  const daftarEl = document.getElementById('daftarPilihan');
  document.getElementById('jumlahPilihan').textContent = `(${data.length})`;
  daftarEl.innerHTML = '';

  if (data.length === 0) {
    const kosong = document.createElement('li');
    kosong.className = 'kosong';
    kosong.textContent = 'Belum ada foto pilihan.';
    daftarEl.appendChild(kosong);
    return;
  }

  data.forEach(item => {
    daftarEl.appendChild(buatBaris({
      foto: item.foto,
      judul: item.keterangan || '(tanpa keterangan)',
      meta: item.kelompok === 'akhwat' ? 'Roll 2 - Akhwat' : 'Roll 1 - Ikhwan',
      onHapus: async () => {
        if (!confirm('Hapus foto ini dari beranda? Tindakan ini tidak bisa dibatalkan.')) return;
        await API.hapusFotoPilihan(item.id);
        tampilkanToast('Foto dihapus.');
        muatPilihan();
      }
    }));
  });
}

/* =====================================================
   4. TAMBAH DOKUMENTASI (halaman "Seluruh dokumentasi")
   ===================================================== */
const tambahForm = document.getElementById('tambahForm');
const inputFoto = document.getElementById('foto');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const tambahError = document.getElementById('tambahError');
const simpanBtn = document.getElementById('simpanBtn');

// Pilihan kategori & divisi diambil dari konfigurasi di api.js
const kategoriSel = document.getElementById('kategori');
KATEGORI.forEach(k => kategoriSel.add(new Option(k.nama, k.id)));
const divisiSel = document.getElementById('divisi');
divisiSel.add(new Option('(tidak dipilih)', ''));
DIVISI.forEach(d => divisiSel.add(new Option(d, d)));

document.getElementById('tanggal').value = hariIni();

inputFoto.addEventListener('change', () => {
  const file = inputFoto.files[0];
  if (!file) { preview.hidden = true; return; }
  previewImg.src = URL.createObjectURL(file);
  preview.hidden = false;
});

tambahForm.addEventListener('submit', async e => {
  e.preventDefault();
  tambahError.textContent = '';

  const judul = document.getElementById('judul').value.trim();
  const tanggal = document.getElementById('tanggal').value;
  const kategori = kategoriSel.value;
  const divisi = divisiSel.value;
  const file = inputFoto.files[0];
  const album = document.getElementById('album').value.trim();

  if (judul.length < 3) { tambahError.textContent = 'Judul minimal 3 karakter.'; return; }
  if (!tanggal) { tambahError.textContent = 'Pilih tanggal kegiatan.'; return; }
  if (!file) { tambahError.textContent = 'Pilih satu foto sampul.'; return; }
  if (album && !tautanAman(album)) { tambahError.textContent = 'Tautan album harus diawali https://'; return; }
  if (!file.type.startsWith('image/')) { tambahError.textContent = 'File harus berupa gambar (JPG atau PNG).'; return; }

  simpanBtn.disabled = true;
  simpanBtn.textContent = 'Menyimpan...';
  try {
    const { foto, rasio } = await olahFoto(file, 1600, 0.82);   // sisi terpanjang 1600 px, tanpa dipotong
    await API.tambah({ judul, tanggal, kategori, divisi, foto, rasio, album });

    tambahForm.reset();
    document.getElementById('tanggal').value = hariIni();
    preview.hidden = true;
    tampilkanToast('Dokumentasi tersimpan.');
    muatDaftar();
  } catch (err) {
    tambahError.textContent = err.message;
  } finally {
    simpanBtn.disabled = false;
    simpanBtn.textContent = 'Simpan dokumentasi';
  }
});

/* =====================================================
   5. DAFTAR DOKUMENTASI TERSIMPAN + HAPUS
   ===================================================== */
async function muatDaftar() {
  const data = await API.ambilSemua();
  const daftarEl = document.getElementById('daftar');
  document.getElementById('jumlah').textContent = `(${data.length})`;
  daftarEl.innerHTML = '';

  if (data.length === 0) {
    const kosong = document.createElement('li');
    kosong.className = 'kosong';
    kosong.textContent = 'Belum ada dokumentasi. Tambahkan lewat form di atas.';
    daftarEl.appendChild(kosong);
    return;
  }

  data.forEach(item => {
    const bagian = [formatTanggal(item.tanggal), namaKategori(item.kategori)];
    if (item.divisi) bagian.push(item.divisi);
    if (item.album) bagian.push('ada album');
    daftarEl.appendChild(buatBaris({
      foto: item.foto,
      judul: item.judul,
      meta: bagian.join(' · '),
      onHapus: async () => {
        if (!confirm(`Hapus "${item.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        await API.hapus(item.id);
        tampilkanToast('Dokumentasi dihapus.');
        muatDaftar();
      }
    }));
  });
}

muatPilihan();
muatDaftar();
