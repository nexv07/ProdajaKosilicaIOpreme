const korisnikElement = document.getElementById('korisnik');
const lista = document.getElementById('lista-korisnika');
const pretragaForma = document.getElementById('pretraga-forma');
const pretragaPolje = document.getElementById('pretraga');
const poruka = document.getElementById('poruka');
const brojKorisnika = document.getElementById('broj-korisnika');
const ucitavanje = document.getElementById('ucitavanje');
const nemaKorisnika = document.getElementById('nema-korisnika');
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
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${bezbedanTekst(rezultat.korisnickoIme)}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a><a class="kreiraj-oglas" href="Admin.html">Korisnici</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a><button class="odjava" type="button">Odjava</button></div>`;
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

function karticaKorisnika(korisnik, adminId) {
  const kartica = document.createElement('article');
  kartica.className = 'korisnik-kartica';
  const aktivan = korisnik.Active === 'Da';
  const sopstveniNalog = Number(korisnik.ID) === Number(adminId);
  const datum = korisnik.CreatedAt ? new Date(korisnik.CreatedAt.replace(' ', 'T')).toLocaleDateString('sr-RS') : '';
  kartica.innerHTML = `<div><h3 class="ime-korisnika">${bezbedanTekst(korisnik.Ime)} ${bezbedanTekst(korisnik.Prezime)}</h3><p class="korisnik-email">${bezbedanTekst(korisnik.Email)}</p><p class="korisnik-datum">Registrovan: ${bezbedanTekst(datum)}</p></div><div><p class="korisnik-telefon">Telefon: ${bezbedanTekst(korisnik.BrojTelefona)}</p><div class="korisnik-meta"><span class="oznaka ${aktivan ? 'oznaka-aktivan' : 'oznaka-neaktivan'}">${aktivan ? 'Aktivan' : 'Neaktivan'}</span>${korisnik.Role === 'Admin' ? '<span class="oznaka oznaka-admin">Admin</span>' : ''}</div></div><div class="korisnik-akcije">${sopstveniNalog ? '<span class="oznaka oznaka-admin">Vi</span>' : `<button class="akcija-dugme status-dugme" type="button">${aktivan ? 'Deaktiviraj' : 'Aktiviraj'}</button><button class="akcija-dugme obrisi" type="button">Obriši</button>`}</div>`;
  if (!sopstveniNalog) {
    kartica.querySelector('.korisnik-akcije').insertAdjacentHTML('afterbegin', `<label class="sr-only" for="uloga-${korisnik.ID}">Uloga korisnika</label><select class="uloga-izbor" id="uloga-${korisnik.ID}"><option value="Korisnik">Korisnik</option><option value="Admin">Admin</option></select><button class="akcija-dugme uloga-dugme" type="button">Sačuvaj ulogu</button>`);
    kartica.querySelector('.uloga-izbor').value = korisnik.Role;
    kartica.querySelector('.uloga-dugme').addEventListener('click', () => promeniUlogu(korisnik, kartica));
    kartica.querySelector('.status-dugme').addEventListener('click', () => promeniStatus(korisnik, kartica));
    kartica.querySelector('.obrisi').addEventListener('click', () => obrisiNalog(korisnik, kartica));
  }
  return kartica;
}

async function ucitajKorisnike(reset = false) {
  if (stanje.ucitava || (!stanje.imaJos && !reset)) return;
  if (reset) {
    stanje.stranica = 1;
    stanje.imaJos = true;
    lista.replaceChildren();
    nemaKorisnika.hidden = true;
  }
  stanje.ucitava = true;
  const zahtev = ++stanje.zahtev;
  ucitavanje.hidden = false;
  try {
    const parametri = new URLSearchParams({ akcija: 'adminKorisnici', stranica: stanje.stranica, poStranici: stanje.poStranici, pretraga: stanje.pretraga });
    const odgovor = await fetch(`../Baza/api.php?${parametri}`);
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) {
      if (odgovor.status === 401 || odgovor.status === 403) { window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html'; return; }
      throw new Error(rezultat.poruka);
    }
    if (zahtev !== stanje.zahtev) return;
    rezultat.korisnici.forEach(korisnik => lista.appendChild(karticaKorisnika(korisnik, rezultat.adminId)));
    stanje.imaJos = rezultat.imaJos;
    brojKorisnika.textContent = `${rezultat.ukupno} ${rezultat.ukupno === 1 ? 'korisnik' : 'korisnika'}`;
    nemaKorisnika.hidden = lista.children.length > 0;
    stanje.stranica += 1;
  } catch (greska) {
    prikaziPoruku(greska.message || 'Korisnike nije moguće učitati.', false);
  } finally {
    stanje.ucitava = false;
    ucitavanje.hidden = true;
  }
}

async function promeniUlogu(korisnik, kartica) {
  const dugme = kartica.querySelector('.uloga-dugme');
  const izbor = kartica.querySelector('.uloga-izbor');
  dugme.disabled = true;
  izbor.disabled = true;
  const podaci = new FormData();
  podaci.append('idNaloga', korisnik.ID);
  podaci.append('uloga', izbor.value);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=adminPromeniUlogu', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziPoruku(rezultat.poruka, true);
    await ucitajKorisnike(true);
  } catch (greska) {
    prikaziPoruku(greska.message || 'Uloga naloga nije promenjena.', false);
    dugme.disabled = false;
    izbor.disabled = false;
  }
}

async function promeniStatus(korisnik, kartica) {
  const dugme = kartica.querySelector('.status-dugme');
  dugme.disabled = true;
  const podaci = new FormData();
  podaci.append('idNaloga', korisnik.ID);
  podaci.append('aktivnost', korisnik.Active === 'Da' ? 'Ne' : 'Da');
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=adminPromeniStatus', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziPoruku(rezultat.poruka, true);
    await ucitajKorisnike(true);
  } catch (greska) {
    prikaziPoruku(greska.message || 'Status naloga nije promenjen.', false);
    dugme.disabled = false;
  }
}

async function obrisiNalog(korisnik, kartica) {
  if (!confirm(`Da li ste sigurni da želite da obrišete nalog ${korisnik.Ime} ${korisnik.Prezime}?`)) return;
  const dugme = kartica.querySelector('.obrisi');
  dugme.disabled = true;
  const podaci = new FormData();
  podaci.append('idNaloga', korisnik.ID);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=adminObrisiNalog', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziPoruku(rezultat.poruka, true);
    await ucitajKorisnike(true);
  } catch (greska) {
    prikaziPoruku(greska.message || 'Nalog nije obrisan.', false);
    dugme.disabled = false;
  }
}

pretragaForma.addEventListener('submit', dogadjaj => {
  dogadjaj.preventDefault();
  stanje.pretraga = pretragaPolje.value.trim();
  ucitajKorisnike(true);
});

const posmatrac = new IntersectionObserver(unosi => {
  if (unosi.some(unos => unos.isIntersecting)) ucitajKorisnike();
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
    await ucitajKorisnike(true);
  } catch (greska) {
    prikaziPoruku('Admin stranica trenutno nije dostupna.', false);
  }
}

pokreniStranicu();
