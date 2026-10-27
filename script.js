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
// Ada jeda antara batas "nyala" (20 px) dan "mati" (8 px) supaya navbar tidak berkedip
// bolak-balik ketika posisi scroll berada di sekitar batas (sering terjadi di HP).
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
   3. TUJUH NILAI: segi tujuh yang menyala mengikuti scroll
   Bagian #nilai dibuat tinggi dan panggungnya menempel di layar. Posisi scroll diubah
   menjadi "waktu" (u) pada garis waktu di bawah; semua tampilan dihitung dari u.
   Karena murni fungsi dari posisi scroll, scroll ke atas otomatis memutar balik gerakan.
   ===================================================== */
(function () {
  const bagian = document.getElementById('nilai');
  if (!bagian) return;

  const panggung = bagian.querySelector('.nilai-panggung');
  const kanvas = bagian.querySelector('.nilai-kanvas');
  const svg = bagian.querySelector('.nilai-svg');
  const tipis = bagian.querySelector('.nilai-tipis');
  const sisi = [...bagian.querySelectorAll('.nilai-sisi')];
  const titik = [...bagian.querySelectorAll('.nilai-titik')].map(g => ({ isi: g.querySelector('.isi'), cincin: g.querySelector('.cincin') }));
  const label = [...bagian.querySelectorAll('.nilai-label')];
  const percik = bagian.querySelector('.nilai-percik');
  const inspire = bagian.querySelector('.nilai-inspire');
  const petunjuk = bagian.querySelector('.nilai-petunjuk');
  const keterangan = bagian.querySelector('.nilai-keterangan');

  const titikXY = titik.map(t => [Number(t.isi.getAttribute('cx')), Number(t.isi.getAttribute('cy'))]);
  const GESER = [[0, -26], [30, -4], [30, 0], [30, 26], [-30, 26], [-30, 0], [-30, -4]]; // jarak label dari sudutnya

  // Keterangan untuk HP: satu blok per nilai, ditumpuk lalu dipudar-silangkan
  const blok = label.map(l => {
    const el = document.createElement('div');
    el.className = 'nilai-ket-blok';
    const n = document.createElement('strong');
    n.textContent = l.querySelector('.nilai-nama').textContent;
    const d = document.createElement('span');
    d.textContent = l.querySelector('.nilai-ket').textContent;
    el.append(n, d);
    keterangan.appendChild(el);
    return el;
  });

  // Letak label dihitung dari letak sudut; berbeda untuk laptop (nama di sekeliling) dan HP (huruf saja)
  function susun() {
    const hp = window.matchMedia('(max-width: 767px)').matches;
    bagian.classList.toggle('mode-hp', hp);
    const vb = hp ? [200, 110, 600, 570] : [0, 0, 1000, 760];
    svg.setAttribute('viewBox', vb.join(' '));
    kanvas.style.aspectRatio = `${vb[2]} / ${vb[3]}`;
    label.forEach((el, k) => {
      const [x, y] = titikXY[k];
      let ax, ay;
      if (hp) {
        const dx = x - 500, dy = y - 420, p = Math.hypot(dx, dy);
        ax = x + dx / p * 36; ay = y + dy / p * 36;               // huruf tepat di luar sudut
      } else {
        ax = x + GESER[k][0]; ay = y + GESER[k][1];
      }
      el.style.setProperty('--x', ((ax - vb[0]) / vb[2] * 100) + '%');
      el.style.setProperty('--y', ((ay - vb[1]) / vb[3] * 100) + '%');
    });
  }
  susun();

  // Pengguna yang mematikan animasi: tampilkan segi tujuh lengkap, tanpa gerakan
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bagian.classList.add('statis');
    window.addEventListener('resize', susun);
    return;
  }
  bagian.classList.add('berjalan');

  /* ----- garis waktu (satuan bebas; total 19) ----- */
  const A = [1.0, 3.2, 4.9, 6.6, 8.3, 10.0, 11.7];             // saat garis tiba di tiap sudut (sudut pertama langsung ada)
  const MULAI_SISI = [2.2, 3.9, 5.6, 7.3, 9.0, 10.7, 12.8];    // saat garis ke-j mulai menjalar (yang ke-7 menutup bentuk)
  const DURASI_SISI = [1, 1, 1, 1, 1, 1, 0.9];
  const TOTAL = 19.0;

  const seg = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));
  const keluar = t => 1 - Math.pow(1 - t, 3);
  const halus = t => t * t * (3 - 2 * t);
  const masukKeluar = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pantul = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function terapkan(u) {
    const muncul = seg(u, 0, .5);
    const pudar = keluar(seg(u, 14.6, 17.0));                    // segi tujuh memudar saat INSPIRE naik
    const tampil = muncul * (1 - pudar);

    kanvas.style.opacity = tampil;
    kanvas.style.transform = `scale(${1 - .1 * pudar})`;
    kanvas.style.setProperty('--kilau', Math.sin(Math.PI * seg(u, 13.7, 14.8)).toFixed(3));

    // 1) segi tujuh tipis tergambar
    tipis.style.strokeDashoffset = 1 - masukKeluar(seg(u, 0, 1.0));

    // 2) garis tebal menjalar dari sudut ke sudut, dengan percikan di ujungnya
    let jalan = -1, posisi = 0;
    sisi.forEach((g, j) => {
      const t = halus(seg(u, MULAI_SISI[j], MULAI_SISI[j] + DURASI_SISI[j]));
      g.style.strokeDashoffset = 1 - t;
      g.style.opacity = t > 0 ? 1 : 0;
      if (t > 0 && t < 1) { jalan = j; posisi = t; }
    });
    if (jalan >= 0) {
      const [x1, y1] = titikXY[jalan], [x2, y2] = titikXY[(jalan + 1) % 7];
      percik.setAttribute('cx', x1 + (x2 - x1) * posisi);
      percik.setAttribute('cy', y1 + (y2 - y1) * posisi);
      percik.style.opacity = 1;
    } else {
      percik.style.opacity = 0;
    }

    // 3) buletan muncul begitu garis tiba; cincin cahaya memancar sekali
    titik.forEach((t, k) => {
      const s = seg(u, A[k], A[k] + .35);
      t.isi.style.transform = `scale(${s <= 0 ? 0 : pantul(s)})`;
      const r = seg(u, A[k], A[k] + .8);
      t.cincin.style.transform = `scale(${1 + 3 * keluar(r)})`;
      t.cincin.style.opacity = r > 0 && r < 1 ? (1 - r) * .85 : 0;
    });

    // 4) nilai dan deskripsinya naik dari bawah setelah buletannya muncul
    const lp = label.map((el, k) => {
      const p = seg(u, A[k] + .1, A[k] + .75);
      el.style.opacity = p;
      el.style.setProperty('--naik', ((1 - keluar(p)) * 28) + 'px');
      return p;
    });
    blok.forEach((el, k) => {                                    // keterangan HP: yang lama memudar saat yang baru naik
      const berikut = k < 6 ? lp[k + 1] : 0;
      el.style.opacity = lp[k] * (1 - berikut) * tampil;
      el.style.transform = `translateY(${(1 - keluar(lp[k])) * 18 - keluar(berikut) * 14}px)`;
    });

    // 5) tulisan INSPIRE naik dari bawah ke tengah, segi tujuh memudar
    const naik = seg(u, 14.6, 17.6);
    inspire.style.opacity = keluar(seg(u, 14.6, 15.9));
    inspire.style.transform = `translate(-50%, calc(-50% + ${(1 - masukKeluar(naik)) * panggung.clientHeight * .62}px)) scale(${1.14 - .14 * keluar(naik)})`;
    bagian.classList.toggle('selesai', u >= 17.8);               // efek kilau dan denyut setelah tiba di tengah

    // 6) cahaya latar dan petunjuk "gulir"
    panggung.style.setProperty('--glow', (.2 + .8 * seg(u, 1, 13.7) + .7 * seg(u, 15.5, 17.8)).toFixed(3));
    petunjuk.style.opacity = seg(u, .5, 1.2) * (1 - seg(u, 2.4, 3.2));
  }

  /* ----- posisi scroll -> waktu ----- */
  let terakhir = -1, menunggu = false;
  function hitung() {
    menunggu = false;
    const tinggi = panggung.clientHeight;
    const kotak = bagian.getBoundingClientRect();
    const awal = .4 * tinggi;                                    // animasi mulai saat bagian ini baru 40% masuk layar
    const total = bagian.offsetHeight - tinggi + awal;
    const u = Math.min(1, Math.max(0, (awal - kotak.top) / total)) * TOTAL;
    if (Math.abs(u - terakhir) < 0.0005) return;
    terakhir = u;
    terapkan(u);
  }
  function jadwalkan() { if (!menunggu) { menunggu = true; requestAnimationFrame(hitung); } }

  window.addEventListener('scroll', jadwalkan, { passive: true });
  // Di HP, bilah alamat yang muncul/hilang saat scroll juga memicu "resize". Letak label hanya
  // disusun ulang bila LEBAR layar berubah (misalnya HP diputar), supaya scroll tetap ringan.
  let lebarSusun = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lebarSusun) { lebarSusun = window.innerWidth; susun(); }
    terakhir = -1;
    jadwalkan();
  });
  hitung();
})();

