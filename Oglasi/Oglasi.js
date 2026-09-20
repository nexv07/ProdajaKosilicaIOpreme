const korisnikElement = document.getElementById('korisnik');
const filterDugme = document.getElementById('primeni-filtere');
const vrstaPogonaIzUrl = new URLSearchParams(window.location.search).get('vrstaPogona');

if (vrstaPogonaIzUrl) {
  const filterVrstePogona = [...document.querySelectorAll('input[name="vrsta-pogona"]')]
    .find(input => input.value === vrstaPogonaIzUrl);
  if (filterVrstePogona) filterVrstePogona.checked = true;
}

function primeniFiltere() {
  const izabraneVrstePogona = new Set(
    [...document.querySelectorAll('input[name="vrsta-pogona"]:checked')].map(input => input.value)
  );
  const izabranoStanje = document.querySelector('input[name="stanje"]:checked').value;
  const oglasi = document.querySelectorAll('.oglas[data-oglas-id]');
  let brojPrikazanihOglasa = 0;

  oglasi.forEach(oglas => {
    const odgovaraVrsti = izabraneVrstePogona.size === 0 || izabraneVrstePogona.has(oglas.dataset.vrstaPogona);
    const odgovaraStanju = izabranoStanje === '' || izabranoStanje === oglas.dataset.stanje;
    const prikazi = odgovaraVrsti && odgovaraStanju;
    oglas.hidden = !prikazi;
    if (prikazi) brojPrikazanihOglasa += 1;
  });

  document.getElementById('nema-oglasa').hidden = brojPrikazanihOglasa !== 0;
}

filterDugme.addEventListener('click', primeniFiltere);

document.querySelectorAll('.oglas[data-oglas-id]').forEach(oglas => {
  const otvoriOglas = () => {
    window.location.href = `../KonkretanOglas/KonkretanOglas.html?id=${oglas.dataset.oglasId}`;
  };
  oglas.addEventListener('click', otvoriOglas);
  oglas.addEventListener('keydown', dogadjaj => {
    if (dogadjaj.key === 'Enter' || dogadjaj.key === ' ') {
      dogadjaj.preventDefault();
      otvoriOglas();
    }
  });
});

document.querySelectorAll('.opis[data-opis]').forEach(opis => {
  const tekst = opis.dataset.opis.trim();
  opis.textContent = tekst.length > 60 ? tekst.slice(0, 60).trimEnd() + '...' : tekst;
});

function tekstZaPrikaz(tekst) {
  return tekst.length > 60 ? tekst.slice(0, 60).trimEnd() + '...' : tekst;
}

function bezbedanTekst(tekst) {
  const element = document.createElement('span');
  element.textContent = tekst ?? '';
  return element.innerHTML;
}

function poveziOglas(oglas, element = document.querySelector(`[data-oglas-id="${oglas.IDOglasa}"]`)) {
  if (!element) return;
  const otvoriOglas = () => { window.location.href = `../KonkretanOglas/KonkretanOglas.html?id=${oglas.IDOglasa}`; };
  element.addEventListener('click', otvoriOglas);
  element.addEventListener('keydown', dogadjaj => {
    if (dogadjaj.key === 'Enter' || dogadjaj.key === ' ') { dogadjaj.preventDefault(); otvoriOglas(); }
  });
}

fetch('../Baza/api.php?akcija=oglasi')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    const lista = document.getElementById('baza-oglasi');
    rezultat.oglasi.forEach(oglas => {
      const stanjeKlasa = oglas.StanjeProizvoda === 'Novo' ? 'oglas-novo' : 'oglas-polovno';
      lista.insertAdjacentHTML('beforeend', `
        <div class="oglas ${stanjeKlasa}" data-oglas-id="${oglas.IDOglasa}" data-vrsta-pogona="${bezbedanTekst(oglas.VrstaPogona)}" data-stanje="${bezbedanTekst(oglas.StanjeProizvoda)}" role="link" tabindex="0" aria-label="Otvori detalje oglasa ${bezbedanTekst(oglas.ImeOglasa)}">
          <div class="okvir-slike"><img src="data:image/jpeg;base64,${oglas.SlikaProizvoda}" alt="${bezbedanTekst(oglas.ImeOglasa)}"></div>
          <div class="podaci-oglasa">
            <p class="naziv-oglasa"><strong>${bezbedanTekst(oglas.ImeOglasa)}</strong></p>
            <p class="vrsta-pogona"><strong>${bezbedanTekst(oglas.VrstaPogona)}</strong></p>
            <p class="opis">${bezbedanTekst(tekstZaPrikaz(oglas.DodatanInfo))}</p>
            <div class="donji-podaci"><p class="cena"><strong>${bezbedanTekst(oglas.Cena)} RSD</strong></p><p class="mesto-prodavca"><strong>${bezbedanTekst(oglas.MestoProdavca)}</strong></p></div>
          </div>
        </div>`);
      poveziOglas(oglas, lista.lastElementChild);
    });
    primeniFiltere();
  })
  .catch(greska => {
    document.getElementById('baza-oglasi').innerHTML = `<p class="greska-baze">${bezbedanTekst(greska.message || 'Oglasi trenutno nisu dostupni.')}</p>`;
  });

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan) {
      korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>';
      return;
    }
    korisnikElement.innerHTML = `
      <button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button>
      <div class="padajuci-meni"><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><button class="odjava" type="button">Odjava</button></div>`;
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
  .catch(() => { korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>'; });
