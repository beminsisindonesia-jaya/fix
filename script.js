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
   1. NAVBAR: menu HP (buka/tutup) + pil mengambang saat scroll
   ===================================================== */
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
const navbar = document.getElementById('navbar');

// Buka / tutup menu HP (sekaligus memburamkan halaman di belakangnya lewat class di <body>)
function aturMenu(buka) {
  menu.classList.toggle('open', buka);
  document.body.classList.toggle('menu-terbuka', buka);
  menuBtn.setAttribute('aria-expanded', buka);
  menuBtn.setAttribute('aria-label', buka ? 'Tutup menu' : 'Buka menu');
}

menuBtn.addEventListener('click', () => aturMenu(!menu.classList.contains('open')));

// Menu tertutup otomatis setelah salah satu link diklik
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => aturMenu(false)));

// Tutup juga lewat tombol Esc, ketukan di area buram, atau saat layar melebar ke ukuran laptop
document.addEventListener('keydown', e => { if (e.key === 'Escape') aturMenu(false); });
document.addEventListener('click', e => { if (e.target === document.body) aturMenu(false); });
window.matchMedia('(min-width: 768px)').addEventListener('change', e => { if (e.matches) aturMenu(false); });

// Navbar berubah menjadi "pil" mengambang setelah halaman di-scroll sedikit
function aturNavbar() { navbar.classList.toggle('scrolled', window.scrollY > 20); }
window.addEventListener('scroll', aturNavbar, { passive: true });
aturNavbar();

/* =====================================================
   2. PENGATURAN GERAK (animasi roda di logo murni CSS, lihat style.css bagian 18)
   ===================================================== */
const hematGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                || document.documentElement.classList.contains('hemat');

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
   4. ROLL FOTO: dua baris foto yang berjalan berlawanan arah
   Baris ikhwan bergerak kanan ke kiri, baris akhwat kiri ke kanan.
   Foto diambil dari api.js (API.ambilFotoPilihan).
   ===================================================== */
const FOTO_MINIMAL = 8;     // satu putaran minimal 8 foto agar layar lebar selalu penuh
const DETIK_PER_FOTO = 6;   // makin kecil, makin cepat

function buatFotoRoll(item, salinan) {
  const tombol = document.createElement('button');
  tombol.type = 'button';
  tombol.className = 'roll-item';
  if (salinan) {                       // salinan hanya untuk sambungan animasi
    tombol.tabIndex = -1;
    tombol.setAttribute('aria-hidden', 'true');
  }
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.keterangan || 'Dokumentasi kegiatan';
    img.loading = 'lazy';
    img.draggable = false;
    tombol.appendChild(img);
  } else {
    tombol.textContent = 'Foto pilihan';
  }
  tombol.addEventListener('click', () => bukaPopup(item));
  return tombol;
}

function isiRoll(roll, daftar) {
  const track = roll.querySelector('.roll-track');
  track.innerHTML = '';

  if (daftar.length === 0) {
    roll.classList.add('diam');
    track.textContent = 'Belum ada foto pilihan.';
    track.classList.add('roll-kosong');
    return;
  }

  // Satu putaran: ulangi foto bila jumlahnya kurang dari FOTO_MINIMAL
  const putaran = [];
  const jumlah = Math.max(FOTO_MINIMAL, daftar.length);
  for (let i = 0; i < jumlah; i++) putaran.push(daftar[i % daftar.length]);

  putaran.forEach(item => track.appendChild(buatFotoRoll(item, false)));

  if (hematGerak) {
    roll.classList.add('diam');        // tanpa animasi: baris bisa digeser dengan jari
  } else {
    putaran.forEach(item => track.appendChild(buatFotoRoll(item, true))); // salinan agar putaran mulus
    track.style.setProperty('--durasi', (jumlah * DETIK_PER_FOTO) + 's');
  }
}

async function muatFotoPilihan() {
  try {
    const semua = await API.ambilFotoPilihan();
    isiRoll(document.getElementById('rollIkhwan'), semua.filter(f => f.kelompok === 'ikhwan'));
    isiRoll(document.getElementById('rollAkhwat'), semua.filter(f => f.kelompok === 'akhwat'));
  } catch (err) {
    document.getElementById('rollIkhwan').textContent = 'Foto belum bisa dimuat. Coba lagi nanti.';
  }
}
muatFotoPilihan();

// Pop-up foto besar
const lightbox = document.getElementById('lightbox');
const lbClose = document.getElementById('lbClose');

function bukaPopup(item) {
  document.getElementById('lbTitle').textContent = item.keterangan || 'Dokumentasi kegiatan';
  document.getElementById('lbMeta').textContent = item.kelompok === 'akhwat' ? 'Dokumentasi akhwat' : 'Dokumentasi ikhwan';
  const area = document.getElementById('lbImg');
  area.innerHTML = '';
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.keterangan || 'Dokumentasi kegiatan';
    area.appendChild(img);
  } else {
    area.textContent = 'Foto pilihan';
  }
  document.getElementById('lbAlbum').hidden = true; // tombol album dipakai di halaman arsip nanti

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
