<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

const DB_HOST = '127.0.0.1';
const DB_NAME = 'nalozi';
const DB_USER = 'root';
const DB_PASSWORD = '';

function odgovor(bool $uspeh, string $poruka, array $podaci = [], int $status = 200): never
{
    http_response_code($status);
    echo json_encode(['uspeh' => $uspeh, 'poruka' => $poruka] + $podaci, JSON_UNESCAPED_UNICODE);
    exit;
}

function pripremi(mysqli $baza, string $sql): mysqli_stmt
{
    $upit = $baza->prepare($sql);
    if (!$upit) {
        odgovor(false, 'Greška baze: ' . $baza->error, [], 500);
    }
    return $upit;
}

function zahtevajAdmina(mysqli $baza): array
{
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani kao administrator.', [], 401);
    }

    $email = (string)$_SESSION['email'];
    $upit = pripremi($baza, "SELECT `ID`, `Role` FROM `Nalog` WHERE `Email` = ? AND `Active` = 'Da' LIMIT 1");
    $upit->bind_param('s', $email);
    $upit->execute();
    $nalog = $upit->get_result()->fetch_assoc();
    if (!$nalog || $nalog['Role'] !== 'Admin') {
        odgovor(false, 'Nemate dozvolu za pristup ovoj stranici.', [], 403);
    }
    return $nalog;
}

try {
    $baza = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
    $baza->set_charset('utf8mb4');
} catch (Throwable $greska) {
    odgovor(false, 'Povezivanje sa bazom nije uspelo.', [], 500);
}

$akcija = $_GET['akcija'] ?? '';
$ulaz = json_decode(file_get_contents('php://input'), true) ?? [];

if ($akcija === 'registracija') {
    $ime = trim((string)($ulaz['ime'] ?? ''));
    $prezime = trim((string)($ulaz['prezime'] ?? ''));
    $email = trim((string)($ulaz['email'] ?? ''));
    $brojTelefona = trim((string)($ulaz['brojTelefona'] ?? ''));
    $lozinku = (string)($ulaz['lozinku'] ?? '');

    if ($ime === '' || mb_strlen($ime) > 100 || $prezime === '' || mb_strlen($prezime) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[0-9+()\s\/-]{6,30}$/u', $brojTelefona) || mb_strlen($lozinku) < 6) {
        odgovor(false, 'Unesite ime, prezime, ispravan email, broj telefona i lozinku od najmanje 6 karaktera.', [], 400);
    }

    $provera = pripremi($baza, 'SELECT 1 FROM `Nalog` WHERE `Email` = ? LIMIT 1');
    $provera->bind_param('s', $email);
    $provera->execute();
    if ($provera->get_result()->num_rows > 0) {
        odgovor(false, 'Nalog sa unetim emailom već postoji.', [], 409);
    }

    $lozinkaHash = password_hash($lozinku, PASSWORD_DEFAULT);
    $uloga = 'Korisnik';
    $unos = pripremi($baza, 'INSERT INTO `Nalog` (`Ime`, `Prezime`, `Email`, `BrojTelefona`, `Lozinku`, `Role`) VALUES (?, ?, ?, ?, ?, ?)');
    $unos->bind_param('ssssss', $ime, $prezime, $email, $brojTelefona, $lozinkaHash, $uloga);
    if (!$unos->execute()) {
        odgovor(false, 'Greška baze pri kreiranju naloga: ' . $unos->error, [], 500);
    }
    odgovor(true, 'Nalog je uspešno napravljen. Sada se možete ulogovati.');
}

