-- CreateTable
CREATE TABLE `Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demandeId` INTEGER NOT NULL,
    `locataireId` INTEGER NOT NULL,
    `serviceLogementId` INTEGER NULL,
    `statut` ENUM('EN_ATTENTE', 'ACTIVE', 'TERMINEE', 'ARCHIVEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Conversation_demandeId_key`(`demandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `expediteurId` INTEGER NOT NULL,
    `contenu` TEXT NOT NULL,
    `type` ENUM('TEXTE', 'DOCUMENT', 'NOTIFICATION_SYSTEME') NOT NULL DEFAULT 'TEXTE',
    `lu` BOOLEAN NOT NULL DEFAULT false,
    `urlFichier` VARCHAR(500) NULL,
    `nomFichier` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DossierClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demandeId` INTEGER NOT NULL,
    `locataireId` INTEGER NOT NULL,
    `dateNaissance` DATETIME(3) NULL,
    `lieuNaissance` VARCHAR(200) NULL,
    `nationalite` VARCHAR(100) NULL,
    `situationFamiliale` VARCHAR(50) NULL,
    `nombreEnfants` INTEGER NULL,
    `employeur` VARCHAR(200) NULL,
    `poste` VARCHAR(200) NULL,
    `anciennete` INTEGER NULL,
    `revenuMensuel` DECIMAL(10, 2) NULL,
    `ministere` VARCHAR(200) NULL,
    `direction` VARCHAR(200) NULL,
    `grade` VARCHAR(100) NULL,
    `indice` VARCHAR(50) NULL,
    `statut` ENUM('INCOMPLET', 'SOUMIS', 'EN_ETUDE', 'VALIDE', 'REJETE') NOT NULL DEFAULT 'INCOMPLET',
    `commentaireDirection` TEXT NULL,
    `dateEtude` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DossierClient_demandeId_key`(`demandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentDossier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dossierId` INTEGER NOT NULL,
    `type` ENUM('PIECE_IDENTITE', 'JUSTIFICATIF_DOMICILE', 'BULLETIN_SALAIRE', 'ATTESTATION_EMPLOI', 'ACTE_NAISSANCE', 'PHOTO_IDENTITE', 'CONTRAT_TRAVAIL', 'AVIS_IMPOSITION', 'AUTRE') NOT NULL,
    `urlFichier` VARCHAR(500) NOT NULL,
    `publicIdCloudinary` VARCHAR(255) NULL,
    `nomOriginal` VARCHAR(255) NULL,
    `valide` BOOLEAN NULL,
    `commentaire` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_demandeId_fkey` FOREIGN KEY (`demandeId`) REFERENCES `DemandeLogement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_locataireId_fkey` FOREIGN KEY (`locataireId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_serviceLogementId_fkey` FOREIGN KEY (`serviceLogementId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_expediteurId_fkey` FOREIGN KEY (`expediteurId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DossierClient` ADD CONSTRAINT `DossierClient_demandeId_fkey` FOREIGN KEY (`demandeId`) REFERENCES `DemandeLogement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DossierClient` ADD CONSTRAINT `DossierClient_locataireId_fkey` FOREIGN KEY (`locataireId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentDossier` ADD CONSTRAINT `DocumentDossier_dossierId_fkey` FOREIGN KEY (`dossierId`) REFERENCES `DossierClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
