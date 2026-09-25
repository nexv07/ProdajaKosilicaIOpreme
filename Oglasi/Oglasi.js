const korisnikElement = document.getElementById('korisnik');
const filterDugme = document.getElementById('primeni-filtere');
const sortForma = document.getElementById('sort-form');
const listaOglasa = document.getElementById('baza-oglasi');
const porukaNemaOglasa = document.getElementById('nema-oglasa');
const vrstaPogonaIzUrl = new URLSearchParams(window.location.search).get('vrstaPogona');

if (vrstaPogonaIzUrl) {
  const filterVrstePogona = [...document.querySelectorAll('input[name="vrsta-pogona"]')]
    .find(input => input.value === vrstaPogonaIzUrl);
  if (filterVrstePogona) filterVrstePogona.checked = true;
}

function procitajFiltere() {
  return {
    vrstePogona: [...document.querySelectorAll('input[name="vrsta-pogona"]:checked')].map(input => input.value),
    stanje: document.querySelector('input[name="stanje"]:checked')?.value ?? '',
    sortiranje: document.querySelector('input[name="sortiranje"]:checked')?.value ?? 'najnoviji'
  };
}

function napraviUrlZaOglase({ vrstePogona, stanje }) {
  const parametri = new URLSearchParams({ akcija: 'oglasi' });
  vrstePogona.forEach(vrsta => parametri.append('vrstaPogona[]', vrsta));
  if (stanje) parametri.set('stanje', stanje);
  return `../Baza/api.php?${parametri.toString()}`;
}

function sortirajOglase(oglasi, sortiranje) {
  return [...oglasi].sort((prvi, drugi) => {
    if (sortiranje === 'najstariji') return Number(prvi.IDOglasa) - Number(drugi.IDOglasa);
    if (sortiranje === 'cena-rastuce') return Number(prvi.Cena) - Number(drugi.Cena) || Number(drugi.IDOglasa) - Number(prvi.IDOglasa);
    if (sortiranje === 'cena-opadajuce') return Number(drugi.Cena) - Number(prvi.Cena) || Number(drugi.IDOglasa) - Number(prvi.IDOglasa);
    return Number(drugi.IDOglasa) - Number(prvi.IDOglasa);
  });
}

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

async function ucitajOglase() {
  listaOglasa.replaceChildren();
  porukaNemaOglasa.hidden = true;
  listaOglasa.setAttribute('aria-busy', 'true');
  const filteri = procitajFiltere();

  try {
    const odgovor = await fetch(napraviUrlZaOglase(filteri));
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);

    sortirajOglase(rezultat.oglasi, filteri.sortiranje).forEach(oglas => {
      const stanjeKlasa = oglas.StanjeProizvoda === 'Novo' ? 'oglas-novo' : 'oglas-polovno';
      listaOglasa.insertAdjacentHTML('beforeend', `
        <div class="oglas ${stanjeKlasa}" data-oglas-id="${oglas.IDOglasa}" role="link" tabindex="0" aria-label="Otvori detalje oglasa ${bezbedanTekst(oglas.ImeOglasa)}">
          <div class="okvir-slike"><img src="data:image/jpeg;base64,${oglas.SlikaProizvoda}" alt="${bezbedanTekst(oglas.ImeOglasa)}"></div>
          <div class="podaci-oglasa">
            <p class="naziv-oglasa"><strong>${bezbedanTekst(oglas.ImeOglasa)}</strong></p>
            <p class="vrsta-pogona"><strong>${bezbedanTekst(oglas.VrstaPogona)}</strong></p>
            <p class="opis">${bezbedanTekst(tekstZaPrikaz(oglas.DodatanInfo))}</p>
            <div class="donji-podaci"><p class="cena"><strong>${bezbedanTekst(oglas.Cena)} RSD</strong></p><p class="mesto-prodavca"><strong>${bezbedanTekst(oglas.MestoProdavca)}</strong></p></div>
          </div>
        </div>`);
      poveziOglas(oglas, listaOglasa.lastElementChild);
    });
    porukaNemaOglasa.hidden = rezultat.oglasi.length !== 0;
  } catch (greska) {
    listaOglasa.innerHTML = `<p class="greska-baze">${bezbedanTekst(greska.message || 'Oglasi trenutno nisu dostupni.')}</p>`;
  } finally {
    listaOglasa.removeAttribute('aria-busy');
  }
}

filterDugme.addEventListener('click', ucitajOglase);
sortForma.addEventListener('submit', dogadjaj => {
  dogadjaj.preventDefault();
  ucitajOglase();
});
ucitajOglase();

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