if ($akcija === 'prijava') {
    $email = trim((string)($ulaz['email'] ?? ''));
    $lozinku = (string)($ulaz['lozinku'] ?? '');
    $upit = pripremi($baza, 'SELECT `Ime`, `Prezime`, `Email`, `Lozinku`, `Role`, `Active` FROM `Nalog` WHERE `Email` = ? LIMIT 1');
    $upit->bind_param('s', $email);
    $upit->execute();
    $nalog = $upit->get_result()->fetch_assoc();

    $ispravnaLozinka = $nalog && (password_verify($lozinku, $nalog['Lozinku']) || hash_equals($nalog['Lozinku'], $lozinku));
    if (!$ispravnaLozinka) {
        odgovor(false, 'Email ili lozinka nisu ispravni.', [], 401);
    }
    if ($nalog['Active'] !== 'Da') {
        odgovor(false, 'Ovaj nalog nije aktivan.', [], 403);
    }

    if (password_get_info($nalog['Lozinku'])['algo'] === 0) {
        $noviHash = password_hash($lozinku, PASSWORD_DEFAULT);
        $izmena = pripremi($baza, 'UPDATE `Nalog` SET `Lozinku` = ? WHERE `Email` = ?');
        $izmena->bind_param('ss', $noviHash, $email);
        $izmena->execute();
    }

    $_SESSION['email'] = $nalog['Email'];
    $imeZaPrikaz = $nalog['Ime'] . ' ' . $nalog['Prezime'];
    odgovor(true, 'Uspešno ste se ulogovali.', ['ime' => $nalog['Ime'], 'prezime' => $nalog['Prezime'], 'korisnickoIme' => $imeZaPrikaz, 'role' => $nalog['Role']]);
}

if ($akcija === 'sesija') {
    if (!isset($_SESSION['email'])) {
        odgovor(true, '', ['ulogovan' => false, 'ime' => null, 'prezime' => null, 'korisnickoIme' => null, 'role' => null]);
    }
    $sesijaUpit = pripremi($baza, "SELECT `Ime`, `Prezime`, `Role` FROM `Nalog` WHERE `Email` = ? AND `Active` = 'Da' LIMIT 1");
    $sesijaEmail = (string)$_SESSION['email'];
    $sesijaUpit->bind_param('s', $sesijaEmail);
    $sesijaUpit->execute();
    $sesijaNalog = $sesijaUpit->get_result()->fetch_assoc();
    if (!$sesijaNalog) {
        odgovor(true, '', ['ulogovan' => false, 'ime' => null, 'prezime' => null, 'korisnickoIme' => null, 'role' => null]);
    }
    $imeZaPrikaz = $sesijaNalog['Ime'] . ' ' . $sesijaNalog['Prezime'];
    odgovor(true, '', ['ulogovan' => true, 'ime' => $sesijaNalog['Ime'], 'prezime' => $sesijaNalog['Prezime'], 'korisnickoIme' => $imeZaPrikaz, 'role' => $sesijaNalog['Role']]);
}

if ($akcija === 'odjava') {
    $_SESSION = [];
    session_destroy();
    odgovor(true, 'Uspešno ste se odjavili.');
}

if ($akcija === 'adminKorisnici') {
    $admin = zahtevajAdmina($baza);
    $stranica = max(1, (int)($_GET['stranica'] ?? 1));
    $poStranici = min(30, max(1, (int)($_GET['poStranici'] ?? 12)));
    $pretraga = mb_substr(trim((string)($_GET['pretraga'] ?? '')), 0, 100);
    $offset = ($stranica - 1) * $poStranici;
    $obrazac = '%' . $pretraga . '%';

    $broj = pripremi($baza, 'SELECT COUNT(*) AS `Ukupno` FROM `Nalog` WHERE `Ime` LIKE ? OR `Prezime` LIKE ? OR CONCAT(`Ime`, \' \', `Prezime`) LIKE ?');
    $broj->bind_param('sss', $obrazac, $obrazac, $obrazac);
    $broj->execute();
    $ukupno = (int)$broj->get_result()->fetch_assoc()['Ukupno'];

    $upit = pripremi($baza, 'SELECT `ID`, `Ime`, `Prezime`, `Email`, `BrojTelefona`, `Role`, `Active`, `CreatedAt` FROM `Nalog` WHERE `Ime` LIKE ? OR `Prezime` LIKE ? OR CONCAT(`Ime`, \' \', `Prezime`) LIKE ? ORDER BY `Ime` ASC, `Prezime` ASC, `ID` ASC LIMIT ? OFFSET ?');
    $upit->bind_param('sssii', $obrazac, $obrazac, $obrazac, $poStranici, $offset);
    $upit->execute();
    odgovor(true, '', ['korisnici' => $upit->get_result()->fetch_all(MYSQLI_ASSOC), 'ukupno' => $ukupno, 'stranica' => $stranica, 'imaJos' => $offset + $poStranici < $ukupno, 'adminId' => (int)$admin['ID']]);
}

