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
let aktivniOglas = oglasi[id] || oglasi[1];
const dugmeKorpa = document.getElementById('dodaj-u-korpu');

function sacuvajUKorpu() {
  const idOglasa = Number(id || 1);
  fetch('../Baza/api.php?akcija=dodajUKorpu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idOglasa })
  })
    .then(odgovor => odgovor.json())
    .then(rezultat => {
      if (!rezultat.uspeh) {
        alert(rezultat.poruka || 'Artikal nije dodat u korpu.');
        return;
      }
      dugmeKorpa.innerHTML = '<span aria-hidden="true">✓</span> Dodato u korpu';
      setTimeout(() => { dugmeKorpa.innerHTML = '<span aria-hidden="true">🛒</span> Dodaj u korpu'; }, 1600);
    })
    .catch(() => alert('Dodavanje u korpu nije uspelo.'));
  return;

  let korpa = [];
  try {
    korpa = JSON.parse(window.localStorage.getItem('korpa') || '[]');
    if (!Array.isArray(korpa)) korpa = [];
  } catch (greska) {
    alert('Korpa nije dostupna u ovom režimu pregledača. Otvorite stranicu preko lokalnog servera.');
    return;
  }
  const proizvod = {
    id: id || '1',
    naziv: aktivniOglas.naziv ?? aktivniOglas.ImeOglasa,
    cena: aktivniOglas.cena ?? `${aktivniOglas.Cena} RSD`,
    slika: aktivniOglas.slika || (aktivniOglas.SlikaProizvoda ? `data:image/jpeg;base64,${aktivniOglas.SlikaProizvoda}` : '')
  };
  const postojeci = korpa.find(stavka => stavka.id === proizvod.id);
  if (postojeci) postojeci.kolicina = (postojeci.kolicina || 1) + 1;
  else korpa.push({ ...proizvod, kolicina: 1 });
  try { window.localStorage.setItem('korpa', JSON.stringify(korpa)); } catch (greska) {
    alert('Nije moguće sačuvati proizvod u korpu. Otvorite stranicu preko lokalnog servera.');
    return;
  }
  dugmeKorpa.innerHTML = '<span aria-hidden="true">✓</span> Dodato u korpu';
  setTimeout(() => { dugmeKorpa.innerHTML = '<span aria-hidden="true">🛒</span> Dodaj u korpu'; }, 1600);
}

dugmeKorpa.addEventListener('click', sacuvajUKorpu);
function prikaziOglas(oglas) {
  aktivniOglas = oglas;
  document.getElementById('naziv-proizvoda').textContent = oglas.naziv ?? oglas.ImeOglasa;
  document.getElementById('vrsta-pogona').textContent = oglas.pogon ?? oglas.VrstaPogona;
  document.getElementById('cena-proizvoda').textContent = oglas.cena ?? `${oglas.Cena} RSD`;
  document.getElementById('mesto-prodavca').textContent = oglas.mesto ?? oglas.MestoProdavca;
  document.getElementById('opis-proizvoda').textContent = oglas.opis ?? oglas.DodatanInfo;
  document.getElementById('telefon-prodavca').textContent = oglas.telefon ?? oglas.BrojTelefona ?? 'Nije unet';
  if (oglas.slika) document.getElementById('slika-proizvoda').src = oglas.slika;
  if (oglas.SlikaProizvoda) document.getElementById('slika-proizvoda').src = `data:image/jpeg;base64,${oglas.SlikaProizvoda}`;
}
prikaziOglas(aktivniOglas);

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
    const adminLink = rezultat.role === 'Admin' ? '<a class="kreiraj-oglas" href="../Admin/Admin.html">Admin</a><a class="kreiraj-oglas" href="../UpravljanjeOglasima/UpravljanjeOglasima.html">Upravljanje oglasima</a>' : '';
    korisnikElement.innerHTML = `<button class="korisnicko-ime" type="button" aria-expanded="false">${rezultat.korisnickoIme}</button><a class="link-korpa" href="../Korpa/Korpa.html">Korpa</a><div class="padajuci-meni"><a class="kreiraj-oglas" href="../MojNalog/MojNalog.html">Moj nalog</a><a class="kreiraj-oglas" href="../KreiranjeOglasa/KreiranjeOglasa.html">Kreiraj oglas</a><a class="kreiraj-oglas moji-oglasi" href="../MojiOglasi/MojiOglasi.html">Moji oglasi</a>${adminLink}<button class="odjava" type="button">Odjava</button></div>`;
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
