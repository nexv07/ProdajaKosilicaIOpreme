const korisnikElement = document.getElementById('korisnik');
const listaElement = document.getElementById('lista-porudzbina');
const porukaElement = document.getElementById('poruka-porudzbine');
const pretragaForma = document.getElementById('pretraga-forma');
const pretragaPolje = document.getElementById('pretraga-porudzbina');
const ucitavanjeElement = document.getElementById('ucitavanje-porudzbina');
const nemaPorudzbinaElement = document.getElementById('nema-porudzbina');
const sentinelElement = document.getElementById('sentinel-porudzbine');
const stanje = { stranica: 1, imaJos: true, ucitava: false };

function prikaziPorudzbine(porudzbine, reset = false) {
  if (reset) listaElement.replaceChildren();
  porukaElement.hidden = true;
  nemaPorudzbinaElement.hidden = !reset || porudzbine.length > 0;
  porudzbine.forEach(porudzbina => {
    const kartica = document.createElement('article');
    kartica.className = 'porudzbina-kartica';
    const naslov = document.createElement('h3');
    naslov.textContent = `Porudžbina #${porudzbina.IDPorudzbine} — ${porudzbina.Ime} ${porudzbina.Prezime}`;
    const kupac = document.createElement('p');
    kupac.textContent = `Kupac: ${porudzbina.Email} · Telefon: ${porudzbina.BrojTelefona}`;
    const detalji = document.createElement('p');
    detalji.textContent = `${porudzbina.ImeOglasa} · Količina: ${porudzbina.Kolicina} · ${Number(porudzbina.Cena).toLocaleString('sr-RS')} RSD`;
    const dostava = document.createElement('p');
    dostava.textContent = `Dostava: ${porudzbina.Adresa}, ${porudzbina.Grad} · Plaćanje: ${porudzbina.NacinPlacanja}`;
    const status = document.createElement('p');
    status.textContent = `Status: ${porudzbina.Status}`;
    kartica.append(naslov, kupac, detalji, dostava, status);
    listaElement.appendChild(kartica);
  });
}

function ucitajPorudzbine(reset = false) {
  if (stanje.ucitava || (!stanje.imaJos && !reset)) return;
  if (reset) {
    stanje.stranica = 1;
    stanje.imaJos = true;
    listaElement.replaceChildren();
    porukaElement.hidden = true;
    nemaPorudzbinaElement.hidden = true;
  }
  stanje.ucitava = true;
  ucitavanjeElement.hidden = false;
  const parametri = new URLSearchParams({ akcija: 'adminPorudzbine', pretraga: pretragaPolje.value.trim(), stranica: stanje.stranica });
  fetch(`../Baza/api.php?${parametri}`)
    .then(odgovor => odgovor.json())
    .then(rezultat => {
      if (!rezultat.uspeh) {
        porukaElement.textContent = rezultat.poruka || 'Porudžbine nisu mogle da se učitaju.';
        porukaElement.hidden = false;
        stanje.ucitava = false;
        ucitavanjeElement.hidden = true;
        return;
      }
      const porudzbine = rezultat.porudzbine || [];
      prikaziPorudzbine(porudzbine, reset);
      stanje.imaJos = rezultat.imaJos === true;
      stanje.stranica += 1;
      stanje.ucitava = false;
      ucitavanjeElement.hidden = true;
    })
    .catch(() => {
      porukaElement.textContent = 'Porudžbine nisu mogle da se učitaju.';
      porukaElement.hidden = false;
      stanje.ucitava = false;
      ucitavanjeElement.hidden = true;
    });
}

pretragaForma.addEventListener('submit', dogadjaj => {
  dogadjaj.preventDefault();
  ucitajPorudzbine(true);
});

const posmatrac = new IntersectionObserver(zapisi => {
  if (zapisi[0].isIntersecting) ucitajPorudzbine();
});
posmatrac.observe(sentinelElement);

function postaviMeni(rezultat) {
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><a class="link-korpa" href="../Korpa/Korpa.html">Korpa</a><div class="padajuci-meni"><a class="kreiraj-oglas" href="../MojNalog/MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="../MojePorudzbine/MojePorudzbine.html">Moje porudžbine</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a><a class="kreiraj-oglas" href="../Admin/Admin.html">Korisnici</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a><a class="kreiraj-oglas" href="AdminPorudzbine.html" aria-current="page">Sve porudžbine</a><button class="odjava" type="button">Odjava</button></div>`;
  const ime = korisnikElement.querySelector('.korisnicko-ime');
  const meni = korisnikElement.querySelector('.padajuci-meni');
  ime.addEventListener('click', () => {
    const otvoren = meni.classList.toggle('otvoren');
    ime.setAttribute('aria-expanded', otvoren);
  });
  korisnikElement.querySelector('.odjava').addEventListener('click', () => fetch('../Baza/api.php?akcija=odjava', { method: 'POST' }).then(() => window.location.reload()));
}

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan || rezultat.role !== 'Admin') {
      window.location.href = '../SajtZaProdajuKosilica/SajtZaProdajuKosilica.html';
      return;
    }
    postaviMeni(rezultat);
    ucitajPorudzbine(true);
  })
  .catch(() => { window.location.href = '../SajtZaProdajuKosilica/SajtZaProdajuKosilica.html'; });
