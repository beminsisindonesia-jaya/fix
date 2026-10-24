/* =====================================================
   admin.js : tambah dan hapus dokumentasi
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
   2. FORM TAMBAH: pratinjau + kompres foto
   ===================================================== */
const tambahForm = document.getElementById('tambahForm');
const inputFoto = document.getElementById('foto');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const tambahError = document.getElementById('tambahError');
const simpanBtn = document.getElementById('simpanBtn');

// Tanggal bawaan: hari ini
document.getElementById('tanggal').value = new Date().toLocaleDateString('sv-SE'); // format YYYY-MM-DD

// Mengecilkan foto: sisi terpanjang maksimal 1000 px, JPEG kualitas 75%.
// Foto kamera 5 MB biasanya menjadi sekitar 100-200 KB.
function kompresFoto(file, sisiMaks = 1000, kualitas = 0.75) {
  return new Promise((selesai, gagal) => {
    const pembaca = new FileReader();
    pembaca.onerror = () => gagal(new Error('Foto tidak bisa dibaca.'));
    pembaca.onload = () => {
      const gambar = new Image();
      gambar.onerror = () => gagal(new Error('File ini bukan gambar yang valid.'));
      gambar.onload = () => {
        const skala = Math.min(1, sisiMaks / Math.max(gambar.width, gambar.height));
        const kanvas = document.createElement('canvas');
        kanvas.width = Math.round(gambar.width * skala);
        kanvas.height = Math.round(gambar.height * skala);
        kanvas.getContext('2d').drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
        selesai(kanvas.toDataURL('image/jpeg', kualitas));
      };
      gambar.src = pembaca.result;
    };
    pembaca.readAsDataURL(file);
  });
}

// Tampilkan pratinjau saat foto dipilih
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
  const kategori = document.getElementById('kategori').value;
  const file = inputFoto.files[0];
  const album = document.getElementById('album').value.trim();

  // Pengecekan isian
  if (judul.length < 3) { tambahError.textContent = 'Judul minimal 3 karakter.'; return; }
  if (!tanggal) { tambahError.textContent = 'Pilih tanggal kegiatan.'; return; }
  if (!file) { tambahError.textContent = 'Pilih satu foto sampul.'; return; }
  if (album && !tautanAman(album)) { tambahError.textContent = 'Tautan album harus diawali https://'; return; }
  if (!file.type.startsWith('image/')) { tambahError.textContent = 'File harus berupa gambar (JPG atau PNG).'; return; }

  simpanBtn.disabled = true;
  simpanBtn.textContent = 'Menyimpan...';
  try {
    const foto = await kompresFoto(file);
    await API.tambah({ judul, tanggal, kategori, foto, album });

    tambahForm.reset();
    document.getElementById('tanggal').value = new Date().toLocaleDateString('sv-SE');
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
   3. DAFTAR TERSIMPAN + HAPUS
   Teks dimasukkan dengan textContent (bukan innerHTML)
   agar judul berisi kode tidak bisa merusak halaman.
   ===================================================== */
const daftarEl = document.getElementById('daftar');

async function muatDaftar() {
  const data = await API.ambilSemua();
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
    const li = document.createElement('li');
    li.className = 'item';

    const foto = document.createElement('div');
    foto.className = 'item-foto';
    if (item.foto) {
      const img = document.createElement('img');
      img.src = item.foto;
      img.alt = '';
      foto.appendChild(img);
    } else {
      foto.textContent = 'Contoh';
    }

    const info = document.createElement('div');
    info.className = 'item-info';
    const judul = document.createElement('strong');
    judul.textContent = item.judul;
    const meta = document.createElement('span');
    meta.textContent = `${formatTanggal(item.tanggal)} · ${item.kategori}${item.album ? ' · ada album' : ''}`;
    info.append(judul, meta);

    const hapus = document.createElement('button');
    hapus.className = 'hapus';
    hapus.textContent = 'Hapus';
    hapus.addEventListener('click', async () => {
      if (!confirm(`Hapus "${item.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
      await API.hapus(item.id);
      tampilkanToast('Dokumentasi dihapus.');
      muatDaftar();
    });

    li.append(foto, info, hapus);
    daftarEl.appendChild(li);
  });
}

muatDaftar();

/* =====================================================
   4. FOTO PILIHAN BERANDA (roll ikhwan & akhwat)
   ===================================================== */
const pilihanForm = document.getElementById('pilihanForm');
const pilihanError = document.getElementById('pilihanError');
const simpanPilihanBtn = document.getElementById('simpanPilihanBtn');
const daftarPilihanEl = document.getElementById('daftarPilihan');

pilihanForm.addEventListener('submit', async e => {
  e.preventDefault();
  pilihanError.textContent = '';

  const kelompok = document.getElementById('kelompok').value;
  const file = document.getElementById('fotoPilihan').files[0];
  const keterangan = document.getElementById('keterangan').value.trim();

  if (!file) { pilihanError.textContent = 'Pilih satu foto.'; return; }
  if (!file.type.startsWith('image/')) { pilihanError.textContent = 'File harus berupa gambar (JPG atau PNG).'; return; }

  simpanPilihanBtn.disabled = true;
  simpanPilihanBtn.textContent = 'Menyimpan...';
  try {
    const foto = await kompresFoto(file, 900); // roll tidak butuh foto yang terlalu besar
    await API.tambahFotoPilihan({ kelompok, foto, keterangan });
    pilihanForm.reset();
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
  document.getElementById('jumlahPilihan').textContent = `(${data.length})`;
  daftarPilihanEl.innerHTML = '';

  if (data.length === 0) {
    const kosong = document.createElement('li');
    kosong.className = 'kosong';
    kosong.textContent = 'Belum ada foto pilihan.';
    daftarPilihanEl.appendChild(kosong);
    return;
  }

  data.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item';

    const foto = document.createElement('div');
    foto.className = 'item-foto';
    if (item.foto) {
      const img = document.createElement('img');
      img.src = item.foto;
      img.alt = '';
      foto.appendChild(img);
    } else {
      foto.textContent = 'Contoh';
    }

    const info = document.createElement('div');
    info.className = 'item-info';
    const judul = document.createElement('strong');
    judul.textContent = item.keterangan || '(tanpa keterangan)';
    const meta = document.createElement('span');
    meta.textContent = item.kelompok === 'akhwat' ? 'Roll 2 - Akhwat' : 'Roll 1 - Ikhwan';
    info.append(judul, meta);

    const hapus = document.createElement('button');
    hapus.className = 'hapus';
    hapus.textContent = 'Hapus';
    hapus.addEventListener('click', async () => {
      if (!confirm('Hapus foto ini dari beranda? Tindakan ini tidak bisa dibatalkan.')) return;
      await API.hapusFotoPilihan(item.id);
      tampilkanToast('Foto dihapus.');
      muatPilihan();
    });

    li.append(foto, info, hapus);
    daftarPilihanEl.appendChild(li);
  });
}
muatPilihan();
