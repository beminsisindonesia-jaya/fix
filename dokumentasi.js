/* =====================================================
   dokumentasi.js : halaman "Seluruh dokumentasi"
   Data diambil lewat api.js (API.ambilSemua).
   Fitur: pencarian judul, filter kategori / divisi / bulan, penggeser tanggal,
   daftar per bulan, "muat lebih banyak", laci filter di HP (tutup dengan tombol ×,
   klik area kosong, atau Esc), dan pop-up foto yang bisa maju/mundur
   (tombol, panah keyboard, geser jari).
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
   2. KEADAAN HALAMAN
   ===================================================== */
const HALAMAN = 24;                 // jumlah foto yang tampil per "halaman"

const elDaftar = document.getElementById('dokDaftar');
const elRingkas = document.getElementById('dokRingkas');
const elChips = document.getElementById('dokChips');
const elDivisi = document.getElementById('dokDivisi');
const elBulan = document.getElementById('dokBulan');
const inputCari = document.getElementById('cariJudul');
const elLebih = document.getElementById('dokLebih');
const elWaktu = document.getElementById('dokWaktu');
const elRentang = document.getElementById('dokRentang');
const elBubble = document.getElementById('dokBubble');
const elTicks = document.getElementById('dokTicks');
const elReset = document.getElementById('dokReset');

let semua = [];                     // seluruh dokumentasi (terbaru di atas)
let kategoriAktif = 'semua';
let divisiAktif = 'semua';
let bulanAktif = 'semua';           // 'YYYY-MM' atau 'semua'
let tanggalAktif = null;            // 'YYYY-MM-DD' atau null (semua tanggal)
let dasar = [];                     // hasil saringan kategori + divisi
let tglUrut = [];                   // tanggal unik dari "dasar", dari terlama ke terbaru
let daftarTersaring = [];           // yang sedang ditampilkan (juga dipakai pop-up)
let batas = HALAMAN;
let kataCari = '';                  // kata kunci pencarian judul (berlaku untuk SEMUA data, bukan hanya yang tampil)

