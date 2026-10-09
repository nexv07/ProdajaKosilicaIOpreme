const korisnikElement = document.getElementById('korisnik');
const formaNaloga = document.getElementById('forma-naloga');
const poruka = document.getElementById('poruka');

function prikaziPoruku(tekst, uspesno) {
  poruka.textContent = tekst;
  poruka.className = 'poruka ' + (uspesno ? 'uspesno' : 'neuspesno');
}

function popuniFormu(rezultat) {
  document.getElementById('ime').value = rezultat.ime ?? '';
  document.getElementById('prezime').value = rezultat.prezime ?? '';
  document.getElementById('email').value = rezultat.email ?? '';
  document.getElementById('broj-telefona').value = rezultat.brojTelefona ?? '';
}

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan) {
      window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html';
      return;
    }
    popuniFormu(rezultat);
    const adminLink = rezultat.role === 'Admin' ? '<a class="kreiraj-oglas" href="../Admin/Admin.html">Admin</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a>' : '';
    korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a>${adminLink}<button class="odjava" type="button">Odjava</button></div>`;
    const imeDugme = korisnikElement.querySelector('.korisnicko-ime');
    const padajuciMeni = korisnikElement.querySelector('.padajuci-meni');
    imeDugme.addEventListener('click', () => {
      imeDugme.classList.remove('rotacija');
      void imeDugme.offsetWidth;
      imeDugme.classList.add('rotacija');
      const otvoren = padajuciMeni.classList.toggle('otvoren');
      imeDugme.setAttribute('aria-expanded', otvoren);
    });
    korisnikElement.querySelector('.odjava').addEventListener('click', () => {
      fetch('../Baza/api.php?akcija=odjava', { method: 'POST' }).then(() => window.location.reload());
    });
  })
  .catch(() => { window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html'; });

formaNaloga.addEventListener('submit', async dogadjaj => {
  dogadjaj.preventDefault();
  const podaci = Object.fromEntries(new FormData(formaNaloga));
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=izmeniNalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(podaci)
    });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) {
      prikaziPoruku(rezultat.poruka, false);
      return;
    }
    document.getElementById('lozinku').value = '';
    document.getElementById('potvrda-lozinke').value = '';
    prikaziPoruku(rezultat.poruka, true);
    const imeDugme = korisnikElement.querySelector('.korisnicko-ime');
    if (imeDugme) imeDugme.textContent = rezultat.korisnickoIme;
  } catch (greska) {
    prikaziPoruku('Server nije dostupan. Pokrenite Apache i MySQL u XAMPP-u.', false);
  }
});
