/* =====================================================
   0. MODE HEMAT: matikan efek berat di HP spesifikasi rendah
   (inti prosesor <= 4 atau RAM <= 2 GB). ?hemat=1 memaksa
   aktif, ?hemat=0 memaksa mati, berguna untuk uji coba.
   ===================================================== */
const parameter = new URLSearchParams(location.search).get('hemat');
const perangkatLemah = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                    || (navigator.deviceMemory && navigator.deviceMemory <= 2);
if (parameter === '1' || (perangkatLemah && parameter !== '0')) {
  document.documentElement.classList.add('hemat');
}

/* =====================================================
   1. MENU HP (buka/tutup) + bayangan navbar saat scroll
   ===================================================== */
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
const navbar = document.getElementById('navbar');

menuBtn.addEventListener('click', () => {
  const terbuka = menu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', terbuka);
});

// Menu tertutup otomatis setelah salah satu link diklik
menu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  });
});

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

/* =====================================================
   2. LOGO HERO: miring mengikuti kursor / jari
   ===================================================== */
const heroLogo = document.getElementById('heroLogo');
const logoCard = document.getElementById('logoCard');
const hematGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                || document.documentElement.classList.contains('hemat');

function miringkan(x, y) {
  const kotak = heroLogo.getBoundingClientRect();
  // Posisi kursor relatif terhadap tengah logo, nilainya -0.5 sampai 0.5
  const px = (x - kotak.left) / kotak.width - 0.5;
  const py = (y - kotak.top) / kotak.height - 0.5;
  logoCard.style.transform = `rotateY(${px * 24}deg) rotateX(${-py * 24}deg)`;
}

if (!hematGerak) {
  heroLogo.addEventListener('pointermove', e => miringkan(e.clientX, e.clientY));
  heroLogo.addEventListener('pointerleave', () => { logoCard.style.transform = ''; });
}

// Sorotan cahaya di hero mengikuti kursor
const hero = document.getElementById('beranda');
hero.addEventListener('pointermove', e => {
  if (hematGerak || e.pointerType !== 'mouse') return;
  const k = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', (e.clientX - k.left) + 'px');
  hero.style.setProperty('--my', (e.clientY - k.top) + 'px');
});

/* Efek miring 3D + kilau untuk kartu (hanya dengan mouse) */
function pasangTilt(el) {
  if (hematGerak) return;
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const k = el.getBoundingClientRect();
    const px = (e.clientX - k.left) / k.width;
    const py = (e.clientY - k.top) / k.height;
    el.style.transform = `perspective(700px) rotateY(${(px - 0.5) * 10}deg) rotateX(${(0.5 - py) * 10}deg) translateY(-3px)`;
    el.style.setProperty('--gx', (px * 100) + '%');
    el.style.setProperty('--gy', (py * 100) + '%');
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}
document.querySelectorAll('.tilt').forEach(pasangTilt);

/* Muncul halus saat elemen masuk layar */
const targetReveal = document.querySelectorAll('.section h2, .section .lead, .quote, .values, .filters, .gallery, .form');
if (!hematGerak && 'IntersectionObserver' in window) {
  const pengamat = new IntersectionObserver(daftar => {
    daftar.forEach(d => {
      if (d.isIntersecting) { d.target.classList.add('in'); pengamat.unobserve(d.target); }
    });
  }, { threshold: 0.12 });
  targetReveal.forEach(el => { el.classList.add('reveal'); pengamat.observe(el); });
}

/* =====================================================
   3. TUJUH NILAI: klik untuk membuka makna
   ===================================================== */
const kartuNilai = document.querySelectorAll('.value');

kartuNilai.forEach(kartu => {
  kartu.addEventListener('click', () => {
    const sudahBuka = kartu.getAttribute('aria-expanded') === 'true';
    // Tutup semua dulu, lalu buka yang diklik (kalau tadinya tertutup)
    kartuNilai.forEach(k => k.setAttribute('aria-expanded', 'false'));
    kartu.setAttribute('aria-expanded', !sudahBuka);
  });
});

