const korisnikElement = document.getElementById('korisnik');
const stavkeElement = document.getElementById('stavke-korpe');
const praznaElement = document.getElementById('prazna-korpa');

function prikaziStavke(stavke) {
  stavkeElement.innerHTML = '';
  praznaElement.hidden = stavke.length > 0;

  stavke.forEach(stavka => {
    const red = document.createElement('article');
    red.className = 'stavka';

    const slika = document.createElement('img');
    slika.src = stavka.SlikaProizvoda
      ? `data:image/jpeg;base64,${stavka.SlikaProizvoda}`
      : '../SajtZaProdajuKosilica/Images/kosilicalogo.png';
    slika.alt = stavka.ImeOglasa || 'Slika oglasa';

    const informacije = document.createElement('div');
    informacije.className = 'stavka-info';
    const naziv = document.createElement('strong');
    naziv.textContent = stavka.ImeOglasa || 'Oglas';
    const kolicina = document.createElement('span');
    kolicina.textContent = `Količina: ${stavka.Kolicina}`;
    informacije.append(naziv, kolicina);

    const cena = document.createElement('span');
    cena.className = 'stavka-cena';
    cena.textContent = `${Number(stavka.Cena).toLocaleString('sr-RS')} RSD`;

    const ukloni = document.createElement('button');
    ukloni.className = 'ukloni';
    ukloni.type = 'button';
    ukloni.textContent = 'Ukloni';
    ukloni.addEventListener('click', () => {
      fetch('../Baza/api.php?akcija=ukloniIzKorpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOglasa: Number(stavka.IDOglasa) })
      })
        .then(odgovor => odgovor.json())
        .then(rezultat => {
          if (!rezultat.uspeh) {
            alert(rezultat.poruka || 'Artikal nije uklonjen.');
            return;
          }
          ucitajKorpu();
        })
        .catch(() => alert('Artikal nije uklonjen.'));
    });

    red.append(slika, informacije, cena, ukloni);
    stavkeElement.appendChild(red);
  });
}

function ucitajKorpu() {
  fetch('../Baza/api.php?akcija=korpa')
    .then(odgovor => odgovor.json())
    .then(rezultat => {
      if (!rezultat.uspeh) {
        praznaElement.textContent = rezultat.poruka || 'Korpa nije dostupna.';
        praznaElement.hidden = false;
        return;
      }
      prikaziStavke(rezultat.stavke || []);
    })
    .catch(() => {
      praznaElement.textContent = 'Podaci korpe nisu mogli da se učitaju.';
      praznaElement.hidden = false;
    });
}

function prikaziKorisnika(rezultat) {
  if (!rezultat.ulogovan) {
    korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>';
    praznaElement.textContent = 'Ulogujte se da biste videli svoju korpu.';
    praznaElement.hidden = false;
    return;
  }

  const adminLink = rezultat.role === 'Admin'
    ? '<a class="kreiraj-oglas" href="../Admin/Admin.html">Admin</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a><a class="kreiraj-oglas" href="../AdminPorudzbine/AdminPorudzbine.html">Sve porudžbine</a>'
    : '';
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><a class="link-korpa" href="Korpa.html">Korpa</a><div class="padajuci-meni"><a class="kreiraj-oglas" href="../MojNalog/MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="../MojePorudzbine/MojePorudzbine.html">Moje porudžbine</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a>${adminLink}<button class="odjava" type="button">Odjava</button></div>`;
  const ime = korisnikElement.querySelector('.korisnicko-ime');
  const meni = korisnikElement.querySelector('.padajuci-meni');
  ime.addEventListener('click', () => {
    const otvoren = meni.classList.toggle('otvoren');
    ime.setAttribute('aria-expanded', otvoren);
  });
  korisnikElement.querySelector('.odjava').addEventListener('click', () => fetch('../Baza/api.php?akcija=odjava', { method: 'POST' }).then(() => window.location.reload()));
  ucitajKorpu();
}

const porudzbinaForma = document.getElementById('podaci-porudzbine');
const poruciDugme = porudzbinaForma.querySelector('.poruci');
poruciDugme.addEventListener('click', () => {
  if (!porudzbinaForma.checkValidity()) {
    porudzbinaForma.reportValidity();
    return;
  }
  poruciDugme.disabled = true;
  fetch('../Baza/api.php?akcija=poruci', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grad: document.getElementById('grad').value.trim(),
      adresa: document.getElementById('ulica-broj').value.trim(),
      nacinPlacanja: document.getElementById('nacin-placanja').value
    })
  })
    .then(odgovor => odgovor.json())
    .then(rezultat => {
      if (!rezultat.uspeh) {
        alert(rezultat.poruka || 'Porudžbina nije sačuvana.');
        poruciDugme.disabled = false;
        return;
      }
      alert('Porudžbina je uspešno sačuvana.');
      window.location.reload();
    })
    .catch(() => {
      alert('Porudžbina nije sačuvana.');
      poruciDugme.disabled = false;
    });
});

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(prikaziKorisnika)
  .catch(() => prikaziKorisnika({ ulogovan: false }));
