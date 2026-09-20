const korisnikElement = document.getElementById('korisnik');
const formaOglasa = document.getElementById('forma-oglasa');
const poruka = document.getElementById('poruka');

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan) {
      window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html';
      return;
    }
    korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="KreiranjeOglasa.html">Kreiraj oglas</a><button class="odjava" type="button">Odjava</button></div>`;
    const imeDugme = korisnikElement.querySelector('.korisnicko-ime');
    const padajuciMeni = korisnikElement.querySelector('.padajuci-meni');
    imeDugme.addEventListener('click', () => {
      imeDugme.classList.toggle('rotacija');
      const otvoren = padajuciMeni.classList.toggle('otvoren');
      imeDugme.setAttribute('aria-expanded', otvoren);
    });
    korisnikElement.querySelector('.odjava').addEventListener('click', () => {
      fetch('../Baza/api.php?akcija=odjava', { method: 'POST' }).then(() => window.location.reload());
    });
  })
  .catch(() => { korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>'; });

formaOglasa.addEventListener('submit', async dogadjaj => {
  dogadjaj.preventDefault();
  const podaci = new FormData(formaOglasa);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=kreirajOglas', { method: 'POST', body: podaci });
    const tekstOdgovora = await odgovor.text();
    let rezultat;
    try { rezultat = JSON.parse(tekstOdgovora); }
    catch (greska) { throw new Error(tekstOdgovora || `HTTP ${odgovor.status}`); }
    if (!rezultat.uspeh) {
      poruka.textContent = rezultat.poruka;
      poruka.className = 'poruka neuspesno';
      return;
    }
    poruka.textContent = rezultat.poruka;
    poruka.className = 'poruka uspesno';
    formaOglasa.reset();
    setTimeout(() => { window.location.href = '../Oglasi/Oglasi.html'; }, 700);
  } catch (greska) {
    poruka.textContent = greska.message || 'Server nije dostupan. Pokrenite Apache i MySQL u XAMPP-u.';
    poruka.className = 'poruka neuspesno';
  }
});
