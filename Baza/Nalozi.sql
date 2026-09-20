CREATE TABLE IF NOT EXISTS `Nalog` (
    `IDNaloga` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Email` VARCHAR(255) NOT NULL,
    `BrojTelefona` VARCHAR(30) NOT NULL,
    `KorisnickoIme` VARCHAR(100) NOT NULL,
    `Sifra` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`IDNaloga`),
    UNIQUE KEY `uq_nalog_email` (`Email`),
    UNIQUE KEY `uq_nalog_korisnicko_ime` (`KorisnickoIme`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Migracija za postojece instalacije u kojima je Nalog vec postojao bez IDNaloga.
SET @ima_id_naloga = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'IDNaloga'
);
SET @dodaj_id_naloga = IF(
    @ima_id_naloga = 0,
    'ALTER TABLE `Nalog` ADD COLUMN `IDNaloga` INT UNSIGNED NULL FIRST',
    'SELECT 1'
);
PREPARE dodaj_id_naloga FROM @dodaj_id_naloga;
EXECUTE dodaj_id_naloga;
DEALLOCATE PREPARE dodaj_id_naloga;

-- Popunjavanje kljuceva za postojece naloge pre dodavanja ogranicenja NOT NULL.
SET @brojac_naloga = (SELECT COALESCE(MAX(`IDNaloga`), 0) FROM `Nalog`);
UPDATE `Nalog`
SET `IDNaloga` = (@brojac_naloga := @brojac_naloga + 1)
WHERE `IDNaloga` IS NULL
ORDER BY `KorisnickoIme`;
ALTER TABLE `Nalog` MODIFY COLUMN `IDNaloga` INT UNSIGNED NOT NULL;

SET @ima_primarni_kljuc = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @dodaj_primarni_kljuc = IF(
    @ima_primarni_kljuc = 0,
    'ALTER TABLE `Nalog` ADD PRIMARY KEY (`IDNaloga`)',
    'SELECT 1'
);
PREPARE dodaj_primarni_kljuc FROM @dodaj_primarni_kljuc;
EXECUTE dodaj_primarni_kljuc;
DEALLOCATE PREPARE dodaj_primarni_kljuc;

SET @id_naloga_auto_increment = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog'
      AND COLUMN_NAME = 'IDNaloga' AND EXTRA = 'auto_increment'
);
SET @dodaj_auto_increment = IF(
    @id_naloga_auto_increment = 0,
    'ALTER TABLE `Nalog` MODIFY COLUMN `IDNaloga` INT UNSIGNED NOT NULL AUTO_INCREMENT',
    'SELECT 1'
);
PREPARE dodaj_auto_increment FROM @dodaj_auto_increment;
EXECUTE dodaj_auto_increment;
DEALLOCATE PREPARE dodaj_auto_increment;

-- Broj telefona za postojece naloge.
SET @ima_broj_telefona_naloga = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nalog' AND COLUMN_NAME = 'BrojTelefona'
);
SET @dodaj_broj_telefona_naloga = IF(
    @ima_broj_telefona_naloga = 0,
    'ALTER TABLE `Nalog` ADD COLUMN `BrojTelefona` VARCHAR(30) NULL AFTER `Email`',
    'SELECT 1'
);
PREPARE dodaj_broj_telefona_naloga FROM @dodaj_broj_telefona_naloga;
EXECUTE dodaj_broj_telefona_naloga;
DEALLOCATE PREPARE dodaj_broj_telefona_naloga;
UPDATE `Nalog` SET `BrojTelefona` = 'Nije unet' WHERE `BrojTelefona` IS NULL OR `BrojTelefona` = '';
ALTER TABLE `Nalog` MODIFY COLUMN `BrojTelefona` VARCHAR(30) NOT NULL;

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
    PRIMARY KEY (`IDOglasa`),
    KEY `idx_oglas_nalog` (`IDNaloga`),
    CONSTRAINT `fk_oglas_nalog`
        FOREIGN KEY (`IDNaloga`) REFERENCES `Nalog` (`IDNaloga`)
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
INNER JOIN `Nalog` `N` ON `N`.`IDNaloga` = `O`.`IDNaloga`
SET `O`.`BrojTelefona` = `N`.`BrojTelefona`
WHERE `O`.`BrojTelefona` IS NULL OR `O`.`BrojTelefona` = '';
UPDATE `Oglas` SET `BrojTelefona` = 'Nije unet' WHERE `BrojTelefona` IS NULL OR `BrojTelefona` = '';
ALTER TABLE `Oglas` MODIFY COLUMN `BrojTelefona` VARCHAR(30) NOT NULL;
