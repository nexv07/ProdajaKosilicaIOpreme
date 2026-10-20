(() => {
  const trenutnaPutanja = new URL(window.location.href).pathname.replace(/\/$/, '');

  const oznaciAktivnuStavku = () => {
    document.querySelectorAll('nav > a, nav > .korisnik > a').forEach(link => {
      const putanjaLinka = new URL(link.href, window.location.href).pathname.replace(/\/$/, '');
      const aktivno = putanjaLinka === trenutnaPutanja;
      link.classList.toggle('aktivno', aktivno);
      if (aktivno) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const postaviRotacijuImena = () => {
    document.querySelectorAll('nav > .korisnik > .korisnicko-ime').forEach(ime => {
      if (ime.dataset.rotacijaPostavljena) return;
      ime.dataset.rotacijaPostavljena = 'true';
      ime.addEventListener('click', () => {
        ime.classList.remove('rotacija');
        void ime.offsetWidth;
        ime.classList.add('rotacija');
      });
    });
  };

  oznaciAktivnuStavku();
  postaviRotacijuImena();
  new MutationObserver(() => {
    oznaciAktivnuStavku();
    postaviRotacijuImena();
  }).observe(document.querySelector('nav'), { childList: true, subtree: true });
})();
