const korisnikElement = document.getElementById('korisnik');
const oglasi = {
  1: {
    naziv: 'Kosilica Villager Atlas 4011 B',
    pogon: 'Mesavina',
    cena: '18.999 RSD',
    mesto: 'Mala Ivanča',
    opis: 'Pouzdana i kvalitetna kosilica sa snažnim motorom, idealna za redovno održavanje većih travnatih površina.',
    slika: ''
  },
  2: {
    naziv: 'Kosilica Villager Atlas 4011 B',
    pogon: 'Mesavina',
    cena: '18.999 RSD',
    mesto: 'Mala Ivanča',
    opis: 'Pouzdana i kvalitetna kosilica sa snažnim motorom, idealna za redovno održavanje većih travnatih površina.',
    slika: ''
  }
};

const id = new URLSearchParams(window.location.search).get('id');
const oglas = oglasi[id] || oglasi[1];
function prikaziOglas(oglas) {
  document.getElementById('naziv-proizvoda').textContent = oglas.naziv ?? oglas.ImeOglasa;
  document.getElementById('vrsta-pogona').textContent = oglas.pogon ?? oglas.VrstaPogona;
  document.getElementById('cena-proizvoda').textContent = oglas.cena ?? `${oglas.Cena} RSD`;
  document.getElementById('mesto-prodavca').textContent = oglas.mesto ?? oglas.MestoProdavca;
  document.getElementById('opis-proizvoda').textContent = oglas.opis ?? oglas.DodatanInfo;
  document.getElementById('telefon-prodavca').textContent = oglas.telefon ?? oglas.BrojTelefona ?? 'Nije unet';
  if (oglas.slika) document.getElementById('slika-proizvoda').src = oglas.slika;
  if (oglas.SlikaProizvoda) document.getElementById('slika-proizvoda').src = `data:image/jpeg;base64,${oglas.SlikaProizvoda}`;
}
prikaziOglas(oglas);

if (id) {
  fetch(`../Baza/api.php?akcija=oglas&id=${encodeURIComponent(id)}`)
    .then(odgovor => odgovor.json())
    .then(rezultat => { if (rezultat.uspeh) prikaziOglas(rezultat.oglas); })
    .catch(() => {});
}

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan) {
      korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>';
      return;
    }
    korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><div class="padajuci-meni"><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><button class="odjava" type="button">Odjava</button></div>`;
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