if ($akcija === 'adminPromeniStatus') {
    $admin = zahtevajAdmina($baza);
    $idNaloga = filter_var($_POST['idNaloga'] ?? null, FILTER_VALIDATE_INT);
    $aktivnost = (string)($_POST['aktivnost'] ?? '');
    if (!$idNaloga || !in_array($aktivnost, ['Da', 'Ne'], true)) {
        odgovor(false, 'Podaci za promenu statusa nisu ispravni.', [], 400);
    }
    if ((int)$admin['ID'] === (int)$idNaloga) {
        odgovor(false, 'Ne možete promeniti status sopstvenog naloga.', [], 400);
    }
    $upit = pripremi($baza, 'UPDATE `Nalog` SET `Active` = ? WHERE `ID` = ?');
    $upit->bind_param('si', $aktivnost, $idNaloga);
    $upit->execute();
    if ($upit->affected_rows < 1) {
        odgovor(false, 'Korisnik nije pronađen ili status nije promenjen.', [], 404);
    }
    odgovor(true, $aktivnost === 'Da' ? 'Nalog je aktiviran.' : 'Nalog je deaktiviran.');
}

if ($akcija === 'adminObrisiNalog') {
    $admin = zahtevajAdmina($baza);
    $idNaloga = filter_var($_POST['idNaloga'] ?? null, FILTER_VALIDATE_INT);
    if (!$idNaloga) {
        odgovor(false, 'Korisnik nije pronađen.', [], 404);
    }
    if ((int)$admin['ID'] === (int)$idNaloga) {
        odgovor(false, 'Ne možete obrisati sopstveni nalog.', [], 400);
    }
    $upit = pripremi($baza, 'DELETE FROM `Nalog` WHERE `ID` = ?');
    $upit->bind_param('i', $idNaloga);
    $upit->execute();
    if ($upit->affected_rows !== 1) {
        odgovor(false, 'Korisnik nije pronađen.', [], 404);
    }
    odgovor(true, 'Nalog je obrisan.');
}

if ($akcija === 'kreirajOglas') {
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani da biste kreirali oglas.', [], 401);
    }

    $imeOglasa = trim((string)($_POST['imeOglasa'] ?? ''));
    $vrstaPogona = trim((string)($_POST['vrstaPogona'] ?? ''));
    $cena = (float)($_POST['cena'] ?? -1);
    $stanje = (string)($_POST['stanje'] ?? '');
    $mestoProdavca = trim((string)($_POST['mestoProdavca'] ?? ''));
    $dodatanInfo = trim((string)($_POST['dodatneInformacije'] ?? ''));
    $slika = $_FILES['slika'] ?? null;
    $dozvoljeneVrstePogona = ['Benzin/mesavina', 'Elektro', 'Akumulatorski', 'Ostalo'];

    if ($imeOglasa === '' || !in_array($vrstaPogona, $dozvoljeneVrstePogona, true) || $cena < 0 || !in_array($stanje, ['Polovno', 'Novo'], true) || $mestoProdavca === '' || $dodatanInfo === '' || !$slika || $slika['error'] !== UPLOAD_ERR_OK) {
        odgovor(false, 'Popunite sva polja i izaberite sliku proizvoda.', [], 400);
    }
    if ($slika['size'] > 10 * 1024 * 1024) {
        odgovor(false, 'Slika može imati najviše 10 MB.', [], 400);
    }

    $tipSlike = (new finfo(FILEINFO_MIME_TYPE))->file($slika['tmp_name']);
    if (!is_string($tipSlike) || !str_starts_with($tipSlike, 'image/')) {
        odgovor(false, 'Izabrani fajl mora biti slika.', [], 400);
    }
    $sadrzajSlike = file_get_contents($slika['tmp_name']);
    if ($sadrzajSlike === false) {
        odgovor(false, 'Slika nije mogla da se učita.', [], 400);
    }

    $nalogUpit = pripremi($baza, "SELECT `ID`, `BrojTelefona` FROM `Nalog` WHERE `Email` = ? AND `Active` = 'Da' LIMIT 1");
    $nalogEmail = (string)$_SESSION['email'];
    $nalogUpit->bind_param('s', $nalogEmail);
    if (!$nalogUpit->execute()) {
        odgovor(false, 'Greška baze pri pronalaženju korisnika: ' . $nalogUpit->error, [], 500);
    }
    $nalog = $nalogUpit->get_result()->fetch_assoc();
    if (!$nalog) {
        odgovor(false, 'Korisnički nalog nije pronađen.', [], 404);
    }

    $idNaloga = (int)$nalog['ID'];
    $brojTelefona = (string)$nalog['BrojTelefona'];
    $unos = pripremi($baza, 'INSERT INTO `Oglas` (`IDNaloga`, `BrojTelefona`, `ImeOglasa`, `VrstaPogona`, `Cena`, `SlikaProizvoda`, `StanjeProizvoda`, `MestoProdavca`, `DodatanInfo`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $unos->bind_param('isssdssss', $idNaloga, $brojTelefona, $imeOglasa, $vrstaPogona, $cena, $sadrzajSlike, $stanje, $mestoProdavca, $dodatanInfo);
    if (!$unos->execute()) {
        odgovor(false, 'Greška baze pri upisu oglasa: ' . $unos->error, [], 500);
    }
    odgovor(true, 'Oglas je uspešno kreiran.', ['idOglasa' => $baza->insert_id]);
}

