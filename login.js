/* =====================================================
   login.js : halaman masuk admin
   Setelah berhasil masuk, pengguna diarahkan ke admin.html
   ===================================================== */

// Catatan kata sandi demo hanya tampil di mode demo (file dibuka dari komputer), tidak pernah di situs asli
if (MODE_DEMO) {
  const catatan = document.getElementById('catatanDemo');
  catatan.innerHTML = 'Mode demo: dokumentasi <strong>inspire123</strong>, aspirasi <strong>aspirasi123</strong>.';
  catatan.hidden = false;
}

const tujuan = peran => peran === 'aspirasi' ? 'aspirasi.html' : 'admin.html';

// Kalau sudah masuk sebelumnya, langsung ke halaman sesuai perannya
if (API.sudahMasuk()) location.replace(tujuan(API.peran()));

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const kolom = document.getElementById('sandi');
  const galat = document.getElementById('loginError');
  const peran = document.getElementById('peran').value;
  const tombol = e.target.querySelector('button[type="submit"]');

  galat.textContent = '';
  tombol.disabled = true;
  let berhasil = false;
  try {
    berhasil = await API.masuk(peran, kolom.value);
  } catch (err) {
    galat.textContent = err.message;                // mis. server bermasalah atau sandi di config.php belum diganti
    tombol.disabled = false;
    return;
  }
  tombol.disabled = false;

  if (!berhasil) {
    galat.textContent = 'Kata sandi salah. Coba lagi.';
    kolom.classList.add('invalid');
    kolom.select();
    return;
  }
  location.href = tujuan(peran);
});

/* =====================================================
   EFEK SOROTAN MOUSE (Khusus Desktop) - FIXED
   ===================================================== */
const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (isDesktop) {
  document.body.addEventListener('pointermove', (e) => {
    // Ubah koordinat pixel menjadi persentase (0% - 100%)
    const xPersen = (e.clientX / window.innerWidth) * 100;
    const yPersen = (e.clientY / window.innerHeight) * 100;
    
    // Kirim persentase ke CSS
    document.body.style.setProperty('--mx', `${xPersen}%`);
    document.body.style.setProperty('--my', `${yPersen}%`);
  });
}