const korisnikElement = document.getElementById('korisnik');
const objaviOglasDugme = document.getElementById('objavi-oglas');
const vrstePogona = ['Benzin/mesavina', 'Elektro', 'Akumulatorski'];

document.querySelectorAll('.kartice .kartica').forEach((kartica, indeks) => {
  const vrstaPogona = vrstePogona[indeks];
  if (!vrstaPogona) return;

  const otvoriOglase = () => {
    window.location.href = `../Oglasi/Oglasi.html?vrstaPogona=${encodeURIComponent(vrstaPogona)}`;
  };
  kartica.setAttribute('role', 'link');
  kartica.setAttribute('tabindex', '0');
  kartica.addEventListener('click', otvoriOglase);
  kartica.addEventListener('keydown', dogadjaj => {
    if (dogadjaj.key === 'Enter' || dogadjaj.key === ' ') {
      dogadjaj.preventDefault();
      otvoriOglase();
    }
  });
});

fetch('../Baza/api.php?akcija=sesija')
  .then(odgovor => odgovor.json())
  .then(rezultat => {
    if (!rezultat.ulogovan) {
      korisnikElement.innerHTML = '<a href="../PrijavaRegistracija/PrijavaRegistracija.html">Ulogujte se</a>';
      return;
    }
    objaviOglasDugme.href = '../KreiranjeOglasa/KreiranjeOglasa.html';
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
