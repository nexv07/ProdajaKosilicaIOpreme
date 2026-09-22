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

try {
    $baza = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
    $baza->set_charset('utf8mb4');
} catch (Throwable $greska) {
    odgovor(false, 'Povezivanje sa bazom nije uspelo.', [], 500);
}

$akcija = $_GET['akcija'] ?? '';
$ulaz = json_decode(file_get_contents('php://input'), true) ?? [];

if ($akcija === 'registracija') {
    $email = trim((string)($ulaz['email'] ?? ''));
    $brojTelefona = trim((string)($ulaz['brojTelefona'] ?? ''));
    $korisnickoIme = trim((string)($ulaz['korisnickoIme'] ?? ''));
    $sifra = (string)($ulaz['sifra'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[0-9+()\s\/-]{6,30}$/u', $brojTelefona) || mb_strlen($korisnickoIme) < 3 || mb_strlen($sifra) < 6) {
        odgovor(false, 'Unesite ispravan email, korisničko ime i šifru od najmanje 6 karaktera.', [], 400);
    }

    $provera = $baza->prepare('SELECT 1 FROM `Nalog` WHERE `KorisnickoIme` = ? OR `Email` = ? LIMIT 1');
    $provera->bind_param('ss', $korisnickoIme, $email);
    $provera->execute();
    if ($provera->get_result()->num_rows > 0) {
        odgovor(false, 'Email ili korisničko ime već postoje.', [], 409);
    }

    $sifraHash = password_hash($sifra, PASSWORD_DEFAULT);
    $unos = $baza->prepare('INSERT INTO `Nalog` (`Email`, `BrojTelefona`, `KorisnickoIme`, `Sifra`) VALUES (?, ?, ?, ?)');
    $unos->bind_param('ssss', $email, $brojTelefona, $korisnickoIme, $sifraHash);
    $unos->execute();
    odgovor(true, 'Nalog je uspešno napravljen. Sada se možete ulogovati.');
}

if ($akcija === 'prijava') {
    $korisnickoIme = trim((string)($ulaz['korisnickoIme'] ?? ''));
    $sifra = (string)($ulaz['sifra'] ?? '');
    $upit = $baza->prepare('SELECT `KorisnickoIme`, `Sifra` FROM `Nalog` WHERE `KorisnickoIme` = ? LIMIT 1');
    $upit->bind_param('s', $korisnickoIme);
    $upit->execute();
    $nalog = $upit->get_result()->fetch_assoc();

    $ispravnaSifra = $nalog && (password_verify($sifra, $nalog['Sifra']) || hash_equals($nalog['Sifra'], $sifra));
    if (!$ispravnaSifra) {
        odgovor(false, 'Korisničko ime ili šifra nisu ispravni.', [], 401);
    }

    if (password_get_info($nalog['Sifra'])['algo'] === 0) {
        $noviHash = password_hash($sifra, PASSWORD_DEFAULT);
        $izmena = $baza->prepare('UPDATE `Nalog` SET `Sifra` = ? WHERE `KorisnickoIme` = ?');
        $izmena->bind_param('ss', $noviHash, $korisnickoIme);
        $izmena->execute();
    }

    $_SESSION['korisnickoIme'] = $nalog['KorisnickoIme'];
    odgovor(true, 'Uspešno ste se ulogovali.', ['korisnickoIme' => $nalog['KorisnickoIme']]);
}

if ($akcija === 'sesija') {
    odgovor(true, '', ['ulogovan' => isset($_SESSION['korisnickoIme']), 'korisnickoIme' => $_SESSION['korisnickoIme'] ?? null]);
}

if ($akcija === 'odjava') {
    $_SESSION = [];
    session_destroy();
    odgovor(true, 'Uspešno ste se odjavili.');
}

if ($akcija === 'kreirajOglas') {
    if (!isset($_SESSION['korisnickoIme'])) {
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

    $nalogUpit = pripremi($baza, 'SELECT `IDNaloga`, `BrojTelefona` FROM `Nalog` WHERE `KorisnickoIme` = ? LIMIT 1');
    $nalogUpit->bind_param('s', $_SESSION['korisnickoIme']);
    if (!$nalogUpit->execute()) {
        odgovor(false, 'Greška baze pri pronalaženju korisnika: ' . $nalogUpit->error, [], 500);
    }
    $nalog = $nalogUpit->get_result()->fetch_assoc();
    if (!$nalog) {
        odgovor(false, 'Korisnički nalog nije pronađen.', [], 404);
    }

    $idNaloga = (int)$nalog['IDNaloga'];
    $brojTelefona = (string)$nalog['BrojTelefona'];
    $unos = pripremi($baza, 'INSERT INTO `Oglas` (`IDNaloga`, `BrojTelefona`, `ImeOglasa`, `VrstaPogona`, `Cena`, `SlikaProizvoda`, `StanjeProizvoda`, `MestoProdavca`, `DodatanInfo`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $unos->bind_param('isssdssss', $idNaloga, $brojTelefona, $imeOglasa, $vrstaPogona, $cena, $sadrzajSlike, $stanje, $mestoProdavca, $dodatanInfo);
    if (!$unos->execute()) {
        odgovor(false, 'Greška baze pri upisu oglasa: ' . $unos->error, [], 500);
    }
    odgovor(true, 'Oglas je uspešno kreiran.', ['idOglasa' => $baza->insert_id]);
}

if ($akcija === 'oglasi') {
    $dozvoljeneVrstePogona = ['Benzin/mesavina', 'Elektro', 'Akumulatorski', 'Ostalo'];
    $ulazneVrstePogona = $_GET['vrstaPogona'] ?? [];
    $ulazneVrstePogona = is_array($ulazneVrstePogona) ? $ulazneVrstePogona : [$ulazneVrstePogona];
    $vrstePogona = array_values(array_intersect(
        $dozvoljeneVrstePogona,
        array_map(static fn($vrsta): string => (string)$vrsta, $ulazneVrstePogona)
    ));
    $stanje = (string)($_GET['stanje'] ?? '');

    if ($stanje !== '' && !in_array($stanje, ['Polovno', 'Novo'], true)) {
        odgovor(false, 'Izabrano stanje oglasa nije ispravno.', [], 400);
    }

    $uslovi = [];
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

    $sql = 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda`, `N`.`KorisnickoIme` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`IDNaloga` = `O`.`IDNaloga`';
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
    $upit = pripremi($baza, 'SELECT `O`.`IDOglasa`, `O`.`BrojTelefona`, `O`.`ImeOglasa`, `O`.`VrstaPogona`, `O`.`Cena`, `O`.`StanjeProizvoda`, `O`.`MestoProdavca`, `O`.`DodatanInfo`, TO_BASE64(`O`.`SlikaProizvoda`) AS `SlikaProizvoda`, `N`.`KorisnickoIme` FROM `Oglas` `O` INNER JOIN `Nalog` `N` ON `N`.`IDNaloga` = `O`.`IDNaloga` WHERE `O`.`IDOglasa` = ? LIMIT 1');
    $upit->bind_param('i', $idOglasa);
    $upit->execute();
    $oglas = $upit->get_result()->fetch_assoc();
    if (!$oglas) {
        odgovor(false, 'Oglas nije pronađen.', [], 404);
    }
    odgovor(true, '', ['oglas' => $oglas]);
}

odgovor(false, 'Nepoznata akcija.', [], 400);
