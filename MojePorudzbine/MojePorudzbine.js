const korisnikElement = document.getElementById('korisnik');
const listaElement = document.getElementById('lista-porudzbina');
const porukaElement = document.getElementById('poruka-porudzbine');

function prikaziPorudzbine(porudzbine) {
  listaElement.replaceChildren();
  porukaElement.hidden = porudzbine.length > 0;
  porudzbine.forEach(porudzbina => {
    const kartica = document.createElement('article');
    kartica.className = 'porudzbina-kartica';
    const naslov = document.createElement('h3');
    naslov.textContent = `Porudžbina #${porudzbina.IDPorudzbine}`;
    const detalji = document.createElement('p');
    detalji.textContent = `${porudzbina.ImeOglasa} · Količina: ${porudzbina.Kolicina} · ${Number(porudzbina.Cena).toLocaleString('sr-RS')} RSD`;
    const dostava = document.createElement('p');
    dostava.textContent = `Dostava: ${porudzbina.Adresa}, ${porudzbina.Grad}`;
    const status = document.createElement('p');
    status.textContent = `Status: ${porudzbina.Status}`;
    kartica.append(naslov, detalji, dostava, status);
    listaElement.appendChild(kartica);
  });
}

function ucitajPorudzbine() {
  fetch('../Baza/api.php?akcija=mojePorudzbine')
    .then(odgovor => odgovor.json())
    .then(rezultat => {
      if (!rezultat.uspeh) {
        porukaElement.textContent = rezultat.poruka || 'Porudžbine nisu mogle da se učitaju.';
        porukaElement.hidden = false;
        return;
      }
      prikaziPorudzbine(rezultat.porudzbine || []);
    })
    .catch(() => {
      porukaElement.textContent = 'Porudžbine nisu mogle da se učitaju.';
      porukaElement.hidden = false;
    });
}

function postaviMeni(rezultat) {
  const adminLink = rezultat.role === 'Admin'
    ? '<a class="kreiraj-oglas" href="../Admin/Admin.html">Admin</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a><a class="kreiraj-oglas" href="../AdminPorudzbine/AdminPorudzbine.html">Sve porudžbine</a>'
    : '';
  korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><a class="link-korpa" href="../Korpa/Korpa.html">Korpa</a><div class="padajuci-meni"><a class="kreiraj-oglas" href="../MojNalog/MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="MojePorudzbine.html" aria-current="page">Moje porudžbine</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a>${adminLink}<button class="odjava" type="button">Odjava</button></div>`;
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
    if (!rezultat.ulogovan) {
      window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html';
      return;
    }
    postaviMeni(rezultat);
    ucitajPorudzbine();
  })
  .catch(() => { window.location.href = '../PrijavaRegistracija/PrijavaRegistracija.html'; });
