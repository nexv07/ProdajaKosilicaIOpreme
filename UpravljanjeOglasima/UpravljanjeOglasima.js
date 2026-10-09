const korisnikElement = document.getElementById('korisnik');
const lista = document.getElementById('lista-oglasa');
const pretragaForma = document.getElementById('pretraga-forma');
const pretragaPolje = document.getElementById('pretraga');
const poruka = document.getElementById('poruka');
const brojOglasa = document.getElementById('broj-oglasa');
const ucitavanje = document.getElementById('ucitavanje');
const nemaOglasa = document.getElementById('nema-oglasa');
const sentinel = document.getElementById('sentinel');

const stanje = { stranica: 1, poStranici: 12, pretraga: '', imaJos: true, ucitava: false, zahtev: 0 };

function bezbedanTekst(tekst) {
  const element = document.createElement('span');
  element.textContent = tekst ?? '';
  return element.innerHTML;
}

function prikaziPoruku(tekst, uspesno) {
  poruka.textContent = tekst;
  poruka.className = 'poruka ' + (uspesno ? 'uspesno' : 'neuspesno');
}

function postaviMeni(rezultat) {
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${bezbedanTekst(rezultat.korisnickoIme)}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="../MojNalog/MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a><a class="kreiraj-oglas" href="../Admin/Admin.html">Korisnici</a><a class="kreiraj-oglas" href="UpravljanjeOglasima.html">Upravljanje oglasima</a><button class="odjava" type="button">Odjava</button></div>`;
  const imeDugme = korisnikElement.querySelector('.korisnicko-ime');
  const padajuciMeni = korisnikElement.querySelector('.padajuci-meni');
  imeDugme.addEventListener('click', () => {
    const otvoren = padajuciMeni.classList.toggle('otvoren');
    imeDugme.setAttribute('aria-expanded', otvoren);
  });
  korisnikElement.querySelector('.odjava').addEventListener('click', async () => {
    await fetch('../Baza/api.php?akcija=odjava', { method: 'POST' });
    window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html';
  });
}

function formatirajDatum(datum) {
  return datum ? new Date(datum.replace(' ', 'T')).toLocaleDateString('sr-RS') : '';
}

function napraviStatusKlase(status) {
  return status === 'Aktivan' ? 'oznaka-aktivan' : status === 'Prodat' ? 'oznaka-admin' : 'oznaka-neaktivan';
}

function karticaOglasa(oglas) {
  const kartica = document.createElement('article');
  kartica.className = 'oglas-kartica';
  kartica.innerHTML = `<img class="oglas-slika" src="data:image/jpeg;base64,${oglas.SlikaProizvoda || ''}" alt="${bezbedanTekst(oglas.ImeOglasa)}"><div><h3 class="oglas-naziv">${bezbedanTekst(oglas.ImeOglasa)}</h3><p class="oglas-detalji">${bezbedanTekst(oglas.Cena)} RSD · ${bezbedanTekst(oglas.VrstaPogona)} · ${bezbedanTekst(oglas.StanjeProizvoda)}</p><p class="oglas-datum">Postavljen: ${bezbedanTekst(formatirajDatum(oglas.DatumPostavljanja))} · Pregledi: ${bezbedanTekst(oglas.BrojPregleda)}</p></div><div><p class="oglas-vlasnik">${bezbedanTekst(oglas.Ime)} ${bezbedanTekst(oglas.Prezime)}</p><p class="oglas-vlasnik">${bezbedanTekst(oglas.Email)}</p><div class="oglas-status"><span class="oznaka ${napraviStatusKlase(oglas.Status)}">${bezbedanTekst(oglas.Status)}</span></div></div><div class="oglas-akcije"><label class="sr-only" for="status-${oglas.IDOglasa}">Status oglasa</label><select class="status-izbor" id="status-${oglas.IDOglasa}"><option value="Aktivan">Aktivan</option><option value="Neaktivan">Neaktivan</option><option value="Prodat">Prodat</option></select><button class="akcija-dugme status-sacuvaj" type="button">Sačuvaj status</button><button class="akcija-dugme obrisi" type="button">Obriši</button></div>`;
  kartica.querySelector('.status-izbor').value = oglas.Status;
  kartica.querySelector('.status-sacuvaj').addEventListener('click', () => promeniStatus(oglas, kartica));
  kartica.querySelector('.obrisi').addEventListener('click', () => obrisiOglas(oglas, kartica));
  return kartica;
}

