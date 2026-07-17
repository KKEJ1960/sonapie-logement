-- AlterTable
ALTER TABLE `DemandeLogement` ADD COLUMN `derniereActionAdmin` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `TicketMaintenance` ADD COLUMN `derniereActionAdmin` DATETIME(3) NULL;
