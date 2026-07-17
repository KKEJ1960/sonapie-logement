-- AlterTable
ALTER TABLE `Utilisateur` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DIRECTION', 'LOCATAIRE', 'RESPONSABLE', 'TECHNICIEN', 'SERVICE_LOGEMENT') NOT NULL;

-- AlterTable
ALTER TABLE `Logement` ADD COLUMN `ascenseur` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `climatisation` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `descriptionCommerciale` TEXT NULL,
    ADD COLUMN `eauCourante` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `electricite` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `gardien` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `internet` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `meuble` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `montantLoyer` DECIMAL(10, 2) NULL,
    ADD COLUMN `parking` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `DemandeLogement` ADD COLUMN `alerteDisponibilite` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `PhotoLogement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `logementId` INTEGER NOT NULL,
    `uploadedById` INTEGER NOT NULL,
    `typePiece` ENUM('SALON', 'CHAMBRE', 'CUISINE', 'SALLE_DE_BAIN', 'TOILETTES', 'BALCON', 'TERRASSE', 'JARDIN', 'GARAGE', 'ENTREE', 'FACADE', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
    `urlPhoto` VARCHAR(500) NOT NULL,
    `publicIdCloudinary` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PhotoLogement` ADD CONSTRAINT `PhotoLogement_logementId_fkey` FOREIGN KEY (`logementId`) REFERENCES `Logement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoLogement` ADD CONSTRAINT `PhotoLogement_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
