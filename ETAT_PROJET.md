# État du projet SONAPIE

> Rapport généré par analyse statique du code (lecture seule, aucun fichier modifié).
> Date : 3 juillet 2026

---

## 📊 Résumé exécutif

**Avancement global estimé : ~70 %**

| Bloc | Avancement | Commentaire |
|---|---|---|
| Backend (API, base de données, workflows) | **~85 %** | Très solide pour les rôles LOCATAIRE / DIRECTION / ADMIN / SUPER_ADMIN / TECHNICIEN. Manque : intégration email, gateway de paiement réel. |
| Frontend — LOCATAIRE | **~95 %** | Le dashboard le plus abouti du projet. Toutes les données sont réelles. |
| Frontend — SUPER_ADMIN | **~95 %** | Dashboard complet, thème sombre distinctif, 5 sections fonctionnelles. |
| Frontend — ADMIN | **~80 %** | Dashboard riche mais plusieurs liens de navigation pointent vers des pages qui n'existent pas encore. |
| Frontend — DIRECTION | **~70 %** | Dashboard principal complet, mais presque tous les liens de la sidebar (hors page d'accueil) sont des liens morts. |
| Frontend — RESPONSABLE | **~5 %** | Aucun dashboard dédié. Redirection de connexion cassée (page blanche). |
| Frontend — TECHNICIEN | **~5 %** | Aucun dashboard dédié. Redirection de connexion cassée (page blanche), alors que le backend est prêt. |

**Les 3 points les plus critiques à corriger avant toute présentation :**
1. 🔴 **RESPONSABLE et TECHNICIEN atterrissent sur une page blanche après connexion** (`/responsable/dashboard` et `/technicien/dashboard` n'existent dans aucune route React, alors que `LoginPage.jsx` y redirige explicitement).
2. 🔴 **La sidebar de DirectionDashboard pointe vers 6 routes qui n'existent pas** (`/direction/demandes`, `/direction/demandes/nouvelles`, `/direction/mutations`, `/direction/rapports`, `/direction/journal`, etc.) — seule la page principale du dashboard fonctionne.
3. 🟠 **AdminDashboard pointe vers `/admin/demandes` et `/admin/maintenance`**, deux routes absentes de `App.jsx`.

---

## 1. Structure générale

### `client/src/`

```
client/src/
├── main.jsx
├── App.jsx
├── assets/                    (vide)
├── context/                   (vide)
├── utils/                     (vide)
├── components/
│   ├── ProtectedRoute.jsx
│   ├── SkeletonCard.jsx
│   └── admin/
│       └── AdminSidebar.jsx
├── hooks/
│   └── useApi.js
├── layouts/
│   └── MainLayout.jsx
├── pages/
│   ├── Dashboard.jsx                    (legacy, placeholder)
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   └── GestionUtilisateurs.jsx
│   ├── direction/
│   │   └── DirectionDashboard.jsx
│   ├── locataire/
│   │   └── LocataireDashboard.jsx       (2 264 lignes — le plus gros fichier du projet)
│   └── super-admin/
│       └── SuperAdminDashboard.jsx      (~2 100 lignes)
└── services/
    └── api.js
```

`assets/`, `context/` et `utils/` sont vides — aucune logique n'y a jamais été placée.

### `server/src/`

```
server/src/
├── routes/
│   ├── index.js
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── superAdmin.routes.js
│   ├── direction.routes.js
│   ├── locataire.routes.js
│   ├── tickets.routes.js
│   ├── interventions.routes.js
│   ├── photos.routes.js
│   └── health.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── admin.controller.js
│   ├── superAdmin.controller.js
│   ├── direction.controller.js
│   ├── locataire.controller.js
│   ├── maintenance.controller.js
│   ├── photos.controller.js
│   └── utilisateurs.controller.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── requireRole.js
│   ├── logActivite.js
│   ├── errorHandler.js
│   ├── upload.js
│   └── uploadDocument.js
├── services/
│   └── notification.service.js
├── config/
│   └── cloudinary.js
└── utils/
    └── prisma.js
```

### `server/prisma/schema.prisma`

11 modèles, 15 enums (résumé complet en section 4).

---

## 2. Rôles et dashboards

| Rôle | Dashboard existant | Route App.jsx | Redirection LoginPage.jsx | Avancement | Ce qui manque |
|---|---|---|---|---|---|
| **SUPER_ADMIN** | ✅ `pages/super-admin/SuperAdminDashboard.jsx` | ✅ `/super-admin/dashboard` | ✅ correcte | **~95 %** | Rien de bloquant |
| **ADMIN** | ✅ `pages/admin/AdminDashboard.jsx` + `GestionUtilisateurs.jsx` | ✅ les deux | ✅ correcte | **~80 %** | Pages Logements / Demandes / Mutations / Maintenance / Rapports référencées dans la sidebar et les boutons "voir tout" mais **aucune route/page créée** |
| **DIRECTION** | ✅ `pages/direction/DirectionDashboard.jsx` | ✅ `/direction/dashboard` | ✅ correcte | **~70 %** | Sidebar référence 6 sous-pages (`/direction/demandes`, `/nouvelles`, `/en-cours`, `/traitees`, `/rejetees`, `/mutations`, `/rapports`, `/journal`) — **aucune n'existe** |
| **LOCATAIRE** | ✅ `pages/locataire/LocataireDashboard.jsx` | ✅ `/locataire/dashboard` | ✅ correcte | **~95 %** | Pas de vraie passerelle de paiement en ligne ; édition du profil limitée au mot de passe |
| **RESPONSABLE** | ❌ Aucun dashboard dédié (utilise `pages/Dashboard.jsx`, un placeholder générique) | ⚠️ `/dashboard` existe mais génère un placeholder, PAS `/responsable/dashboard` | 🔴 **redirige vers `/responsable/dashboard` qui n'existe dans aucune route** → page blanche | **~5 %** | Tout le dashboard RESPONSABLE reste à construire |
| **TECHNICIEN** | ❌ Aucun dashboard dédié (idem RESPONSABLE) | ⚠️ idem | 🔴 **redirige vers `/technicien/dashboard` qui n'existe dans aucune route** → page blanche | **~5 %** | Le backend est prêt (voir §5, routes tickets/interventions), il ne manque que le frontend |

> ⚠️ Il n'existe aucune route `*` (catch-all/404) dans `App.jsx`. Toute URL non déclarée (y compris `/responsable/dashboard` et `/technicien/dashboard`) affiche une page blanche silencieuse plutôt qu'un message d'erreur.

---

## 3. Pages et composants frontend

### Pages (`client/src/pages/`)

| Fichier | Rôle(s) | Sections principales | Données | État |
|---|---|---|---|---|
| `LandingPage.jsx` | Public | Branding, bouton "Commencer" | Statique (normal, page vitrine) | ✅ Complet |
| `LoginPage.jsx` | Public | Formulaire connexion, animation succès, redirection par rôle | Réelles (`POST /api/auth/login`) | ✅ Complet |
| `RegisterPage.jsx` | Public (LOCATAIRE) | Formulaire inscription, champ conditionnel matricule si FONCTIONNAIRE | Réelles (`POST /api/auth/register`) | ✅ Complet |
| `Dashboard.jsx` | LOCATAIRE¹, RESPONSABLE, TECHNICIEN | 4 cartes stats | ❌ **Codées en dur** (`value: '0'` fixe), seul `/health` est réellement appelé | ⚠️ Placeholder/squelette |
| `admin/AdminDashboard.jsx` | ADMIN, SUPER_ADMIN | KPI, graphique 6 mois, actions requises, équipe, occupation du parc, demandes/tickets récents | Réelles (6 appels API en parallèle) | ✅ Complet (mais liens morts, voir §2) |
| `admin/GestionUtilisateurs.jsx` | ADMIN, SUPER_ADMIN | CRUD utilisateurs, recherche/filtres, protection des comptes SUPER_ADMIN | Réelles (`/admin/utilisateurs`) | ✅ Complet |
| `direction/DirectionDashboard.jsx` | DIRECTION, SUPER_ADMIN | KPI, pipeline Kanban, demandes urgentes, répartition par type, activités récentes, délai moyen | Réelles (3 appels API) | ✅ Complet (mais liens morts, voir §2) |
| `locataire/LocataireDashboard.jsx` | LOCATAIRE | Accueil, Mon logement, Mes demandes, Mes interventions, Mes paiements, Mes documents, Profil, Notifications, Paramètres, Aide | Réelles (8 appels API + 6 modals d'action) | ✅ Complet |
| `super-admin/SuperAdminDashboard.jsx` | SUPER_ADMIN | Vue d'ensemble, Utilisateurs, Logs d'activité, Santé système, Actions rapides | Réelles (7 endpoints `/super-admin/*`) | ✅ Complet |

¹ `LOCATAIRE` reste listé dans `allowedRoles` de la route `/dashboard` mais n'y accède plus jamais en pratique puisque `LoginPage.jsx` le redirige vers `/locataire/dashboard` — reliquat inoffensif à nettoyer.

### Composants (`client/src/components/`)

| Fichier | Rôle |
|---|---|
| `ProtectedRoute.jsx` | Garde d'accès par rôle. Vérifie token + user en localStorage, laisse passer SUPER_ADMIN partout, sinon vérifie `allowedRoles`. Gère le JSON invalide. |
| `SkeletonCard.jsx` | Placeholder de chargement générique |
| `admin/AdminSidebar.jsx` | Sidebar partagée Admin (utilisée par `AdminDashboard` et `GestionUtilisateurs`), avec cache mémoire des stats (TTL 20 s), badges dynamiques, drawer mobile |

### Hooks (`client/src/hooks/`)

- `useApi.js` — hook générique de fetch GET avec cache et `AbortController`. **Écrit mais non utilisé** ailleurs dans le code (le projet préfère `api.get()` + `useState`/`useEffect` directement dans chaque page).

### Services (`client/src/services/`)

- `api.js` — instance axios unique, injection automatique du JWT, gestion 401 (déconnexion) vs 403 (laisse remonter au composant).

### Layouts (`client/src/layouts/`)

- `MainLayout.jsx` — layout minimal (header + Outlet) utilisé uniquement par la route legacy `/dashboard`.

---

## 4. Base de données

**11 modèles, 15 enums, 5 migrations appliquées.**

### Modèles et relations

| Modèle | Champs principaux | Relations clés |
|---|---|---|
| `Utilisateur` | nom, prenom, email (unique), motDePasse, telephone?, role, typeLocataire?, numeroMatricule?, actif | Point central : relié à quasi tous les autres modèles |
| `Logement` | code (unique), adresse, ville, quartier?, type, superficie?, nombrePieces?, etage, statut, description? | demandes, tickets, occupations, mutations, paiements |
| `DemandeLogement` | demandeurId, logementId?, motif, statut, priorite, dateDepot, valideParDirectionId?, dateValidationDirection?, commentaireDirection? | → Utilisateur (Cascade), → Logement (SetNull) |
| `Mutation` | demandeurId, logementActuelId, logementSouhaiteId?, motif, statut, mêmes champs de validation Direction | → Utilisateur (Cascade), → Logement actuel (Cascade) / souhaité (SetNull) |
| `TicketMaintenance` | demandeurId, logementId, titre, description, priorite, statut, dateConstatPrevue?, dateConstat?, commentaireConstat?, modeReparation?, conformeApresVerif? | → Utilisateur (Cascade), → Logement (Cascade), 1-1 avec Intervention |
| `Intervention` | ticketId (unique), technicienId, assignePar?, statut, rapport?, dateAssignation, dateDebut?, dateFin? | → TicketMaintenance (Cascade), → Utilisateur technicien (Cascade) |
| `Occupation` | utilisateurId, logementId, dateEntree, dateSortie?, statut, actif | → Utilisateur (Cascade), → Logement (Cascade) |
| `Notification` | utilisateurId, message, type, lu, lien? | → Utilisateur (**Cascade** — supprimée avec le compte) |
| `PhotoIntervention` | ticketId, uploadedById, typePhoto, urlPhoto, publicIdCloudinary? | → TicketMaintenance (Cascade) |
| `Paiement` | locataireId, logementId, montant, modePaiement, statut, periodeMois, periodeAnnee, dateEcheance, datePaiement? | → Utilisateur (**RESTRICT** — bloque la suppression du compte) |
| `LogActivite` | utilisateurId **(nullable)**, typeAction, module, description, entiteId?, entiteType?, adresseIp? | → Utilisateur (**SetNull** — l'historique survit à la suppression du compte) |
| `Document` | utilisateurId, titre, typeDocument, urlFichier, publicIdCloudinary? | → Utilisateur (Cascade) |

### Enums (valeurs complètes)

- **Role** : SUPER_ADMIN, ADMIN, DIRECTION, LOCATAIRE, RESPONSABLE, TECHNICIEN
- **TypeLocataire** : PRIVE, FONCTIONNAIRE
- **TypeLogement** : F1, F2, F3, F4, F5, VILLA
- **StatutLogement** : DISPONIBLE, OCCUPE, MAINTENANCE
- **StatutDemande** : SOUMISE, EN_VALIDATION_DIRECTION, VALIDEE_DIRECTION, REJETEE_DIRECTION, EN_ETUDE_LOGEMENT, APPROUVEE, REJETEE
- **Priorite** : BASSE, NORMALE, HAUTE, URGENTE
- **StatutTicket** : SOUMIS, CONSTAT_PROGRAMME, CONSTAT_EFFECTUE, PRISE_EN_CHARGE_LOCATAIRE, PRISE_EN_CHARGE_SONAPIE, EN_ATTENTE_CONFIRMATION_LOCATAIRE, ASSIGNE_TECHNICIEN, EN_COURS, VERIFICATION_SONAPIE, CLOTURE, REOUVERT
- **StatutIntervention** : ASSIGNEE, EN_COURS, TERMINEE
- **StatutOccupation** : ACTIVE, TERMINEE
- **TypeNotification** : INFO, SUCCESS, WARNING, ERROR
- **TypePhoto** : SIGNALEMENT, CONSTAT, AVANT_REPARATION, APRES_REPARATION
- **TypeDocument** : PIECE_IDENTITE, JUSTIFICATIF_DOMICILE, BAIL, QUITTANCE, AUTRE
- **ModePaiement** : ESPECES, MOBILE_MONEY, CHEQUE, PRELEVEMENT_SALAIRE
- **StatutPaiement** : EN_ATTENTE, PAYE, EN_RETARD, ANNULE
- **TypeAction** : CREATION, MODIFICATION, SUPPRESSION, VALIDATION, REJET, CONNEXION, DESACTIVATION, REACTIVATION, RESET_MOT_DE_PASSE

### Migrations (5, dans l'ordre)

1. `0_baseline`
2. `20260701135942_add_super_admin_et_logs_activite`
3. `20260702162709_add_date_constat_prevue`
4. `20260703112251_add_document_model`
5. `20260703130351_log_activite_utilisateur_optional`

> Toutes les tables tournent désormais sur **InnoDB** avec 26 contraintes de clé étrangère réellement actives (converti depuis MyISAM le 3 juillet 2026).

---

## 5. Routes API backend

### `auth.routes.js`

| Méthode | Chemin | Rôles | Controller | État |
|---|---|---|---|---|
| POST | `/api/auth/register` | Public | `auth.register` | ✅ Fonctionnel |
| POST | `/api/auth/login` | Public | `auth.login` | ✅ Fonctionnel |

### `admin.routes.js`

| Méthode | Chemin | Rôles | Controller | logAction | État |
|---|---|---|---|---|---|
| GET | `/api/admin/stats` | SUPER_ADMIN, ADMIN | `admin.getDashboardStats` | — | ✅ |
| GET | `/api/admin/stats/demandes-mensuelles` | SUPER_ADMIN, ADMIN | `admin.getDemandesMensuelles` | — | ✅ |
| GET | `/api/admin/demandes` | SUPER_ADMIN, ADMIN | `admin.getDemandesAdmin` | — | ✅ |
| GET | `/api/admin/utilisateurs` | SUPER_ADMIN, ADMIN | `utilisateurs.getUtilisateurs` | — | ✅ (filtre SUPER_ADMIN si appelant = ADMIN) |
| POST | `/api/admin/utilisateurs` | SUPER_ADMIN, ADMIN | `utilisateurs.createUtilisateur` | CREATION | ✅ |
| PUT | `/api/admin/utilisateurs/:id` | SUPER_ADMIN, ADMIN | `utilisateurs.updateUtilisateur` | — | ✅ |
| PATCH | `/api/admin/utilisateurs/:id/toggle` | SUPER_ADMIN, ADMIN | `utilisateurs.toggleUtilisateur` | MODIFICATION | ✅ |
| DELETE | `/api/admin/utilisateurs/:id` | **SUPER_ADMIN uniquement** | `utilisateurs.deleteUtilisateur` | SUPPRESSION | ✅ (renvoie 409 propre si contrainte FK, ex : paiements liés) |

### `superAdmin.routes.js` (toutes les routes : SUPER_ADMIN uniquement)

| Méthode | Chemin | Controller | État |
|---|---|---|---|
| GET | `/api/super-admin/health` | `superAdmin.getHealthCheck` | ✅ |
| GET | `/api/super-admin/logs` | `superAdmin.getLogs` | ✅ (paginé, filtrable) |
| GET | `/api/super-admin/utilisateurs` | `superAdmin.getAllUtilisateurs` | ✅ |
| GET | `/api/super-admin/utilisateurs/:id` | `superAdmin.getUtilisateurDetail` | ✅ |
| POST | `/api/super-admin/utilisateurs/:id/reset-password` | `superAdmin.resetMotDePasse` | ✅ |
| PUT | `/api/super-admin/tickets/:id/forcer-statut` | `superAdmin.forcerStatutTicket` | ✅ |
| PUT | `/api/super-admin/demandes/:id/forcer-statut` | `superAdmin.forcerStatutDemande` | ✅ |

### `direction.routes.js` (toutes les routes : DIRECTION, SUPER_ADMIN)

| Méthode | Chemin | Controller | État |
|---|---|---|---|
| GET | `/api/direction/stats` | `direction.getStatistiquesDirection` | ✅ |
| GET | `/api/direction/demandes` | `direction.getDemandesDirection` | ✅ (filtrable par statut) |
| GET | `/api/direction/mutations` | `direction.getMutationsEnAttente` | ✅ |
| PUT | `/api/direction/demandes/:id/valider` | `direction.validerDemande` | ✅ |
| PUT | `/api/direction/demandes/:id/rejeter` | `direction.rejeterDemande` | ✅ |
| PUT | `/api/direction/mutations/:id/valider` | `direction.validerMutation` | ✅ |
| PUT | `/api/direction/mutations/:id/rejeter` | `direction.rejeterMutation` | ✅ |

### `locataire.routes.js` (toutes les routes : LOCATAIRE uniquement)

| Méthode | Chemin | Controller | logAction | État |
|---|---|---|---|---|
| POST | `/api/locataire/demandes` | `locataire.creerDemandeLogement` | CREATION | ✅ |
| GET | `/api/locataire/demandes` | `locataire.getMesDemandes` | — | ✅ |
| POST | `/api/locataire/mutations` | `locataire.creerDemandeMutation` | CREATION | ✅ |
| GET | `/api/locataire/mutations` | `locataire.getMesMutations` | — | ✅ |
| GET | `/api/locataire/mon-logement` | `locataire.getMonLogement` | — | ✅ |
| GET | `/api/locataire/paiements` | `locataire.getMesPaiements` | — | ✅ (lecture seule, pas de création) |
| GET | `/api/locataire/notifications` | `locataire.getMesNotifications` | — | ✅ |
| PATCH | `/api/locataire/notifications/:id/lue` | `locataire.marquerNotificationLue` | — | ✅ |
| PATCH | `/api/locataire/notifications/tout-lu` | `locataire.marquerToutesNotificationsLues` | — | ✅ |
| GET | `/api/locataire/stats` | `locataire.getMesStats` | — | ✅ |
| POST | `/api/locataire/documents` | `locataire.creerDocument` | CREATION | ✅ (upload Cloudinary PDF/image) |
| GET | `/api/locataire/documents` | `locataire.getMesDocuments` | — | ✅ |
| DELETE | `/api/locataire/documents/:id` | `locataire.supprimerDocument` | — | ✅ |
| PUT | `/api/locataire/mot-de-passe` | `locataire.changerMotDePasse` | — | ✅ |

### `tickets.routes.js` (auth requis, rôles variables par action)

| Méthode | Chemin | Rôles | Controller | État |
|---|---|---|---|---|
| GET | `/api/tickets` | Tous (filtré par rôle) | `maintenance.getTicketsByRole` | ✅ |
| GET | `/api/tickets/:id` | Tous (contrôle d'accès) | `maintenance.getTicketDetail` | ✅ |
| POST | `/api/tickets` | LOCATAIRE | `maintenance.creerTicket` | ✅ |
| PUT | `/api/tickets/:id/programmer-constat` | RESPONSABLE, ADMIN, SUPER_ADMIN | `maintenance.programmerConstat` | ✅ |
| PUT | `/api/tickets/:id/effectuer-constat` | TECHNICIEN, RESPONSABLE, ADMIN, SUPER_ADMIN | `maintenance.effectuerConstat` | ✅ |
| PUT | `/api/tickets/:id/choix-reparation` | LOCATAIRE | `maintenance.choisirModeReparation` | ✅ |
| PUT | `/api/tickets/:id/assigner-technicien` | RESPONSABLE, ADMIN, SUPER_ADMIN | `maintenance.assignerTechnicien` | ✅ |
| PUT | `/api/tickets/:id/confirmer-reparation` | LOCATAIRE | `maintenance.confirmerReparationLocataire` | ✅ |
| PUT | `/api/tickets/:id/verifier` | RESPONSABLE, ADMIN, SUPER_ADMIN | `maintenance.verifierEtCloturer` | ✅ |

### `interventions.routes.js` (auth requis)

| Méthode | Chemin | Rôles | Controller | État |
|---|---|---|---|---|
| PUT | `/api/interventions/:id/demarrer` | TECHNICIEN | `maintenance.demarrerIntervention` | ✅ **backend prêt, aucune UI TECHNICIEN pour l'utiliser** |
| PUT | `/api/interventions/:id/cloturer` | TECHNICIEN | `maintenance.cloturerParTechnicien` | ✅ **idem** |

### `photos.routes.js` (auth requis)

| Méthode | Chemin | Controller | État |
|---|---|---|---|
| POST | `/api/tickets/:ticketId/photos` | `photos.uploaderPhoto` | ✅ |
| GET | `/api/tickets/:ticketId/photos` | `photos.getPhotosByTicket` | ✅ |
| DELETE | `/api/photos/:id` | `photos.supprimerPhoto` | ✅ |

### `health.routes.js`

| Méthode | Chemin | État |
|---|---|---|
| GET | `/api/health` | ✅ Ping simple |

---

## 6. Services et middlewares

| Fichier | Rôle |
|---|---|
| `middlewares/auth.middleware.js` | `requireAuth` — vérifie le JWT (Bearer), peuple `req.user` (id, email, role) |
| `middlewares/requireRole.js` | `requireRole(...roles)` — 403 si le rôle de `req.user` n'est pas dans la liste |
| `middlewares/logActivite.js` | `logAction(typeAction, module, getDescription)` — journalise en base après une réponse 2xx, sans jamais bloquer la requête |
| `middlewares/errorHandler.js` | Handler d'erreur global Express, formate `{ message }` avec le bon status |
| `middlewares/upload.js` | Multer + CloudinaryStorage pour photos de tickets (jpg/png/webp, 5 Mo max) |
| `middlewares/uploadDocument.js` | Multer + CloudinaryStorage pour documents (jpg/png/webp/**pdf**, 10 Mo max) |
| `services/notification.service.js` | `creerNotification`, `notifierRole`, `notifierRoles` — création de notifications individuelles ou en masse par rôle |
| `utils/prisma.js` | Singleton `PrismaClient` partagé par tout le backend |

---

## 7. Intégrations externes

| Intégration | Statut |
|---|---|
| **Cloudinary** | ✅ Configuré et **testé fonctionnellement** (upload photos tickets + documents PDF/image, suppression au delete). Contournement `NODE_TLS_REJECT_UNAUTHORIZED=0` actif uniquement hors production (contexte : interception TLS locale par l'antivirus Avast). |
| **Email / SMTP** | ❌ Aucune trace — pas de nodemailer, pas de service d'envoi d'email. Les notifications sont uniquement en base (cloche in-app), aucun email n'est jamais envoyé. |
| **Paiement en ligne** | ❌ Non intégré. Le modèle `Paiement` existe (montant, mode, statut, référence) et permet la **consultation** côté locataire, mais il n'existe aucune route de création/mise à jour de paiement ni de connexion à un gateway (Payfonte, CinetPay, Stripe...). Les paiements semblent pensés pour être enregistrés manuellement par un agent (route non encore créée non plus côté admin). |
| **Autres** | Aucune autre intégration externe détectée. |

---

## 8. Sécurité

| Point | État |
|---|---|
| JWT | ✅ Signé avec `JWT_SECRET`, payload `{ id, email, role }`, expiration `JWT_EXPIRES_IN=7d` (7 jours) |
| Protection des routes backend | ✅ Toutes les routes métier passent par `requireAuth` + `requireRole` adapté. Aucune route sensible trouvée sans protection. |
| `ProtectedRoute.jsx` (React) | ✅ Vérifie token + user, gère le JSON invalide, redirige vers `/login` si non autorisé |
| SUPER_ADMIN protégé des ADMIN | ✅ Oui, à plusieurs niveaux : <br>• `utilisateurs.controller.js` filtre les comptes SUPER_ADMIN des listes vues par un ADMIN et bloque leur modification/désactivation par un ADMIN <br>• Bouton Supprimer masqué côté frontend sauf pour SUPER_ADMIN <br>• `AdminDashboard.jsx` filtre une deuxième fois côté client (défense en profondeur) |
| Suppression de compte vs données liées | ✅ Corrigé récemment : `Paiement`/`PhotoIntervention` bloquent la suppression (RESTRICT, avec message 409 clair), `Notification` supprime en cascade, `LogActivite` passe à NULL (SetNull) plutôt que planter |
| CORS | ⚠️ **Permissif** : `origin: (origin, callback) => callback(null, true)` avec `credentials: true` — accepte **toute origine**. Adapté au développement (accès depuis un téléphone sur le même WiFi), **à restreindre avant mise en production**. |
| Route catch-all / 404 | ❌ Absente — une URL non déclarée affiche une page blanche silencieuse |
| Secrets | `.env` non commité (à vérifier dans `.gitignore`), secrets en clair dans le fichier local — normal en dev, à migrer vers un gestionnaire de secrets en production |

---

## 9. Responsive / Mobile

| Dashboard | Responsive | Menu mobile | Notes |
|---|---|---|---|
| SuperAdminDashboard | ✅ Oui | Drawer (tiroir) avec overlay + bottom nav | Testé et validé sur plusieurs sessions (a11y : focus trap, Échap, verrouillage scroll) |
| AdminDashboard / GestionUtilisateurs | ✅ Oui | Drawer via `AdminSidebar` partagé | Bug `relative`/`fixed` Tailwind rencontré et corrigé précédemment |
| DirectionDashboard | ✅ Oui | Drawer avec overlay | — |
| LocataireDashboard | ✅ Oui | Drawer + sidebar **repliable** sur desktop (nouveauté) | Le plus abouti : testé sur viewport mobile réel, images d'illustration adaptées (pleine largeur sur mobile) |
| Dashboard legacy (RESPONSABLE/TECHNICIEN) | ⚠️ Non vérifié | Aucun (page statique) | Sans objet vu l'état du contenu |

**Problèmes connus :** aucun bug responsive ouvert actuellement sur les 4 dashboards principaux ; les bugs Tailwind (`w-auto`/`w-full`, `relative`/`fixed`, `min-w-0`) rencontrés en cours de développement ont tous été corrigés.

---

## 10. Ce qui manque / prochaines étapes

### 🔴 Bloquant (page blanche / lien mort réel)
- [ ] Créer un dashboard TECHNICIEN et sa route `/technicien/dashboard` (le backend `interventions.routes.js` + `tickets.routes.js` est déjà prêt : démarrer/clôturer intervention, effectuer constat)
- [ ] Créer un dashboard RESPONSABLE et sa route `/responsable/dashboard` (backend prêt : programmer constat, assigner technicien, vérifier/clôturer)
- [ ] Ajouter une route catch-all (`path="*"`) avec une page 404 propre

### 🟠 Liens morts à corriger (page existe mais sous-pages non routées)
- [ ] `AdminDashboard.jsx` : créer `/admin/demandes` et `/admin/maintenance`, ou retirer les boutons qui y mènent
- [ ] `DirectionDashboard.jsx` : créer les 6 routes de sa sidebar (`/direction/demandes`, `/nouvelles`, `/en-cours`, `/traitees`, `/rejetees`, `/mutations`, `/rapports`, `/journal`) ou consolider en une seule page avec des filtres (probablement la meilleure option, le pipeline Kanban existant couvre déjà une bonne partie de ce besoin)

### 🟡 Fonctionnalités prévues mais non codées
- [ ] Intégration réelle d'un moyen de paiement en ligne (le modèle de données existe déjà)
- [ ] Envoi d'email (confirmation de compte, mot de passe oublié — le lien "Mot de passe oublié ?" de `LoginPage.jsx` n'est pas implémenté)
- [ ] Route admin pour enregistrer manuellement un paiement (actuellement aucune route POST/PUT sur `Paiement`)
- [ ] Édition du profil locataire au-delà du mot de passe (nom, téléphone)

### 🟢 Nettoyage mineur
- [ ] Retirer `LOCATAIRE` de `allowedRoles` sur la route legacy `/dashboard` (devenu inutile depuis la création de `/locataire/dashboard`)
- [ ] Restreindre le CORS avant toute mise en production
- [ ] Décider du sort du hook `useApi.js` (non utilisé actuellement)

### Avant la soutenance — priorités suggérées
1. Corriger les 2 redirections cassées (RESPONSABLE/TECHNICIEN) — c'est le seul point qui peut faire "planter" une démo en direct
2. Nettoyer ou masquer les liens morts des sidebars Admin/Direction
3. Préparer un jeu de données de démonstration réaliste (logements, paiements, tickets à différents stades) pour montrer chaque dashboard dans un état riche
