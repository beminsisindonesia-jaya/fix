/* =====================================================
   dokumentasi.js : halaman "Seluruh dokumentasi"
   Data diambil lewat api.js (API.ambilSemua).
   Fitur: filter kategori & divisi, penggeser tanggal,
   daftar per bulan, "tampilkan lebih banyak", dan pop-up
   foto yang bisa maju/mundur (tombol, panah keyboard, geser jari).
   ===================================================== */

/* =====================================================
   0. MODE HEMAT (sama seperti beranda)
   ===================================================== */
const parameter = new URLSearchParams(location.search).get('hemat');
const perangkatLemah = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                    || (navigator.deviceMemory && navigator.deviceMemory <= 2);
if (parameter === '1' || (perangkatLemah && parameter !== '0')) {
  document.documentElement.classList.add('hemat');
}

/* =====================================================
   1. NAVBAR: berubah menjadi pil mengambang saat di-scroll
   (halaman ini hanya punya satu tombol, "Kembali ke beranda")
   ===================================================== */
const navbar = document.getElementById('navbar');

let navMengambang = false;
function aturNavbar() {
  const y = window.scrollY;
  const nyala = navMengambang ? y > 8 : y > 20;
  if (nyala !== navMengambang) {
    navMengambang = nyala;
    navbar.classList.toggle('scrolled', nyala);
  }
}
window.addEventListener('scroll', aturNavbar, { passive: true });
aturNavbar();

/* =====================================================
   2. KEADAAN HALAMAN
   ===================================================== */
const HALAMAN = 24;                 // jumlah foto yang tampil per "halaman"

const elDaftar = document.getElementById('dokDaftar');
const elRingkas = document.getElementById('dokRingkas');
const elChips = document.getElementById('dokChips');
const elDivisi = document.getElementById('dokDivisi');
const elLebih = document.getElementById('dokLebih');
const elWaktu = document.getElementById('dokWaktu');
const elRentang = document.getElementById('dokRentang');
const elBubble = document.getElementById('dokBubble');
const elTicks = document.getElementById('dokTicks');
const elReset = document.getElementById('dokReset');

let semua = [];                     // seluruh dokumentasi (terbaru di atas)
let kategoriAktif = 'semua';
let divisiAktif = 'semua';
let tanggalAktif = null;            // 'YYYY-MM-DD' atau null (semua tanggal)
let dasar = [];                     // hasil saringan kategori + divisi
let tglUrut = [];                   // tanggal unik dari "dasar", dari terlama ke terbaru
let daftarTersaring = [];           // yang sedang ditampilkan (juga dipakai pop-up)
let batas = HALAMAN;