/* =====================================================
   4. GALERI: data dari api.js, filter, dan pop-up
   ===================================================== */
const galeri = document.getElementById('gallery');

// Galeri menampilkan kegiatan TERBARU saja. Kartu ke-6 selalu kartu arsip (tautan ke Google Drive).
const BATAS_KARTU = 5;
let semuaDokumentasi = [];
let filterAktif = 'semua';

// Satu kartu = satu kegiatan (memakai textContent agar aman dari kode berbahaya)
function buatKartu(item) {
  const kartu = document.createElement('button');
  kartu.className = 'card tilt';
  kartu.dataset.kategori = item.kategori;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.judul;
    img.loading = 'lazy';
    thumb.appendChild(img);
  } else {
    thumb.textContent = 'Foto kegiatan';
  }

  const isi = document.createElement('div');
  isi.className = 'card-body';
  const judul = document.createElement('h3');
  judul.textContent = item.judul;
  const tgl = document.createElement('p');
  tgl.textContent = formatTanggal(item.tanggal);
  isi.append(judul, tgl);

  kartu.append(thumb, isi);
  kartu.addEventListener('click', () => bukaPopup(item));
  pasangTilt(kartu);
  galeri.appendChild(kartu);
}

// Kartu khusus: mengarah ke arsip lengkap di Google Drive
function buatKartuArsip() {
  const kartu = document.createElement('a');
  kartu.className = 'card card-arsip tilt';
  kartu.href = ARSIP_LENGKAP;
  kartu.target = '_blank';
  kartu.rel = 'noopener noreferrer';

  const ikon = document.createElement('span');
  ikon.className = 'arsip-ikon';
  ikon.textContent = '\u2192';
  const judul = document.createElement('strong');
  judul.textContent = 'Lihat arsip lengkap';
  const ket = document.createElement('p');
  ket.textContent = 'Seluruh dokumentasi tersimpan di Google Drive';

  kartu.append(ikon, judul, ket);
  pasangTilt(kartu);
  galeri.appendChild(kartu);
}

// Susun ulang galeri sesuai filter: BATAS_KARTU kegiatan terbaru + kartu arsip
function tampilkanGaleri() {
  galeri.innerHTML = '';
  const terpilih = semuaDokumentasi.filter(d => filterAktif === 'semua' || d.kategori === filterAktif);

  terpilih.slice(0, BATAS_KARTU).forEach(buatKartu);

  if (terpilih.length === 0) {
    const kosong = document.createElement('p');
    kosong.className = 'kosong-galeri';
    kosong.textContent = 'Belum ada kegiatan di kategori ini.';
    galeri.appendChild(kosong);
  }
  buatKartuArsip();
}

// Ambil data lewat api.js lalu tampilkan. Isi data diatur di api.js (dan nanti di server).
async function muatDokumentasi() {
  try {
    semuaDokumentasi = await API.ambilSemua(); // sudah urut dari yang terbaru
    tampilkanGaleri();
  } catch (err) {
    galeri.textContent = 'Dokumentasi belum bisa dimuat. Coba lagi nanti.';
  }
}
muatDokumentasi();

// Filter kategori
const tombolFilter = document.querySelectorAll('.filter');

tombolFilter.forEach(tombol => {
  tombol.addEventListener('click', () => {
    tombolFilter.forEach(t => t.classList.remove('active'));
    tombol.classList.add('active');
    filterAktif = tombol.dataset.filter;
    tampilkanGaleri();
  });
});

// Pop-up foto besar
const lightbox = document.getElementById('lightbox');
const lbClose = document.getElementById('lbClose');