/* =====================================================
   4. ROLL FOTO: dua baris foto yang berjalan berlawanan arah
   Baris ikhwan bergerak kanan ke kiri, baris akhwat kiri ke kanan.
   Tampil seperti klip film jadul; tidak berhenti saat disentuh dan tidak bisa diklik.
   Foto diambil dari api.js (API.ambilFotoPilihan).
   ===================================================== */
const KECEPATAN_ROLL = 50; // piksel per detik (makin besar, makin cepat)

// Satu bingkai film (tidak interaktif: tidak bisa diklik, tidak ada pop-up)
function buatFotoRoll(item, salinan) {
  const bingkai = document.createElement('div');
  bingkai.className = 'roll-item';
  if (salinan) bingkai.setAttribute('aria-hidden', 'true'); // salinan hanya untuk sambungan animasi

  const foto = document.createElement('div');
  foto.className = 'roll-foto';
  const rasio = Math.min(2, Math.max(0.6, Number(item.rasio) || 4 / 3)); // batas wajar agar bingkai tidak ekstrem
  foto.style.setProperty('--rasio', rasio);
  if (item.foto) {
    const img = document.createElement('img');
    img.src = item.foto;
    img.alt = item.keterangan || 'Dokumentasi kegiatan';
    img.loading = 'lazy';
    img.draggable = false;
    foto.appendChild(img);
  } else {
    foto.textContent = 'Foto pilihan';
  }
  bingkai.appendChild(foto);
  return bingkai;
}