if ($akcija === 'mojiOglasi') {
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani da biste videli svoje oglase.', [], 401);
    }
    $upit = pripremi($baza, 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, `O`.`Status`, `O`.`DatumPostavljanja`, `O`.`BrojPregleda`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga` WHERE `N`.`Email` = ? ORDER BY `O`.`IDOglasa` DESC');
    $mojEmail = (string)$_SESSION['email'];
    $upit->bind_param('s', $mojEmail);
    $upit->execute();
    $oglasi = $upit->get_result();
    odgovor(true, '', ['oglasi' => $oglasi->fetch_all(MYSQLI_ASSOC)]);
}

if ($akcija === 'mojOglas') {
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani da biste menjali oglas.', [], 401);
    }
    $idOglasa = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$idOglasa) {
        odgovor(false, 'Oglas nije pronađen.', [], 404);
    }
    $upit = pripremi($baza, 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, `O`.`Status`, `O`.`DatumPostavljanja`, `O`.`BrojPregleda`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga` WHERE `O`.`IDOglasa` = ? AND `N`.`Email` = ? LIMIT 1');
    $mojEmail = (string)$_SESSION['email'];
    $upit->bind_param('is', $idOglasa, $mojEmail);
    $upit->execute();
    $oglas = $upit->get_result()->fetch_assoc();
    if (!$oglas) {
        odgovor(false, 'Oglas nije pronađen ili ne pripada ulogovanom korisniku.', [], 404);
    }
    odgovor(true, '', ['oglas' => $oglas]);
}

