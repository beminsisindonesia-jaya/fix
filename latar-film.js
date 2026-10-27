/* =====================================================
   latar-film.js : latar roll film miring (45 derajat) untuk halaman admin & login
   Murni dekorasi. Tidak dibuat di perangkat berspesifikasi rendah
   (?hemat=1 memaksa mati, ?hemat=0 memaksa hidup). Bagi yang mematikan
   animasi di perangkatnya, roll tampil diam.
   ===================================================== */
(function () {
  const param = new URLSearchParams(location.search).get('hemat');
  const lemah = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
             || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (param === '1' || (lemah && param !== '0')) return;          // latar polos saja

  const latar = document.createElement('div');
  latar.className = 'latar-film';
  latar.setAttribute('aria-hidden', 'true');
  latar.style.setProperty('--lubang', 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 40 18\'%3E%3Crect x=\'10\' y=\'5\' width=\'20\' height=\'8\' rx=\'2.4\' fill=\'%23a58a52\'/%3E%3C/svg%3E")');
  latar.style.setProperty('--bingkai', 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 210 120\'%3E%3Crect x=\'6\' y=\'0\' width=\'198\' height=\'120\' rx=\'3\' fill=\'%233a2f1c\'/%3E%3C/svg%3E")');
  const miring = document.createElement('div');
  miring.className = 'film-miring';
  latar.appendChild(miring);
  document.body.prepend(latar);

  const TINGGI_JALUR = 156 + 26;                                   // tinggi pita + jarak antar pita

  function susun() {
    // Sisi persegi yang diputar harus cukup besar agar seluruh layar tertutup setelah dimiringkan
    const sisi = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) * 1.05);
    miring.style.setProperty('--S', sisi + 'px');
    miring.innerHTML = '';
    const jumlah = Math.ceil(sisi / TINGGI_JALUR) + 1;
    for (let i = 0; i < jumlah; i++) {
      const jalur = document.createElement('div');
      jalur.className = 'film-jalur';
      const pita = document.createElement('div');
      pita.className = 'film-pita';
      pita.style.setProperty('--durasi', (i % 2 ? 36 : 28) + 's');  // kecepatan bergantian agar terasa hidup
      jalur.appendChild(pita);
      miring.appendChild(jalur);
    }
  }
  susun();

  let lebarTerakhir = window.innerWidth;
  let jeda;
  window.addEventListener('resize', () => {
    clearTimeout(jeda);
    jeda = setTimeout(() => {
      if (Math.abs(window.innerWidth - lebarTerakhir) > 80) { lebarTerakhir = window.innerWidth; susun(); }
    }, 300);
  });
})();