function isiRoll(roll, daftar) {
  const track = roll.querySelector('.roll-track');
  track.innerHTML = '';
  track.classList.remove('roll-kosong');
  roll.classList.remove('diam');

  if (daftar.length === 0) {
    roll.classList.add('diam');
    track.textContent = 'Belum ada foto pilihan.';
    track.classList.add('roll-kosong');
    return;
  }

  if (hematGerak) {                    // tanpa animasi: pita bisa digeser dengan jari
    roll.classList.add('diam');
    daftar.forEach(item => track.appendChild(buatFotoRoll(item, false)));
    return;
  }

  // Satu putaran harus lebih lebar dari layar, jadi foto diulang sampai cukup panjang
  const target = window.innerWidth * 1.2;
  let i = 0;
  while ((i === 0 || track.getBoundingClientRect().width < target) && i < 80) {
    track.appendChild(buatFotoRoll(daftar[i % daftar.length], false));
    i++;
  }
  const lebarPutaran = track.getBoundingClientRect().width;

  // Salinan putaran agar sambungan animasi mulus
  const asli = Array.from(track.children);
  asli.forEach(el => {
    const salinan = el.cloneNode(true);
    salinan.setAttribute('aria-hidden', 'true');
    track.appendChild(salinan);
  });
  track.style.setProperty('--durasi', (lebarPutaran / KECEPATAN_ROLL) + 's');
}

let fotoPilihanCache = [];
function gambarRoll() {
  isiRoll(document.getElementById('rollIkhwan'), fotoPilihanCache.filter(f => f.kelompok === 'ikhwan'));
  isiRoll(document.getElementById('rollAkhwat'), fotoPilihanCache.filter(f => f.kelompok === 'akhwat'));
}

async function muatFotoPilihan() {
  try {
    fotoPilihanCache = await API.ambilFotoPilihan();
    gambarRoll();
  } catch (err) {
    document.getElementById('rollIkhwan').textContent = 'Foto belum bisa dimuat. Coba lagi nanti.';
  }
}
muatFotoPilihan();

let lebarTerakhir = window.innerWidth;
let jedaUkuran;
window.addEventListener('resize', () => {
  clearTimeout(jedaUkuran);
  jedaUkuran = setTimeout(() => {
    if (Math.abs(window.innerWidth - lebarTerakhir) > 60) { lebarTerakhir = window.innerWidth; gambarRoll(); }
  }, 250);
});

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
