-- CreateTable
CREATE TABLE `demandelogement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demandeurId` INTEGER NOT NULL,
    `logementId` INTEGER NULL,
    `traitePar` INTEGER NULL,
    `motif` TEXT NOT NULL,
    `statut` ENUM('SOUMISE', 'EN_VALIDATION_DIRECTION', 'VALIDEE_DIRECTION', 'REJETEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE', 'REJETEE') NOT NULL DEFAULT 'SOUMISE',
    `priorite` ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE') NOT NULL DEFAULT 'NORMALE',
    `commentaire` TEXT NULL,
    `dateDepot` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateTraitement` DATETIME(3) NULL,
    `commentaireDirection` TEXT NULL,
    `dateValidationDirection` DATETIME(3) NULL,
    `valideParDirectionId` INTEGER NULL,

    INDEX `DemandeLogement_demandeurId_fkey`(`demandeurId` ASC),
    INDEX `DemandeLogement_logementId_fkey`(`logementId` ASC),
    INDEX `DemandeLogement_traitePar_fkey`(`traitePar` ASC),
    INDEX `DemandeLogement_valideParDirectionId_fkey`(`valideParDirectionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intervention` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `technicienId` INTEGER NOT NULL,
    `assignePar` INTEGER NULL,
    `description` TEXT NULL,
    `statut` ENUM('ASSIGNEE', 'EN_COURS', 'TERMINEE') NOT NULL DEFAULT 'ASSIGNEE',
    `rapport` TEXT NULL,
    `dateAssignation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateDebut` DATETIME(3) NULL,
    `dateFin` DATETIME(3) NULL,

    INDEX `Intervention_assignePar_fkey`(`assignePar` ASC),
    INDEX `Intervention_technicienId_fkey`(`technicienId` ASC),
    UNIQUE INDEX `Intervention_ticketId_key`(`ticketId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `adresse` TEXT NOT NULL,
    `ville` VARCHAR(191) NOT NULL,
    `quartier` VARCHAR(191) NULL,
    `type` ENUM('F1', 'F2', 'F3', 'F4', 'F5', 'VILLA') NOT NULL,
    `superficie` DOUBLE NULL,
    `nombrePieces` INTEGER NULL,
    `etage` INTEGER NOT NULL DEFAULT 0,
    `statut` ENUM('DISPONIBLE', 'OCCUPE', 'MAINTENANCE') NOT NULL DEFAULT 'DISPONIBLE',
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Logement_code_key`(`code` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mutation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demandeurId` INTEGER NOT NULL,
    `logementActuelId` INTEGER NOT NULL,
    `logementSouhaiteId` INTEGER NULL,
    `traitePar` INTEGER NULL,
    `motif` TEXT NOT NULL,
    `statut` ENUM('SOUMISE', 'EN_VALIDATION_DIRECTION', 'VALIDEE_DIRECTION', 'REJETEE_DIRECTION', 'EN_ETUDE_LOGEMENT', 'APPROUVEE', 'REJETEE') NOT NULL DEFAULT 'SOUMISE',
    `commentaire` TEXT NULL,
    `dateDepot` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateTraitement` DATETIME(3) NULL,
    `commentaireDirection` TEXT NULL,
    `dateValidationDirection` DATETIME(3) NULL,
    `valideParDirectionId` INTEGER NULL,

    INDEX `Mutation_demandeurId_fkey`(`demandeurId` ASC),
    INDEX `Mutation_logementActuelId_fkey`(`logementActuelId` ASC),
    INDEX `Mutation_logementSouhaiteId_fkey`(`logementSouhaiteId` ASC),
    INDEX `Mutation_traitePar_fkey`(`traitePar` ASC),
    INDEX `Mutation_valideParDirectionId_fkey`(`valideParDirectionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateurId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL DEFAULT 'INFO',
    `lu` BOOLEAN NOT NULL DEFAULT false,
    `lien` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_utilisateurId_fkey`(`utilisateurId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `occupation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateurId` INTEGER NOT NULL,
    `logementId` INTEGER NOT NULL,
    `dateEntree` DATETIME(3) NOT NULL,
    `dateSortie` DATETIME(3) NULL,
    `statut` ENUM('ACTIVE', 'TERMINEE') NOT NULL DEFAULT 'ACTIVE',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Occupation_logementId_fkey`(`logementId` ASC),
    INDEX `Occupation_utilisateurId_fkey`(`utilisateurId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paiement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `locataireId` INTEGER NOT NULL,
    `logementId` INTEGER NOT NULL,
    `montant` DECIMAL(10, 2) NOT NULL,
    `modePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'PRELEVEMENT_SALAIRE') NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'PAYE', 'EN_RETARD', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    `periodeMois` INTEGER NOT NULL,
    `periodeAnnee` INTEGER NOT NULL,
    `dateEcheance` DATETIME(3) NOT NULL,
    `datePaiement` DATETIME(3) NULL,
    `referenceTransaction` VARCHAR(255) NULL,
    `enregistrePar` INTEGER NULL,
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Paiement_enregistrePar_fkey`(`enregistrePar` ASC),
    INDEX `Paiement_locataireId_fkey`(`locataireId` ASC),
    INDEX `Paiement_logementId_fkey`(`logementId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photointervention` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `uploadedById` INTEGER NOT NULL,
    `typePhoto` ENUM('SIGNALEMENT', 'CONSTAT', 'AVANT_REPARATION', 'APRES_REPARATION') NOT NULL,
    `urlPhoto` VARCHAR(500) NOT NULL,
    `publicIdCloudinary` VARCHAR(255) NULL,
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhotoIntervention_ticketId_fkey`(`ticketId` ASC),
    INDEX `PhotoIntervention_uploadedById_fkey`(`uploadedById` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticketmaintenance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `demandeurId` INTEGER NOT NULL,
    `logementId` INTEGER NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `priorite` ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE') NOT NULL DEFAULT 'NORMALE',
    `statut` ENUM('SOUMIS', 'CONSTAT_PROGRAMME', 'CONSTAT_EFFECTUE', 'PRISE_EN_CHARGE_LOCATAIRE', 'PRISE_EN_CHARGE_SONAPIE', 'EN_ATTENTE_CONFIRMATION_LOCATAIRE', 'ASSIGNE_TECHNICIEN', 'EN_COURS', 'VERIFICATION_SONAPIE', 'CLOTURE', 'REOUVERT') NOT NULL DEFAULT 'SOUMIS',
    `dateDepot` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateCloture` DATETIME(3) NULL,
    `agentConstatId` INTEGER NULL,
    `agentVerificationId` INTEGER NULL,
    `commentaireConstat` TEXT NULL,
    `conformeApresVerif` BOOLEAN NULL,
    `dateConfirmationLocataire` DATETIME(3) NULL,
    `dateConstat` DATETIME(3) NULL,
    `dateVerification` DATETIME(3) NULL,
    `modeReparation` VARCHAR(191) NULL,

    INDEX `TicketMaintenance_agentConstatId_fkey`(`agentConstatId` ASC),
    INDEX `TicketMaintenance_agentVerificationId_fkey`(`agentVerificationId` ASC),
    INDEX `TicketMaintenance_demandeurId_fkey`(`demandeurId` ASC),
    INDEX `TicketMaintenance_logementId_fkey`(`logementId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilisateur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `motDePasse` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'DIRECTION', 'LOCATAIRE', 'RESPONSABLE', 'TECHNICIEN') NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `numeroMatricule` VARCHAR(191) NULL,
    `typeLocataire` ENUM('PRIVE', 'FONCTIONNAIRE') NULL,

    UNIQUE INDEX `Utilisateur_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