const namaBulan = iso => {
  const [t, b] = iso.split('-').map(Number);
  return new Date(t, b - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};
const tanggalPendek = iso => {
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* =====================================================
   3. PENYARING: kategori (tombol) dan divisi (pilihan)
   ===================================================== */
function bangunChips() {
  elChips.innerHTML = '';
  const hitung = id => semua.filter(d => id === 'semua' || d.kategori === id).length;
  const daftar = [{ id: 'semua', nama: 'Semua' }, ...KATEGORI.filter(k => hitung(k.id) > 0)];

  daftar.forEach(k => {
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'dok-chip';
    tombol.setAttribute('aria-pressed', k.id === kategoriAktif);
    tombol.append(k.nama);
    const jumlah = document.createElement('small');
    jumlah.textContent = hitung(k.id);
    tombol.appendChild(jumlah);
    tombol.addEventListener('click', () => {
      kategoriAktif = k.id;
      tanggalAktif = null;
      batas = HALAMAN;
      elChips.querySelectorAll('.dok-chip').forEach((c, i) => c.setAttribute('aria-pressed', daftar[i].id === k.id));
      renderSemua();
    });
    elChips.appendChild(tombol);
  });
}

function bangunDivisi() {
  elDivisi.innerHTML = '';
  elDivisi.add(new Option('Semua divisi', 'semua'));
  const ada = new Set(semua.map(d => d.divisi).filter(Boolean));
  [...DIVISI, ...[...ada].filter(d => !DIVISI.includes(d))].forEach(d => elDivisi.add(new Option(d, d)));
  elDivisi.value = divisiAktif;
}
elDivisi.addEventListener('change', () => {
  divisiAktif = elDivisi.value;
  tanggalAktif = null;
  batas = HALAMAN;
  renderSemua();
});

/* =====================================================
   4. PENGGESER TANGGAL
   Tiap posisi = satu tanggal yang punya dokumentasi (terlama di kiri).
   Dibiarkan "tidak aktif" sampai pengunjung menggesernya.
   ===================================================== */
function posisiSlider(idx) {
  const n = tglUrut.length;
  elWaktu.style.setProperty('--pos', n > 1 ? idx / (n - 1) : 1);
  elBubble.textContent = tglUrut[idx] ? tanggalPendek(tglUrut[idx]) : '';
}

function aturSlider() {
  const n = tglUrut.length;
  elWaktu.hidden = n < 2;               // satu tanggal saja: penggeser tidak berguna
  if (n < 2) return;

  elRentang.max = n - 1;
  elTicks.innerHTML = '';
  tglUrut.forEach((t, i) => {
    const titik = document.createElement('span');
    titik.className = 'dok-tick';
    titik.style.left = `calc(${i / (n - 1)} * (100% - 24px) + 12px)`;
    elTicks.appendChild(titik);
  });

  document.getElementById('dokAwal').textContent = tanggalPendek(tglUrut[0]);
  document.getElementById('dokAkhir').textContent = tanggalPendek(tglUrut[n - 1]);

  const idx = tanggalAktif ? tglUrut.indexOf(tanggalAktif) : n - 1;
  elRentang.value = idx;
  posisiSlider(idx);
  elWaktu.classList.toggle('aktif', Boolean(tanggalAktif));
  elReset.hidden = !tanggalAktif;
}

elRentang.addEventListener('input', () => {
  const idx = Number(elRentang.value);
  tanggalAktif = tglUrut[idx];
  posisiSlider(idx);
  elWaktu.classList.add('aktif');
  elReset.hidden = false;
  renderDaftar();                       // hanya daftar yang diperbarui, agar geseran tetap ringan
});
elReset.addEventListener('click', () => {
  tanggalAktif = null;
  batas = HALAMAN;
  renderSemua();
});

/* =====================================================
   5. DAFTAR FOTO (dikelompokkan per bulan)
   ===================================================== */
function buatKartu(item, indeks, urutan) {
  const kartu = document.createElement('button');
  kartu.type = 'button';
  kartu.className = 'dok-kartu';
  kartu.style.setProperty('--n', Math.min(urutan, 12));

  const thumb = document.createElement('div');
  thumb.className = 'dok-thumb';
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.judul;
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.appendChild(img);
  } else {
    thumb.append('Foto kegiatan');
  }
  const badge = document.createElement('span');
  badge.className = 'dok-badge';
  badge.textContent = namaKategori(item.kategori);
  thumb.appendChild(badge);

  const isi = document.createElement('div');
  isi.className = 'dok-kartu-isi';
  const judul = document.createElement('h3');
  judul.textContent = item.judul;                   // textContent: aman dari kode berbahaya
  const meta = document.createElement('p');
  meta.textContent = tanggalPendek(item.tanggal) + (item.divisi ? ' · ' + item.divisi : '');
  isi.append(judul, meta);

  kartu.append(thumb, isi);
  kartu.addEventListener('click', () => bukaLb(indeks));
  return kartu;
}

function renderDaftar() {
  daftarTersaring = tanggalAktif ? dasar.filter(d => d.tanggal === tanggalAktif) : dasar;
  elDaftar.innerHTML = '';

  const keterangan = [];
  if (kategoriAktif !== 'semua') keterangan.push(namaKategori(kategoriAktif));
  if (divisiAktif !== 'semua') keterangan.push('divisi ' + divisiAktif);
  if (tanggalAktif) keterangan.push(tanggalPendek(tanggalAktif));
  elRingkas.textContent = `${daftarTersaring.length} dokumentasi` + (keterangan.length ? ' · ' + keterangan.join(' · ') : '');

  if (daftarTersaring.length === 0) {
    const kosong = document.createElement('div');
    kosong.className = 'dok-kosong';
    kosong.append('Belum ada dokumentasi untuk pilihan ini.');
    const ulang = document.createElement('button');
    ulang.type = 'button';
    ulang.className = 'btn btn-line';
    ulang.textContent = 'Tampilkan semua';
    ulang.addEventListener('click', () => {
      kategoriAktif = 'semua'; divisiAktif = 'semua'; tanggalAktif = null; batas = HALAMAN;
      bangunChips(); bangunDivisi(); renderSemua();
    });
    kosong.append(document.createElement('br'), ulang);
    elDaftar.appendChild(kosong);
    elLebih.hidden = true;
    return;
  }

  const tampil = tanggalAktif ? daftarTersaring : daftarTersaring.slice(0, batas);
  let grid = null;
  let kunciSekarang = null;
  tampil.forEach((item, i) => {
    const kunci = tanggalAktif ? 'tanggal' : item.tanggal.slice(0, 7);   // satu judul per bulan
    if (kunci !== kunciSekarang) {
      kunciSekarang = kunci;
      const judulBulan = document.createElement('h2');
      judulBulan.className = 'dok-bulan';
      judulBulan.textContent = tanggalAktif ? formatTanggal(tanggalAktif) : namaBulan(item.tanggal);
      grid = document.createElement('div');
      grid.className = 'dok-grid';
      elDaftar.append(judulBulan, grid);
    }
    grid.appendChild(buatKartu(item, i, i));
  });
  elLebih.hidden = Boolean(tanggalAktif) || daftarTersaring.length <= batas;
}

elLebih.addEventListener('click', () => { batas += HALAMAN; renderDaftar(); });

function renderSemua() {
  dasar = semua.filter(d =>
    (kategoriAktif === 'semua' || d.kategori === kategoriAktif) &&
    (divisiAktif === 'semua' || d.divisi === divisiAktif));
  tglUrut = [...new Set(dasar.map(d => d.tanggal))].sort();
  if (tanggalAktif && !tglUrut.includes(tanggalAktif)) tanggalAktif = null;
  aturSlider();
  renderDaftar();
}

async function muat() {
  try {
    semua = await API.ambilSemua();            // sudah urut dari yang terbaru
    bangunChips();
    bangunDivisi();
    renderSemua();
  } catch (err) {
    elRingkas.textContent = 'Dokumentasi belum bisa dimuat. Coba lagi nanti.';
  }
}
muat();

/* =====================================================
   6. POP-UP FOTO: maju/mundur lewat tombol, panah keyboard, atau geser jari
   ===================================================== */
const lb = document.getElementById('dokLb');
const lbFoto = document.getElementById('dokLbFoto');
const lbPrev = document.getElementById('dokPrev');
const lbNext = document.getElementById('dokNext');
const lbTutup = document.getElementById('dokLbTutup');
let lbIndeks = -1;
let fokusSebelum = null;

function isiLb() {
  const item = daftarTersaring[lbIndeks];
  if (!item) return;

  document.getElementById('dokLbJudul').textContent = item.judul;
  const bagian = [formatTanggal(item.tanggal), namaKategori(item.kategori)];
  if (item.divisi) bagian.push(item.divisi);
  document.getElementById('dokLbMeta').textContent = bagian.join(' · ');

  lbFoto.innerHTML = '';
  document.getElementById('dokKerangka').style.setProperty('--rasio', item.rasio || 4 / 3); // bingkai mengikuti ukuran foto asli
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.judul;
    lbFoto.appendChild(img);
  } else {
    lbFoto.textContent = 'Foto kegiatan';
  }

  const album = document.getElementById('dokLbAlbum');
  if (tautanAman(item.album)) { album.href = item.album; album.hidden = false; } else { album.hidden = true; }

  document.getElementById('dokLbHitung').textContent = `${lbIndeks + 1} / ${daftarTersaring.length}`;
  lbPrev.disabled = lbIndeks <= 0;
  lbNext.disabled = lbIndeks >= daftarTersaring.length - 1;

  // Muat foto tetangga lebih dulu agar perpindahan terasa instan
  [lbIndeks - 1, lbIndeks + 1].forEach(i => {
    if (daftarTersaring[i] && daftarTersaring[i].foto) new Image().src = daftarTersaring[i].foto;
  });
}

