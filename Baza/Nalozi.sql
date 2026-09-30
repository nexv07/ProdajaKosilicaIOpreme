CREATE TABLE IF NOT EXISTS `Nalog` (
    `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Ime` VARCHAR(100) NOT NULL,
    `Prezime` VARCHAR(100) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `BrojTelefona` VARCHAR(30) NOT NULL,
    `Lozinku` VARCHAR(255) NOT NULL,
    `Role` ENUM('Korisnik', 'Admin') NOT NULL DEFAULT 'Korisnik',
    `Active` ENUM('Da', 'Ne') NOT NULL DEFAULT 'Da',
    `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`ID`),
    UNIQUE KEY `uq_nalog_email` (`Email`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Migracija starih instalacija: stari nazivi se prebacuju na novu strukturu.
SET @ima_starog_id = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'IDNaloga'
);
SET @ima_novog_id = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'ID'
);
SET @preimenuj_id = IF(
    @ima_starog_id = 1 AND @ima_novog_id = 0,
    'ALTER TABLE `Nalog` CHANGE COLUMN `IDNaloga` `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT',
    'SELECT 1'
);
PREPARE preimenuj_id FROM @preimenuj_id;
EXECUTE preimenuj_id;
DEALLOCATE PREPARE preimenuj_id;

SET @ima_stare_lozinke = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Sifra'
);
SET @ima_nove_lozinke = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Lozinku'
);
SET @preimenuj_lozinku = IF(
    @ima_stare_lozinke = 1 AND @ima_nove_lozinke = 0,
    'ALTER TABLE `Nalog` CHANGE COLUMN `Sifra` `Lozinku` VARCHAR(255) NOT NULL',
    'SELECT 1'
);
PREPARE preimenuj_lozinku FROM @preimenuj_lozinku;
EXECUTE preimenuj_lozinku;
DEALLOCATE PREPARE preimenuj_lozinku;

SET @ima_ime = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Ime');
SET @dodaj_ime = IF(@ima_ime = 0, 'ALTER TABLE `Nalog` ADD COLUMN `Ime` VARCHAR(100) NULL AFTER `ID`', 'SELECT 1');
PREPARE dodaj_ime FROM @dodaj_ime;
EXECUTE dodaj_ime;
DEALLOCATE PREPARE dodaj_ime;
UPDATE `Nalog` SET `Ime` = 'Nepoznato' WHERE `Ime` IS NULL OR `Ime` = '';
ALTER TABLE `Nalog` MODIFY COLUMN `Ime` VARCHAR(100) NOT NULL;

SET @ima_prezime = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Prezime');
SET @dodaj_prezime = IF(@ima_prezime = 0, 'ALTER TABLE `Nalog` ADD COLUMN `Prezime` VARCHAR(100) NULL AFTER `Ime`', 'SELECT 1');
PREPARE dodaj_prezime FROM @dodaj_prezime;
EXECUTE dodaj_prezime;
DEALLOCATE PREPARE dodaj_prezime;
UPDATE `Nalog` SET `Prezime` = 'Nepoznato' WHERE `Prezime` IS NULL OR `Prezime` = '';
ALTER TABLE `Nalog` MODIFY COLUMN `Prezime` VARCHAR(100) NOT NULL;

SET @ima_role = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Role');
SET @dodaj_role = IF(@ima_role = 0, 'ALTER TABLE `Nalog` ADD COLUMN `Role` ENUM(''Korisnik'', ''Admin'') NOT NULL DEFAULT ''Korisnik'' AFTER `Lozinku`', 'SELECT 1');
PREPARE dodaj_role FROM @dodaj_role;
EXECUTE dodaj_role;
DEALLOCATE PREPARE dodaj_role;

SET @ima_active = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'Active');
SET @dodaj_active = IF(@ima_active = 0, 'ALTER TABLE `Nalog` ADD COLUMN `Active` ENUM(''Da'', ''Ne'') NOT NULL DEFAULT ''Da'' AFTER `Role`', 'SELECT 1');
PREPARE dodaj_active FROM @dodaj_active;
EXECUTE dodaj_active;
DEALLOCATE PREPARE dodaj_active;

SET @ima_created_at = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'CreatedAt');
SET @dodaj_created_at = IF(@ima_created_at = 0, 'ALTER TABLE `Nalog` ADD COLUMN `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Active`', 'SELECT 1');
PREPARE dodaj_created_at FROM @dodaj_created_at;
EXECUTE dodaj_created_at;
DEALLOCATE PREPARE dodaj_created_at;

-- Korisnicko ime vise nije deo naloga.
SET @ima_korisnicko_ime = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'KorisnickoIme');
SET @ukloni_korisnicko_ime = IF(@ima_korisnicko_ime = 1, 'ALTER TABLE `Nalog` DROP INDEX `uq_nalog_korisnicko_ime`, DROP COLUMN `KorisnickoIme`', 'SELECT 1');
PREPARE ukloni_korisnicko_ime FROM @ukloni_korisnicko_ime;
EXECUTE ukloni_korisnicko_ime;
DEALLOCATE PREPARE ukloni_korisnicko_ime;

CREATE TABLE IF NOT EXISTS `Oglas` (
    `IDOglasa` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `IDNaloga` INT UNSIGNED NOT NULL,
    `BrojTelefona` VARCHAR(30) NOT NULL,
    `ImeOglasa` VARCHAR(255) NOT NULL,
    `VrstaPogona` VARCHAR(100) NOT NULL,
    `Cena` DECIMAL(12,2) NOT NULL,
    `SlikaProizvoda` MEDIUMBLOB NOT NULL,
    `StanjeProizvoda` ENUM('Polovno', 'Novo') NOT NULL,
    `MestoProdavca` VARCHAR(150) NOT NULL,
    `DodatanInfo` TEXT NOT NULL,
    `Status` ENUM('Aktivan', 'Neaktivan', 'Prodat') NOT NULL DEFAULT 'Aktivan',
    `DatumPostavljanja` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `BrojPregleda` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`IDOglasa`),
    KEY `idx_oglas_nalog` (`IDNaloga`),
    CONSTRAINT `fk_oglas_nalog`
        FOREIGN KEY (`IDNaloga`) REFERENCES `Nalog` (`ID`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Broj telefona za postojece oglase.
SET @ima_broj_telefona_oglasa = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oglas' AND COLUMN_NAME = 'BrojTelefona'
);
SET @dodaj_broj_telefona_oglasa = IF(
    @ima_broj_telefona_oglasa = 0,
    'ALTER TABLE `Oglas` ADD COLUMN `BrojTelefona` VARCHAR(30) NULL AFTER `IDNaloga`',
    'SELECT 1'
);
PREPARE dodaj_broj_telefona_oglasa FROM @dodaj_broj_telefona_oglasa;
EXECUTE dodaj_broj_telefona_oglasa;
DEALLOCATE PREPARE dodaj_broj_telefona_oglasa;
UPDATE `Oglas` `O`
INNER JOIN `Nalog` `N` ON `N`.`ID` = `O`.`IDNaloga`
SET `O`.`BrojTelefona` = `N`.`BrojTelefona`
WHERE `O`.`BrojTelefona` IS NULL OR `O`.`BrojTelefona` = '';
UPDATE `Oglas` SET `BrojTelefona` = 'Nije unet' WHERE `BrojTelefona` IS NULL OR `BrojTelefona` = '';
ALTER TABLE `Oglas` MODIFY COLUMN `BrojTelefona` VARCHAR(30) NOT NULL;
