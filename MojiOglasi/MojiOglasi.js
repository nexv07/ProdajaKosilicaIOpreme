const korisnikElement = document.getElementById('korisnik');
const lista = document.getElementById('lista-mojih-oglasa');
const izmenaOkvir = document.getElementById('izmena-okvir');
const formaIzmena = document.getElementById('forma-izmena');
const poruka = document.getElementById('poruka');
const porukaIzmene = document.getElementById('poruka-izmene');
const obrisiOglasDugme = document.getElementById('obrisi-oglas');

function bezbedanTekst(tekst) {
  const element = document.createElement('span');
  element.textContent = tekst ?? '';
  return element.innerHTML;
}

function prikaziPoruku(element, tekst, uspesno) {
  element.textContent = tekst;
  element.className = 'poruka ' + (uspesno ? 'uspesno' : 'neuspesno');
}

function postaviMeni(rezultat) {
  const adminLink = rezultat.role === 'Admin' ? '<a class="kreiraj-oglas" href="../Admin/Admin.html">Admin</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a>' : '';
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${bezbedanTekst(rezultat.korisnickoIme)}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="moji-oglasi" href="MojiOglasi.html">Moji oglasi</a>${adminLink}<button class="odjava" type="button">Odjava</button></div>`;
  const imeDugme = korisnikElement.querySelector('.korisnicko-ime');
  const padajuciMeni = korisnikElement.querySelector('.padajuci-meni');
  imeDugme.addEventListener('click', () => {
    const otvoren = padajuciMeni.classList.toggle('otvoren');
    imeDugme.setAttribute('aria-expanded', otvoren);
  });
  korisnikElement.querySelector('.odjava').addEventListener('click', () => {
    fetch('../Baza/api.php?akcija=odjava', { method: 'POST' }).then(() => window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html');
  });
}

function popuniFormu(oglas) {
  document.getElementById('id-oglasa').value = oglas.IDOglasa;
  document.getElementById('ime-oglasa').value = oglas.ImeOglasa;
  document.getElementById('vrsta-pogona').value = oglas.VrstaPogona;
  document.getElementById('cena').value = oglas.Cena;
  document.querySelectorAll('input[name="stanje"]').forEach(input => { input.checked = input.value === oglas.StanjeProizvoda; });
  document.getElementById('mesto-prodavca').value = oglas.MestoProdavca;
  document.getElementById('dodatne-informacije').value = oglas.DodatanInfo;
  document.getElementById('status').value = oglas.Status;
  const slika = document.getElementById('trenutna-slika');
  slika.src = `data:image/jpeg;base64,${oglas.SlikaProizvoda}`;
  izmenaOkvir.hidden = false;
  izmenaOkvir.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function izaberiOglas(id, kartica) {
  document.querySelectorAll('.moj-oglas').forEach(element => element.classList.remove('izabran'));
  kartica.classList.add('izabran');
  try {
    const odgovor = await fetch(`../Baza/api.php?akcija=mojOglas&id=${encodeURIComponent(id)}`);
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    popuniFormu(rezultat.oglas);
  } catch (greska) { prikaziPoruku(poruka, greska.message || 'Oglas nije moguće učitati.', false); }
}

function prikaziOglase(oglasi) {
  lista.replaceChildren();
  if (!oglasi.length) {
    lista.innerHTML = '<p class="nema-oglasa">Još niste napravili nijedan oglas.</p>';
    return;
  }
  oglasi.forEach(oglas => {
    const statusKlasa = `status-${oglas.Status.toLowerCase()}`;
    const kartica = document.createElement('article');
    kartica.className = 'moj-oglas';
    kartica.tabIndex = 0;
    kartica.innerHTML = `<img src="data:image/jpeg;base64,${oglas.SlikaProizvoda}" alt="${bezbedanTekst(oglas.ImeOglasa)}"><div><h3>${bezbedanTekst(oglas.ImeOglasa)}</h3><p>${bezbedanTekst(oglas.Cena)} RSD</p><small>Pregledi: ${bezbedanTekst(oglas.BrojPregleda)} · ${bezbedanTekst(oglas.DatumPostavljanja)}</small></div><span class="status ${statusKlasa}">${bezbedanTekst(oglas.Status)}</span>`;
    kartica.addEventListener('click', () => izaberiOglas(oglas.IDOglasa, kartica));
    kartica.addEventListener('keydown', dogadjaj => { if (dogadjaj.key === 'Enter' || dogadjaj.key === ' ') { dogadjaj.preventDefault(); izaberiOglas(oglas.IDOglasa, kartica); } });
    lista.appendChild(kartica);
  });
}

async function ucitajStranicu() {
  try {
    const sesijaOdgovor = await fetch('../Baza/api.php?akcija=sesija');
    const sesija = await sesijaOdgovor.json();
    if (!sesija.ulogovan) { window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html'; return; }
    postaviMeni(sesija);
    const odgovor = await fetch('../Baza/api.php?akcija=mojiOglasi');
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) throw new Error(rezultat.poruka);
    prikaziOglase(rezultat.oglasi);
  } catch (greska) { prikaziPoruku(poruka, greska.message || 'Moji oglasi trenutno nisu dostupni.', false); }
}

formaIzmena.addEventListener('submit', async dogadjaj => {
  dogadjaj.preventDefault();
  prikaziPoruku(porukaIzmene, '', true);
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=izmeniOglas', { method: 'POST', body: new FormData(formaIzmena) });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) { prikaziPoruku(porukaIzmene, rezultat.poruka, false); return; }
    prikaziPoruku(porukaIzmene, rezultat.poruka, true);
    await ucitajStranicu();
  } catch (greska) { prikaziPoruku(porukaIzmene, 'Server nije dostupan.', false); }
});

obrisiOglasDugme.addEventListener('click', async () => {
  const idOglasa = document.getElementById('id-oglasa').value;
  if (!idOglasa || !confirm('Da li ste sigurni da želite da obrišete ovaj oglas?')) return;

  obrisiOglasDugme.disabled = true;
  try {
    const podaci = new FormData();
    podaci.append('idOglasa', idOglasa);
    const odgovor = await fetch('../Baza/api.php?akcija=obrisiOglas', { method: 'POST', body: podaci });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) { prikaziPoruku(porukaIzmene, rezultat.poruka, false); return; }
    izmenaOkvir.hidden = true;
    prikaziPoruku(poruka, rezultat.poruka, true);
    await ucitajStranicu();
  } catch (greska) {
    prikaziPoruku(porukaIzmene, 'Server nije dostupan.', false);
  } finally {
    obrisiOglasDugme.disabled = false;
  }
});

ucitajStranicu();
