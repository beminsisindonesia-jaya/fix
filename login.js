/* =====================================================
   login.js : halaman masuk admin
   Setelah berhasil masuk, pengguna diarahkan ke admin.html
   ===================================================== */

// Kalau sudah masuk sebelumnya, langsung ke halaman admin
if (API.sudahMasuk()) location.replace('admin.html');

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const kolom = document.getElementById('sandi');
  const galat = document.getElementById('loginError');
  const berhasil = await API.masuk(kolom.value);

  if (!berhasil) {
    galat.textContent = 'Kata sandi salah. Coba lagi.';
    kolom.classList.add('invalid');
    kolom.select();
    return;
  }
  location.href = 'admin.html';
});