function bukaLb(i) {
  fokusSebelum = document.activeElement;
  lbIndeks = i;
  isiLb();
  lb.hidden = false;
  document.body.classList.add('lb-terbuka');
  lbTutup.focus();
}
function tutupLb() {
  lb.hidden = true;
  document.body.classList.remove('lb-terbuka');
  if (fokusSebelum) fokusSebelum.focus();
}
function geser(arah) {
  const baru = lbIndeks + arah;
  if (baru < 0 || baru >= daftarTersaring.length) return;
  lbIndeks = baru;
  isiLb();
}

lbPrev.addEventListener('click', () => geser(-1));
lbNext.addEventListener('click', () => geser(1));
lbTutup.addEventListener('click', tutupLb);
lb.addEventListener('click', e => { if (e.target === lb) tutupLb(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !lb.hidden) tutupLb();
  if (lb.hidden) return;
  if (e.key === 'ArrowLeft') geser(-1);
  if (e.key === 'ArrowRight') geser(1);
});

// Geser jari ke kiri/kanan untuk pindah foto
let awalSentuh = null;
lbFoto.addEventListener('pointerdown', e => { awalSentuh = e.clientX; });
lbFoto.addEventListener('pointerup', e => {
  if (awalSentuh === null) return;
  const selisih = e.clientX - awalSentuh;
  awalSentuh = null;
  if (Math.abs(selisih) > 50) geser(selisih < 0 ? 1 : -1);
});
lbFoto.addEventListener('pointercancel', () => { awalSentuh = null; });