const namaBulan = iso => {
  const [t, b] = iso.split('-').map(Number);
  return new Date(t, b - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};
const tanggalPendek = iso => {
  const [t, b, h] = iso.split('-').map(Number);
  return new Date(t, b - 1, h).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Ada filter yang sedang aktif?
const adaFilter = () => kategoriAktif !== 'semua' || divisiAktif !== 'semua' || bulanAktif !== 'semua' || Boolean(kataCari) || Boolean(tanggalAktif);
const jumlahFilter = () => [kategoriAktif !== 'semua', divisiAktif !== 'semua', bulanAktif !== 'semua', Boolean(kataCari), Boolean(tanggalAktif)].filter(Boolean).length;

function hapusSemuaFilter() {
  kategoriAktif = 'semua'; divisiAktif = 'semua'; bulanAktif = 'semua'; tanggalAktif = null; kataCari = '';
  batas = HALAMAN;
  inputCari.value = '';
  bangunChips(); bangunDivisi(); bangunBulan(); renderSemua();
}

/* =====================================================
   3. PENYARING: kategori (tombol), divisi dan bulan (pilihan)
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

function bangunBulan() {
  elBulan.innerHTML = '';
  elBulan.add(new Option('Semua bulan', 'semua'));
  [...new Set(semua.map(d => d.tanggal.slice(0, 7)))].sort().reverse()
    .forEach(ym => elBulan.add(new Option(namaBulan(ym), ym)));
  elBulan.value = bulanAktif;
}
elBulan.addEventListener('change', () => {
  bulanAktif = elBulan.value;
  tanggalAktif = null;
  batas = HALAMAN;
  renderSemua();
});

/* =====================================================
   4. PENGGESER TANGGAL
   ===================================================== */
function posisiSlider(idx) {
  const n = tglUrut.length;
  elWaktu.style.setProperty('--pos', n > 1 ? idx / (n - 1) : 1);
  elBubble.textContent = tglUrut[idx] ? tanggalPendek(tglUrut[idx]) : '';
}

function aturSlider() {
  const n = tglUrut.length;
  elWaktu.hidden = n < 2;
  if (n < 2) return;

  elRentang.max = n - 1;
  elTicks.innerHTML = '';
  if (n <= 60) tglUrut.forEach((t, i) => {                      // titik penanda disembunyikan bila terlalu padat
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
  renderDaftar();
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
    img.src = item.mini || item.foto;               // gambar kecil (mini) untuk kartu; foto penuh hanya di pop-up
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
  judul.textContent = item.judul;
  const meta = document.createElement('p');
  meta.textContent = tanggalPendek(item.tanggal) + (item.divisi ? ' · ' + item.divisi : '');
  isi.append(judul, meta);

  kartu.append(thumb, isi);
  kartu.addEventListener('click', () => bukaLb(indeks));
  return kartu;
}

// Memperbarui penanda filter: lencana di tombol Filter dan tombol "Hapus semua filter"
function perbaruiPenanda() {
  const n = jumlahFilter();
  const lencana = document.getElementById('lencanaFilter');
  lencana.textContent = n;
  lencana.hidden = n === 0;
  document.getElementById('sidebarReset').hidden = n === 0;
}

function renderDaftar() {
  daftarTersaring = tanggalAktif ? dasar.filter(d => d.tanggal === tanggalAktif) : dasar;
  elDaftar.innerHTML = '';

  const keterangan = [];
  if (kategoriAktif !== 'semua') keterangan.push(namaKategori(kategoriAktif));
  if (divisiAktif !== 'semua') keterangan.push('divisi ' + divisiAktif);
  if (bulanAktif !== 'semua') keterangan.push(namaBulan(bulanAktif));
  if (kataCari) keterangan.push(`"${inputCari.value.trim()}"`);
  if (tanggalAktif) keterangan.push(tanggalPendek(tanggalAktif));
  elRingkas.textContent = `${daftarTersaring.length} dokumentasi` + (keterangan.length ? ' · ' + keterangan.join(' · ') : '');
  perbaruiPenanda();

  if (daftarTersaring.length === 0) {
    const kosong = document.createElement('div');
    kosong.className = 'dok-kosong';
    kosong.append(adaFilter() ? 'Tidak ada dokumentasi yang cocok dengan pilihanmu.' : 'Belum ada dokumentasi.');
    if (adaFilter()) {
      const ulang = document.createElement('button');
      ulang.type = 'button';
      ulang.className = 'btn btn-line';
      ulang.textContent = 'Hapus semua filter';
      ulang.addEventListener('click', hapusSemuaFilter);
      kosong.append(document.createElement('br'), ulang);
    }
    elDaftar.appendChild(kosong);
    elLebih.hidden = true;
    return;
  }

  const tampil = tanggalAktif ? daftarTersaring : daftarTersaring.slice(0, batas);
  let grid = null;
  let kunciSekarang = null;
  tampil.forEach((item, i) => {
    const kunci = tanggalAktif ? 'tanggal' : item.tanggal.slice(0, 7);
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
    (divisiAktif === 'semua' || d.divisi === divisiAktif) &&
    (bulanAktif === 'semua' || d.tanggal.startsWith(bulanAktif)) &&
    (!kataCari || d.judul.toLowerCase().includes(kataCari)));
  tglUrut = [...new Set(dasar.map(d => d.tanggal))].sort();
  if (tanggalAktif && !tglUrut.includes(tanggalAktif)) tanggalAktif = null;
  aturSlider();
  renderDaftar();
}

/* =====================================================
   6. MUAT DATA
   ===================================================== */
async function muat() {
  try {
    semua = await API.ambilSemua();                 // dari server (api/index.php)
    semua.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    bangunChips();
    bangunDivisi();
    bangunBulan();
    renderSemua();
  } catch (err) {
    console.error(err);
    elRingkas.textContent = 'Dokumentasi belum bisa dimuat. Coba lagi nanti.';
  }
}
muat();

/* =====================================================
   7. POP-UP FOTO: maju/mundur lewat tombol, panah keyboard, atau geser jari
   ===================================================== */
const lb = document.getElementById('dokLb');
const lbFoto = document.getElementById('dokLbFoto');
const lbPrev = document.getElementById('dokPrev');
const lbNext = document.getElementById('dokNext');
const lbTutup = document.getElementById('dokLbTutup');
let lbIndeks = -1;
let fokusSebelum = null;

function pil(teks, kelas) {
  const el = document.createElement('span');
  el.className = 'dok-pil' + (kelas ? ' ' + kelas : '');
  el.textContent = teks;
  return el;
}

function isiLb() {
  const item = daftarTersaring[lbIndeks];
  if (!item) return;

  document.getElementById('dokLbJudul').textContent = item.judul;
  const meta = document.getElementById('dokLbMeta');
  meta.innerHTML = '';
  meta.append(pil(formatTanggal(item.tanggal), 'tanggal'), pil(namaKategori(item.kategori)));
  if (item.divisi) meta.append(pil(item.divisi));

  // Gambar kecil tampil seketika, lalu diganti foto penuh begitu selesai dimuat
  lbFoto.innerHTML = '';
  if (item.foto) {
    const img = document.createElement('img');
    img.alt = item.judul;
    img.draggable = false;
    const kecil = item.mini && item.mini !== item.foto;
    img.src = kecil ? item.mini : item.foto;
    if (kecil) {
      img.classList.add('sementara');
      const penuh = new Image();
      penuh.onload = () => { if (daftarTersaring[lbIndeks] === item) { img.src = item.foto; img.classList.remove('sementara'); } };
      penuh.src = item.foto;
    }
    lbFoto.appendChild(img);
  } else {
    lbFoto.textContent = 'Foto kegiatan';
  }

  const banyak = daftarTersaring.length > 1;                   // panah dan penghitung hanya perlu bila ada lebih dari satu foto
  document.getElementById('dokLbHitung').textContent = banyak ? `${lbIndeks + 1} / ${daftarTersaring.length}` : '';
  lbPrev.hidden = lbNext.hidden = !banyak;
  lbPrev.disabled = lbIndeks <= 0;
  lbNext.disabled = lbIndeks >= daftarTersaring.length - 1;

  [lbIndeks - 1, lbIndeks + 1].forEach(i => {                   // siapkan foto sebelah agar geser terasa cepat
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
lb.addEventListener('click', e => { if (e.target === lb) tutupLb(); });   // klik area gelap di luar kotak = tutup

// Fokus keyboard berputar di dalam wadah (Tab / Shift+Tab) selama pop-up atau laci terbuka
function jebakFokus(e, wadah) {
  if (e.key !== 'Tab') return;
  const bisa = [...wadah.querySelectorAll('button, a[href], input, select')].filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
  if (bisa.length === 0) return;
  const awal = bisa[0], akhir = bisa[bisa.length - 1];
  if (!wadah.contains(document.activeElement)) { e.preventDefault(); awal.focus(); }
  else if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir.focus(); }
  else if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal.focus(); }
}

// Geser jari / seret mouse pada foto untuk maju-mundur
let awalSentuh = null;
lbFoto.addEventListener('pointerdown', e => { awalSentuh = e.clientX; });
lbFoto.addEventListener('pointerup', e => {
  if (awalSentuh === null) return;
  const selisih = e.clientX - awalSentuh;
  awalSentuh = null;
  if (Math.abs(selisih) > 50) geser(selisih < 0 ? 1 : -1);
});
lbFoto.addEventListener('pointercancel', () => { awalSentuh = null; });

/* =====================================================
   8. PENCARIAN & LACI FILTER (HP/tablet)
   Laci ditutup lewat: tombol ×, klik area gelap di luar laci, atau tombol Esc.
   ===================================================== */
const sidebar = document.getElementById('sidebar');
const sidebarLatar = document.getElementById('sidebarLatar');
const btnBukaSidebar = document.getElementById('bukaSidebar');
const btnTutupSidebar = document.getElementById('sidebarTutup');
const lajurHP = window.matchMedia('(max-width: 900px)');

// Pencarian judul: menyaring seluruh data (termasuk yang belum ditampilkan lewat "Muat lebih banyak")
inputCari.addEventListener('input', () => {
  kataCari = inputCari.value.trim().toLowerCase();
  tanggalAktif = null;
  batas = HALAMAN;
  renderSemua();
});

function bukaSidebar() {
  sidebar.classList.add('terbuka');
  sidebarLatar.hidden = false;
  document.body.classList.add('filter-terbuka');
  btnBukaSidebar.setAttribute('aria-expanded', 'true');
  btnTutupSidebar.focus();
}
function tutupSidebar() {
  if (!sidebar.classList.contains('terbuka')) return;
  sidebar.classList.remove('terbuka');
  sidebarLatar.hidden = true;
  document.body.classList.remove('filter-terbuka');
  btnBukaSidebar.setAttribute('aria-expanded', 'false');
  if (lajurHP.matches) btnBukaSidebar.focus();
}
btnBukaSidebar.addEventListener('click', bukaSidebar);
btnTutupSidebar.addEventListener('click', tutupSidebar);
sidebarLatar.addEventListener('click', tutupSidebar);
document.getElementById('sidebarReset').addEventListener('click', hapusSemuaFilter);
lajurHP.addEventListener('change', () => { if (!lajurHP.matches) tutupSidebar(); });   // layar diputar/diperlebar: laci tidak perlu lagi

/* =====================================================
   9. KEYBOARD (satu pengendali untuk pop-up foto dan laci filter)
   ===================================================== */
document.addEventListener('keydown', e => {
  if (!lb.hidden) {
    if (e.key === 'Escape') tutupLb();
    else if (e.key === 'ArrowLeft') geser(-1);
    else if (e.key === 'ArrowRight') geser(1);
    else jebakFokus(e, lb.querySelector('.lightbox-box'));
    return;
  }
  if (sidebar.classList.contains('terbuka') && lajurHP.matches) {
    if (e.key === 'Escape') tutupSidebar();
    else jebakFokus(e, sidebar);
  }
});
