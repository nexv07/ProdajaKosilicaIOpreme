const tabPrijava = document.getElementById('tab-prijava');
const tabRegistracija = document.getElementById('tab-registracija');
const formaPrijava = document.getElementById('forma-prijava');
const formaRegistracija = document.getElementById('forma-registracija');
const poruka = document.getElementById('poruka');

function prikaziPoruku(tekst, uspesno) {
  poruka.textContent = tekst;
  poruka.className = 'poruka ' + (uspesno ? 'uspesno' : 'neuspesno');
}

function promeniFormu(registracija) {
  formaPrijava.classList.toggle('sakriveno', registracija);
  formaRegistracija.classList.toggle('sakriveno', !registracija);
  tabPrijava.classList.toggle('aktivan', !registracija);
  tabRegistracija.classList.toggle('aktivan', registracija);
  prikaziPoruku('', true);
}

tabPrijava.addEventListener('click', () => promeniFormu(false));
tabRegistracija.addEventListener('click', () => promeniFormu(true));

formaRegistracija.addEventListener('submit', async (dogadjaj) => {
  dogadjaj.preventDefault();
  const ime = document.getElementById('registracija-ime').value.trim();
  const prezime = document.getElementById('registracija-prezime').value.trim();
  const email = document.getElementById('registracija-email').value.trim();
  const lozinku = document.getElementById('registracija-lozinku').value;
  const brojTelefona = document.getElementById('registracija-broj-telefona').value.trim();
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=registracija', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ime, prezime, email, lozinku, brojTelefona })
    });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) { prikaziPoruku(rezultat.poruka, false); return; }
    formaRegistracija.reset();
    promeniFormu(false);
    prikaziPoruku(rezultat.poruka, true);
  } catch (greska) { prikaziPoruku('Server nije dostupan. Pokrenite Apache i MySQL u XAMPP-u.', false); }
});

formaPrijava.addEventListener('submit', async (dogadjaj) => {
  dogadjaj.preventDefault();
  const email = document.getElementById('prijava-email').value.trim();
  const lozinku = document.getElementById('prijava-lozinku').value;
  try {
    const odgovor = await fetch('../Baza/api.php?akcija=prijava', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lozinku })
    });
    const rezultat = await odgovor.json();
    if (!rezultat.uspeh) { prikaziPoruku(rezultat.poruka, false); return; }
    window.location.href = '../SajtZaProdajuKosilica/SajtZaProdajuKosilica.html';
  } catch (greska) { prikaziPoruku('Server nije dostupan. Pokrenite Apache i MySQL u XAMPP-u.', false); }
});