if ($akcija === 'izmeniOglas') {
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani da biste menjali oglas.', [], 401);
    }

    $idOglasa = filter_var($_POST['idOglasa'] ?? null, FILTER_VALIDATE_INT);
    $imeOglasa = trim((string)($_POST['imeOglasa'] ?? ''));
    $vrstaPogona = trim((string)($_POST['vrstaPogona'] ?? ''));
    $cena = (float)($_POST['cena'] ?? -1);
    $stanje = (string)($_POST['stanje'] ?? '');
    $mestoProdavca = trim((string)($_POST['mestoProdavca'] ?? ''));
    $dodatanInfo = trim((string)($_POST['dodatneInformacije'] ?? ''));
    $status = (string)($_POST['status'] ?? '');
    $slika = $_FILES['slika'] ?? null;
    $dozvoljeneVrstePogona = ['Benzin/mesavina', 'Elektro', 'Akumulatorski', 'Ostalo'];
    $dozvoljeniStatusi = ['Aktivan', 'Neaktivan', 'Prodat'];

    if (!$idOglasa || $imeOglasa === '' || !in_array($vrstaPogona, $dozvoljeneVrstePogona, true) || $cena < 0 || !in_array($stanje, ['Polovno', 'Novo'], true) || $mestoProdavca === '' || $dodatanInfo === '' || !in_array($status, $dozvoljeniStatusi, true)) {
        odgovor(false, 'Popunite sva polja i izaberite ispravne vrednosti.', [], 400);
    }

    $sadrzajSlike = null;
    $imaNovuSliku = $slika && $slika['error'] !== UPLOAD_ERR_NO_FILE;
    if ($imaNovuSliku) {
        if ($slika['error'] !== UPLOAD_ERR_OK || $slika['size'] > 10 * 1024 * 1024) {
            odgovor(false, 'Slika može imati najviše 10 MB.', [], 400);
        }
        $tipSlike = (new finfo(FILEINFO_MIME_TYPE))->file($slika['tmp_name']);
        if (!is_string($tipSlike) || !str_starts_with($tipSlike, 'image/')) {
            odgovor(false, 'Izabrani fajl mora biti slika.', [], 400);
        }
        $sadrzajSlike = file_get_contents($slika['tmp_name']);
        if ($sadrzajSlike === false) {
            odgovor(false, 'Slika nije mogla da se učita.', [], 400);
        }
    }

    $mojEmail = (string)$_SESSION['email'];
    $provera = pripremi($baza, 'SELECT `ID` FROM `Nalog` WHERE `Email` = ? LIMIT 1');
    $provera->bind_param('s', $mojEmail);
    $provera->execute();
    $nalog = $provera->get_result()->fetch_assoc();
    if (!$nalog) {
        odgovor(false, 'Korisnički nalog nije pronađen.', [], 404);
    }
    $idNaloga = (int)$nalog['ID'];
    $vlasnistvo = pripremi($baza, 'SELECT 1 FROM `Oglas` WHERE `IDOglasa` = ? AND `IDNaloga` = ? LIMIT 1');
    $vlasnistvo->bind_param('ii', $idOglasa, $idNaloga);
    $vlasnistvo->execute();
    if (!$vlasnistvo->get_result()->fetch_assoc()) {
        odgovor(false, 'Oglas nije pronađen ili ne pripada ulogovanom korisniku.', [], 404);
    }

    if ($imaNovuSliku) {
        $izmena = pripremi($baza, 'UPDATE `Oglas` SET `ImeOglasa` = ?, `VrstaPogona` = ?, `Cena` = ?, `SlikaProizvoda` = ?, `StanjeProizvoda` = ?, `MestoProdavca` = ?, `DodatanInfo` = ?, `Status` = ? WHERE `IDOglasa` = ? AND `IDNaloga` = ?');
        $izmena->bind_param('ssdssssiii', $imeOglasa, $vrstaPogona, $cena, $sadrzajSlike, $stanje, $mestoProdavca, $dodatanInfo, $status, $idOglasa, $idNaloga);
    } else {
        $izmena = pripremi($baza, 'UPDATE `Oglas` SET `ImeOglasa` = ?, `VrstaPogona` = ?, `Cena` = ?, `StanjeProizvoda` = ?, `MestoProdavca` = ?, `DodatanInfo` = ?, `Status` = ? WHERE `IDOglasa` = ? AND `IDNaloga` = ?');
        $izmena->bind_param('ssdssssii', $imeOglasa, $vrstaPogona, $cena, $stanje, $mestoProdavca, $dodatanInfo, $status, $idOglasa, $idNaloga);
    }
    if (!$izmena->execute()) {
        odgovor(false, 'Oglas nije pronađen ili ne pripada ulogovanom korisniku.', [], 404);
    }
    odgovor(true, 'Oglas je uspešno izmenjen.');
}

if ($akcija === 'obrisiOglas') {
    if (!isset($_SESSION['email'])) {
        odgovor(false, 'Morate biti ulogovani da biste obrisali oglas.', [], 401);
    }

    $idOglasa = filter_var($_POST['idOglasa'] ?? null, FILTER_VALIDATE_INT);
    if (!$idOglasa) {
        odgovor(false, 'Oglas nije pronađen.', [], 404);
    }

    $mojEmail = (string)$_SESSION['email'];
    $brisanje = pripremi($baza, 'DELETE `O` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga` WHERE `O`.`IDOglasa` = ? AND `N`.`Email` = ?');
    $brisanje->bind_param('is', $idOglasa, $mojEmail);
    if (!$brisanje->execute() || $brisanje->affected_rows !== 1) {
        odgovor(false, 'Oglas nije pronađen ili ne pripada ulogovanom korisniku.', [], 404);
    }
    odgovor(true, 'Oglas je uspešno obrisan.');
}