function bukaPopup(item) {
  document.getElementById('lbTitle').textContent = item.judul;
  document.getElementById('lbMeta').textContent = `${formatTanggal(item.tanggal)} · ${item.kategori}`;
  const area = document.getElementById('lbImg');
  area.innerHTML = '';
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.judul;
    area.appendChild(img);
  } else {
    area.textContent = 'Foto kegiatan';
  }
  // Tombol album Drive hanya muncul jika kegiatan punya tautan yang valid
  const album = document.getElementById('lbAlbum');
  if (tautanAman(item.album)) { album.href = item.album; album.hidden = false; }
  else { album.hidden = true; }

  lightbox.hidden = false;
  lbClose.focus();
}
function tutupPopup() { lightbox.hidden = true; }

lbClose.addEventListener('click', tutupPopup);
lightbox.addEventListener('click', e => { if (e.target === lightbox) tutupPopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutupPopup(); });

/* =====================================================
   5. FORM ASPIRASI: hitung huruf, validasi, notifikasi
   ===================================================== */
const form = document.getElementById('aspirasiForm');
const pesan = document.getElementById('pesan');
const counter = document.getElementById('counter');
const pesanError = document.getElementById('pesanError');
const toast = document.getElementById('toast');

pesan.addEventListener('input', () => {
  counter.textContent = `${pesan.value.length} / 500`;
  counter.classList.toggle('near', pesan.value.length > 450);
  if (pesan.value.trim().length >= 10) {
    pesan.classList.remove('invalid');
    pesanError.textContent = '';
  }
});

function tampilkanToast(teks) {
  toast.textContent = teks;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

form.addEventListener('submit', e => {
  e.preventDefault(); // mencegah halaman reload

  if (pesan.value.trim().length < 10) {
    pesan.classList.add('invalid');
    pesanError.textContent = 'Tulis minimal 10 karakter agar aspirasimu bisa kami pahami.';
    pesan.focus();
    return;
  }

  const data = {
    nama: form.nama.value.trim() || 'Anonim',
    pesan: pesan.value.trim()
  };

  // TODO (Hadi): kirim `data` ke server, contohnya:
  // fetch('/api/aspirasi', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
  console.log('Aspirasi siap dikirim:', data);

  form.reset();
  counter.textContent = '0 / 500';
  tampilkanToast('Aspirasi terkirim. Terima kasih!');
});

/* =====================================================
   6. ANGKA BERHITUNG: 0, 1, 2, 3 ... sampai angka target
   Mulai saat bagian angka terlihat di layar (sekali saja).
   Angka target diatur di index.html lewat data-target.
   ===================================================== */
const angkaStat = document.querySelectorAll('.stat-num');
const kotakStat = document.getElementById('stats');

function hitungNaik(el, jeda) {
  const target = Number(el.dataset.target);
  const akhiran = el.dataset.suffix || '';
  const durasi = 2000; // milidetik (2 detik)
  el.textContent = '0' + akhiran;

  setTimeout(() => {
    const mulai = performance.now();
    function langkah(sekarang) {
      const progres = Math.min((sekarang - mulai) / durasi, 1);
      const halus = 1 - Math.pow(1 - progres, 3); // cepat di awal, melambat di akhir
      el.textContent = Math.round(target * halus) + akhiran;
      if (progres < 1) requestAnimationFrame(langkah);
    }
    requestAnimationFrame(langkah);
  }, jeda);
}

// Mode hemat / animasi dimatikan: angka langsung tampil apa adanya
if (kotakStat && !hematGerak && 'IntersectionObserver' in window) {
  angkaStat.forEach(el => { el.textContent = '0' + (el.dataset.suffix || ''); });

  const pengamatStat = new IntersectionObserver(daftar => {
    if (daftar[0].isIntersecting) {
      angkaStat.forEach((el, i) => hitungNaik(el, i * 150)); // berurutan, selisih 0,15 detik
      pengamatStat.disconnect();
    }
  }, { threshold: 0.5 });
  pengamatStat.observe(kotakStat);
}
