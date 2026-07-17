-- DropIndex
DROP INDEX `DemandeLogement_demandeurId_fkey` ON `demandelogement`;

-- DropIndex
DROP INDEX `DemandeLogement_logementId_fkey` ON `demandelogement`;

-- DropIndex
DROP INDEX `DemandeLogement_traitePar_fkey` ON `demandelogement`;

-- DropIndex
DROP INDEX `DemandeLogement_valideParDirectionId_fkey` ON `demandelogement`;

-- DropIndex
DROP INDEX `Intervention_assignePar_fkey` ON `intervention`;

-- DropIndex
DROP INDEX `Intervention_technicienId_fkey` ON `intervention`;

-- DropIndex
DROP INDEX `LogActivite_utilisateurId_fkey` ON `logactivite`;

-- DropIndex
DROP INDEX `Mutation_demandeurId_fkey` ON `mutation`;

-- DropIndex
DROP INDEX `Mutation_logementActuelId_fkey` ON `mutation`;

-- DropIndex
DROP INDEX `Mutation_logementSouhaiteId_fkey` ON `mutation`;

-- DropIndex
DROP INDEX `Mutation_traitePar_fkey` ON `mutation`;

-- DropIndex
DROP INDEX `Mutation_valideParDirectionId_fkey` ON `mutation`;

-- DropIndex
DROP INDEX `Notification_utilisateurId_fkey` ON `notification`;

-- DropIndex
DROP INDEX `Occupation_logementId_fkey` ON `occupation`;

-- DropIndex
DROP INDEX `Occupation_utilisateurId_fkey` ON `occupation`;

-- DropIndex
DROP INDEX `Paiement_enregistrePar_fkey` ON `paiement`;

-- DropIndex
DROP INDEX `Paiement_locataireId_fkey` ON `paiement`;

-- DropIndex
DROP INDEX `Paiement_logementId_fkey` ON `paiement`;

-- DropIndex
DROP INDEX `PhotoIntervention_ticketId_fkey` ON `photointervention`;

-- DropIndex
DROP INDEX `PhotoIntervention_uploadedById_fkey` ON `photointervention`;

-- DropIndex
DROP INDEX `TicketMaintenance_agentConstatId_fkey` ON `ticketmaintenance`;

-- DropIndex
DROP INDEX `TicketMaintenance_agentVerificationId_fkey` ON `ticketmaintenance`;

-- DropIndex
DROP INDEX `TicketMaintenance_demandeurId_fkey` ON `ticketmaintenance`;

-- DropIndex
DROP INDEX `TicketMaintenance_logementId_fkey` ON `ticketmaintenance`;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateurId` INTEGER NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `typeDocument` ENUM('PIECE_IDENTITE', 'JUSTIFICATIF_DOMICILE', 'BAIL', 'QUITTANCE', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
    `urlFichier` VARCHAR(500) NOT NULL,
    `publicIdCloudinary` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DemandeLogement` ADD CONSTRAINT `DemandeLogement_demandeurId_fkey` FOREIGN KEY (`demandeurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandeLogement` ADD CONSTRAINT `DemandeLogement_logementId_fkey` FOREIGN KEY (`logementId`) REFERENCES `Logement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandeLogement` ADD CONSTRAINT `DemandeLogement_traitePar_fkey` FOREIGN KEY (`traitePar`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandeLogement` ADD CONSTRAINT `DemandeLogement_valideParDirectionId_fkey` FOREIGN KEY (`valideParDirectionId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mutation` ADD CONSTRAINT `Mutation_demandeurId_fkey` FOREIGN KEY (`demandeurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mutation` ADD CONSTRAINT `Mutation_logementActuelId_fkey` FOREIGN KEY (`logementActuelId`) REFERENCES `Logement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mutation` ADD CONSTRAINT `Mutation_logementSouhaiteId_fkey` FOREIGN KEY (`logementSouhaiteId`) REFERENCES `Logement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mutation` ADD CONSTRAINT `Mutation_traitePar_fkey` FOREIGN KEY (`traitePar`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mutation` ADD CONSTRAINT `Mutation_valideParDirectionId_fkey` FOREIGN KEY (`valideParDirectionId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMaintenance` ADD CONSTRAINT `TicketMaintenance_demandeurId_fkey` FOREIGN KEY (`demandeurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMaintenance` ADD CONSTRAINT `TicketMaintenance_logementId_fkey` FOREIGN KEY (`logementId`) REFERENCES `Logement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMaintenance` ADD CONSTRAINT `TicketMaintenance_agentConstatId_fkey` FOREIGN KEY (`agentConstatId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMaintenance` ADD CONSTRAINT `TicketMaintenance_agentVerificationId_fkey` FOREIGN KEY (`agentVerificationId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intervention` ADD CONSTRAINT `Intervention_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TicketMaintenance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intervention` ADD CONSTRAINT `Intervention_technicienId_fkey` FOREIGN KEY (`technicienId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intervention` ADD CONSTRAINT `Intervention_assignePar_fkey` FOREIGN KEY (`assignePar`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Occupation` ADD CONSTRAINT `Occupation_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Occupation` ADD CONSTRAINT `Occupation_logementId_fkey` FOREIGN KEY (`logementId`) REFERENCES `Logement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoIntervention` ADD CONSTRAINT `PhotoIntervention_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TicketMaintenance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoIntervention` ADD CONSTRAINT `PhotoIntervention_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paiement` ADD CONSTRAINT `Paiement_locataireId_fkey` FOREIGN KEY (`locataireId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paiement` ADD CONSTRAINT `Paiement_logementId_fkey` FOREIGN KEY (`logementId`) REFERENCES `Logement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paiement` ADD CONSTRAINT `Paiement_enregistrePar_fkey` FOREIGN KEY (`enregistrePar`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogActivite` ADD CONSTRAINT `LogActivite_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