if ($akcija === 'oglasi') {
    $dozvoljeneVrstePogona = ['Benzin/mesavina', 'Elektro', 'Akumulatorski', 'Ostalo'];
    $ulazneVrstePogona = $_GET['vrstaPogona'] ?? [];
    $ulazneVrstePogona = is_array($ulazneVrstePogona) ? $ulazneVrstePogona : [$ulazneVrstePogona];
    $vrstePogona = array_values(array_intersect($dozvoljeneVrstePogona, array_map(static fn($vrsta): string => (string)$vrsta, $ulazneVrstePogona)));
    $stanje = (string)($_GET['stanje'] ?? '');

    if ($stanje !== '' && !in_array($stanje, ['Polovno', 'Novo'], true)) {
        odgovor(false, 'Izabrano stanje oglasa nije ispravno.', [], 400);
    }

    $uslovi = ['`O`.`Status` <> \'Neaktivan\''];
    $vrednosti = [];
    $tipovi = '';
    if ($vrstePogona) {
        $mesta = implode(', ', array_fill(0, count($vrstePogona), '?'));
        $uslovi[] = "`O`.`VrstaPogona` IN ($mesta)";
        $tipovi .= str_repeat('s', count($vrstePogona));
        $vrednosti = array_merge($vrednosti, $vrstePogona);
    }
    if ($stanje !== '') {
        $uslovi[] = '`O`.`StanjeProizvoda` = ?';
        $tipovi .= 's';
        $vrednosti[] = $stanje;
    }

    $sql = 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`Status`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda`, `N`.`Ime`, `N`.`Prezime` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga`';
    if ($uslovi) {
        $sql .= ' WHERE ' . implode(' AND ', $uslovi);
    }
    $sql .= ' ORDER BY `O`.`IDOglasa` DESC';

    $upit = pripremi($baza, $sql);
    if ($vrednosti) {
        $parametri = [&$tipovi];
        foreach ($vrednosti as $indeks => $vrednost) {
            $parametri[] = &$vrednosti[$indeks];
        }
        call_user_func_array([$upit, 'bind_param'], $parametri);
    }
    if (!$upit->execute()) {
        odgovor(false, 'Greška baze: ' . $upit->error, [], 500);
    }
    $rezultati = $upit->get_result();
    if (!$rezultati) {
        odgovor(false, 'Greška baze: ' . $baza->error, [], 500);
    }
    odgovor(true, '', ['oglasi' => $rezultati->fetch_all(MYSQLI_ASSOC)]);
}

if ($akcija === 'oglas') {
    $idOglasa = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$idOglasa) {
        odgovor(false, 'Oglas nije pronađen.', [], 404);
    }
    $upit = pripremi($baza, 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, `O`.`BrojPregleda`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda`, `N`.`Ime`, `N`.`Prezime`, `N`.`Email` AS `EmailVlasnika` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga` WHERE `O`.`IDOglasa` = ? LIMIT 1');
    $upit->bind_param('i', $idOglasa);
    $upit->execute();
    $oglas = $upit->get_result()->fetch_assoc();
    $emailVlasnika = (string)$oglas['EmailVlasnika'];
    unset($oglas['EmailVlasnika']);
    $emailPosetioca = isset($_SESSION['email']) ? (string)$_SESSION['email'] : '';
    if ($emailPosetioca === '' || !hash_equals($emailVlasnika, $emailPosetioca)) {
        $brojac = pripremi($baza, 'UPDATE `Oglas` SET `BrojPregleda` = `BrojPregleda` + 1 WHERE `IDOglasa` = ?');
        $brojac->bind_param('i', $idOglasa);
        if ($brojac->execute()) {
            $oglas['BrojPregleda'] = (int)$oglas['BrojPregleda'] + 1;
        }
    }
    if (!$oglas) {
        odgovor(false, 'Oglas nije pronađen.', [], 404);
    }
    odgovor(true, '', ['oglas' => $oglas]);
}

odgovor(false, 'Nepoznata akcija.', [], 400);