async function ucitajOglase(reset = false) {
  if (stanje.ucitava || (!stanje.imaJos && !reset)) return;
  if (reset) {
    stanje.stranica = 1;
    stanje.imaJos = true;
    lista.replaceChildren();
    nemaOglasa.hidden = true;
  }
  stanje.ucitava = true;
  const zahtev = ++stanje.zahtev;
  ucitavanje.hidden = false;
  try {
    const parametri = new URLSearchParams({ akcija: 'adminOglasi', stranica: stanje.stranica, poStranici: stanje.poStranici, pretraga: stanje.pretraga });
    const odgovor = await fetch(`../Baza/api.php?${parametri}`);
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) {
      if (odgovor.status === 401 || odgovor.status === 403) { window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html'; return; }
      throw new Error(rezultat.poruka);
    }
    if (zahtev !== stanje.zahtev) return;
    rezultat.oglasi.forEach(oglas => lista.appendChild(karticaOglasa(oglas)));
    stanje.imaJos = rezultat.imaJos;
    brojOglasa.textContent = `${rezultat.ukupno} ${rezultat.ukupno === 1 ? 'oglas' : 'oglasa'}`;
    nemaOglasa.hidden = lista.children.length > 0;
    stanje.stranica += 1;
  } catch (greska) {
    prikaziPoruku(greska.message || 'Oglase nije moguće učitati.', false);
  } finally {
    stanje.ucitava = false;
    ucitavanje.hidden = true;
  }
}

async function promeniStatus(oglas, kartica) {
  const dugme = kartica.querySelector('.status-sacuvaj');
  const izbor = kartica.querySelector('.status-izbor');
  dugme.disabled = true;
  izbor.disabled = true;
  const podaci = new FormData();
  podaci.append('idOglasa', oglas.IDOglasa);
  podaci.append('status', izbor.value);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=adminPromeniStatusOglasa', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziPoruku(rezultat.poruka, true);
    await ucitajOglase(true);
  } catch (greska) {
    prikaziPoruku(greska.message || 'Status oglasa nije promenjen.', false);
    dugme.disabled = false;
    izbor.disabled = false;
  }
}

async function obrisiOglas(oglas, kartica) {
  if (!confirm(`Da li ste sigurni da želite da obrišete oglas „${oglas.ImeOglasa}“?`)) return;
  const dugme = kartica.querySelector('.obrisi');
  dugme.disabled = true;
  const podaci = new FormData();
  podaci.append('idOglasa', oglas.IDOglasa);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=adminObrisiOglas', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziPoruku(rezultat.poruka, true);
    await ucitajOglase(true);
  } catch (greska) {
    prikaziPoruku(greska.message || 'Oglas nije obrisan.', false);
    dugme.disabled = false;
  }
}

pretragaForma.addEventListener('submit', dogadjaj => {
  dogadjaj.preventDefault();
  stanje.pretraga = pretragaPolje.value.trim();
  ucitajOglase(true);
});

const posmatrac = new IntersectionObserver(unosi => {
  if (unosi.some(unos => unos.isIntersecting)) ucitajOglase();
}, { rootMargin: '300px' });
posmatrac.observe(sentinel);

async function pokreniStranicu() {
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=sesija');
    const rezultat = await odgovor.json();
    if (!rezultat.ulogovan || rezultat.role !== 'Admin') {
      window.location.href = rezultat.ulogovan ? '../SajtZaProdajuKosilica/SajtZaProdajuKosilica.html' : '../PrijavaRegistracija/PrijavaRegistracija.html';
      return;
    }
    postaviMeni(rezultat);
    await ucitajOglase(true);
  } catch (greska) {
    prikaziPoruku('Stranica za upravljanje oglasima trenutno nije dostupna.', false);
  }
}

pokreniStranicu();
