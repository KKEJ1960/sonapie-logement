# RAPPORT D'ANALYSE — Projet SONAPIE
> Généré le 30 juin 2026 · Analyse read-only · Aucun fichier modifié

---

## 1. STRUCTURE GÉNÉRALE DU PROJET

### Arborescence complète

```
LogementSONAPIE/
│
├── client/
│   ├── index.html                          # Titre FR, preload logo, polices Syne + Inter
│   ├── package.json
│   ├── vite.config.js                      # Proxy /api → localhost:5000, code splitting
│   ├── tailwind.config.js                  # Couleurs brand : green #147d64, ink #17202a, gold #d8a31a
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                         # Routing React Router 7
│       ├── services/
│       │   └── api.js                      # Instance Axios + intercepteur JWT
│       ├── hooks/
│       │   └── useApi.js                   # Hook générique fetch + cache + AbortController
│       ├── components/
│       │   └── SkeletonCard.jsx            # Skeleton loader générique
│       ├── layouts/
│       │   ├── MainLayout.jsx              # Layout legacy (header simple, Outlet)
│       │   └── AdminLayout.jsx             # Sidebar fixe + mobile drawer + bottom nav
│       └── pages/
│           ├── LandingPage.jsx             # Page d'accueil publique
│           ├── LoginPage.jsx               # Connexion avec redirection par rôle
│           ├── RegisterPage.jsx            # PLACEHOLDER — page vide
│           ├── Dashboard.jsx               # Dashboard legacy (Tailwind, non-admin)
│           └── admin/
│               ├── AdminDashboard.jsx      # Dashboard ADMIN — connecté API réelle
│               └── GestionUtilisateurs.jsx # Gestion comptes — données mock (localStorage)
│
├── server/
│   ├── server.js                           # Point d'entrée Express
│   ├── package.json
│   └── src/
│       ├── routes/
│       │   ├── index.js                    # Agrégateur de routes
│       │   ├── auth.routes.js              # /api/auth/*
│       │   ├── admin.routes.js             # /api/admin/*
│       │   └── health.routes.js            # /api/health
│       ├── controllers/
│       │   ├── auth.controller.js          # register + login
│       │   └── admin.controller.js         # getDashboardStats
│       ├── middlewares/
│       │   ├── auth.middleware.js          # Vérification JWT (requireAuth)
│       │   └── errorHandler.js             # Gestionnaire d'erreurs centralisé
│       └── utils/
│           └── prisma.js                   # Singleton PrismaClient (export nommé)
│
└── prisma/
    └── schema.prisma                       # Schéma MySQL — 8 modèles, 9 enums
```

---

## 2. RÔLES UTILISATEURS ACTUELS

### Enum `Role` (schema.prisma)

| Rôle | Défini dans | Dashboard dédié | Pages accessibles |
|---|---|---|---|
| `ADMIN` | schema.prisma, LoginPage, GestionUtilisateurs | `/admin/dashboard` | `/admin/*` (dashboard, utilisateurs) |
| `AGENT` | schema.prisma, LoginPage | `/dashboard` (legacy) | `/dashboard` uniquement |
| `RESPONSABLE` | schema.prisma, LoginPage, GestionUtilisateurs | `/dashboard` (legacy) | `/dashboard` uniquement |
| `TECHNICIEN` | schema.prisma, LoginPage, GestionUtilisateurs | `/dashboard` (legacy) | `/dashboard` uniquement |

### Vérification des rôles

**Backend** — Le middleware `requireAuth` vérifie uniquement la validité du JWT. **Il ne vérifie pas le rôle.** La route `/api/admin/stats` est protégée par auth mais accessible à tout utilisateur connecté quel que soit son rôle.

**Frontend** — La vérification du rôle est faite côté client uniquement, via `localStorage.getItem('user')` dans un `useEffect`. Cette approche est faible en sécurité : un utilisateur non-ADMIN peut accéder aux pages admin s'il forge son objet user dans le localStorage.

```js
// Exemple dans AdminDashboard.jsx — vérification purement client
useEffect(() => {
  const u = JSON.parse(localStorage.getItem('user') || '{}')
  if (!u || u.role !== 'ADMIN') navigate('/login')
}, [])
```

**Routage (LoginPage.jsx)** — Redirection post-login par rôle :
```
ADMIN       → /admin/dashboard
AGENT       → /dashboard
RESPONSABLE → /dashboard
TECHNICIEN  → /dashboard
```

---

## 3. PAGES ET COMPOSANTS FRONTEND EXISTANTS

| Fichier | Rôle cible | Données | État |
|---|---|---|---|
| `LandingPage.jsx` | Public | Aucune | ✅ Fonctionnelle (UI only) |
| `LoginPage.jsx` | Public | API réelle (`POST /api/auth/login`) | ✅ Fonctionnelle et connectée |
| `RegisterPage.jsx` | Public | — | ❌ Placeholder vide |
| `Dashboard.jsx` | AGENT / RESPONSABLE / TECHNICIEN | API `/api/health` uniquement | ⚠️ Structure seule — pas de données métier |
| `admin/AdminDashboard.jsx` | ADMIN | API réelle (`GET /api/admin/stats`) | ✅ Fonctionnelle et connectée |
| `admin/GestionUtilisateurs.jsx` | ADMIN | **Mock (état local React)** — pas d'API | ⚠️ UI complète mais non connectée |

### Composants

| Composant | Usage |
|---|---|
| `AdminLayout.jsx` | Sidebar admin (nav, user card, logout) — responsive desktop + mobile |
| `MainLayout.jsx` | Layout simple legacy — header + Outlet |
| `SkeletonCard.jsx` | Skeleton loader générique — utilisé dans Dashboard legacy |
| `useApi.js` | Hook fetch/cache générique — utilisé dans Dashboard legacy |
| `api.js` | Instance Axios centralisée avec intercepteur JWT |

---

## 4. BASE DE DONNÉES — SCHÉMA ACTUEL

### Modèles et colonnes

#### `Utilisateur`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | Auto-increment |
| nom | String | — |
| prenom | String | — |
| email | String | Unique |
| motDePasse | String | Hashé bcryptjs |
| telephone | String? | Optionnel |
| role | Role (enum) | ADMIN / AGENT / RESPONSABLE / TECHNICIEN |
| actif | Boolean | Default true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### `Logement`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| code | String | Unique |
| adresse | String Text | — |
| ville | String | — |
| quartier | String? | Optionnel |
| type | TypeLogement (enum) | F1/F2/F3/F4/F5/VILLA |
| superficie | Float? | — |
| nombrePieces | Int? | — |
| etage | Int | Default 0 |
| statut | StatutLogement | DISPONIBLE / OCCUPE / MAINTENANCE |
| description | String? Text | — |

#### `DemandeLogement`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| demandeurId | Int FK | → Utilisateur |
| logementId | Int? FK | → Logement (optionnel) |
| traitePar | Int? FK | → Utilisateur responsable |
| motif | String Text | — |
| statut | StatutDemande | SOUMISE / EN_ETUDE / APPROUVEE / REJETEE |
| priorite | Priorite | BASSE / NORMALE / HAUTE / URGENTE |
| commentaire | String? Text | — |
| dateDepot | DateTime | Auto |
| dateTraitement | DateTime? | — |

#### `TicketMaintenance`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| demandeurId | Int FK | → Utilisateur |
| logementId | Int FK | → Logement |
| titre | String | — |
| description | String Text | — |
| priorite | Priorite | BASSE / NORMALE / HAUTE / URGENTE |
| statut | StatutTicket | SOUMIS / ASSIGNE / EN_COURS / CLOTURE |
| dateDepot | DateTime | Auto |
| dateCloture | DateTime? | — |

#### `Intervention`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| ticketId | Int FK Unique | → TicketMaintenance (1-1) |
| technicienId | Int FK | → Utilisateur |
| assignePar | Int? FK | → Utilisateur |
| description | String? Text | — |
| statut | StatutIntervention | ASSIGNEE / EN_COURS / TERMINEE |
| rapport | String? Text | — |
| dateAssignation | DateTime | Auto |
| dateDebut | DateTime? | — |
| dateFin | DateTime? | — |

#### `Occupation`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| utilisateurId | Int FK | → Utilisateur |
| logementId | Int FK | → Logement |
| dateEntree | DateTime | — |
| dateSortie | DateTime? | — |
| statut | StatutOccupation | ACTIVE / TERMINEE |
| actif | Boolean | Default true |
| createdAt | DateTime | Auto |

#### `Mutation`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| demandeurId | Int FK | → Utilisateur |
| logementActuelId | Int FK | → Logement |
| logementSouhaiteId | Int? FK | → Logement |
| traitePar | Int? FK | → Utilisateur |
| motif | String Text | — |
| statut | StatutDemande | Réutilise enum StatutDemande |
| commentaire | String? Text | — |
| dateDepot / dateTraitement | DateTime | — |

#### `Notification`
| Colonne | Type | Notes |
|---|---|---|
| id | Int PK | — |
| utilisateurId | Int FK | → Utilisateur |
| message | String Text | — |
| type | TypeNotification | INFO / SUCCESS / WARNING / ERROR |
| lu | Boolean | Default false |
| lien | String? | URL optionnel |
| createdAt | DateTime | Auto |

### ENUMs

| Enum | Valeurs |
|---|---|
| `Role` | ADMIN, AGENT, RESPONSABLE, TECHNICIEN |
| `TypeLogement` | F1, F2, F3, F4, F5, VILLA |
| `StatutLogement` | DISPONIBLE, OCCUPE, MAINTENANCE |
| `StatutDemande` | SOUMISE, EN_ETUDE, APPROUVEE, REJETEE |
| `Priorite` | BASSE, NORMALE, HAUTE, URGENTE |
| `StatutTicket` | SOUMIS, ASSIGNE, EN_COURS, CLOTURE |
| `StatutIntervention` | ASSIGNEE, EN_COURS, TERMINEE |
| `StatutOccupation` | ACTIVE, TERMINEE |
| `TypeNotification` | INFO, SUCCESS, WARNING, ERROR |

### Relations clés

```
Utilisateur ──< DemandeLogement (demandeurId)
Utilisateur ──< DemandeLogement (traitePar)
Utilisateur ──< TicketMaintenance
Utilisateur ──< Intervention (technicienId)
Utilisateur ──< Intervention (assignePar)
Utilisateur ──< Occupation
Utilisateur ──< Notification
Utilisateur ──< Mutation

Logement ──< DemandeLogement
Logement ──< TicketMaintenance
Logement ──< Occupation
Logement ──< Mutation (logementActuel)
Logement ──< Mutation (logementSouhaite)

TicketMaintenance ──1 Intervention (relation 1-1 unique)
```

---

## 5. ROUTES API BACKEND EXISTANTES

| Méthode | Route | Protégée | Fonctionnelle | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Non | ✅ Oui | Création de compte + JWT |
| `POST` | `/api/auth/login` | Non | ✅ Oui | Connexion + JWT (7 jours) |
| `GET` | `/api/health` | Non | ✅ Oui | Health check + timestamp |
| `GET` | `/api/admin/stats` | Oui (JWT uniquement) | ✅ Oui | Stats dashboard : totaux + historique 7 mois |

**Observations critiques :**
- Seulement **4 routes** existent — tout le reste du domaine métier (logements, demandes, tickets, interventions, mutations, occupations, notifications) **n'a aucune route**.
- La route `/api/admin/stats` est protégée par `requireAuth` mais **ne vérifie pas que le rôle est ADMIN**. Un TECHNICIEN connecté peut y accéder.
- Le contrôleur `register` ne prend pas de `role` en paramètre → tous les comptes créés via l'API ont le rôle par défaut du schéma. Le rôle n'est assigné que manuellement.

---

## 6. GESTION DES FICHIERS / UPLOADS

| Aspect | État |
|---|---|
| Upload de fichiers | ❌ Absent — aucun middleware multer ou équivalent |
| Intégration Cloudinary | ❌ Absent |
| Intégration AWS S3 | ❌ Absent |
| Stockage local (`/uploads`) | ❌ Absent |
| Champs `url` / `photo` dans le schéma | ❌ Absent sur tous les modèles |
| Dépendance `multer` dans package.json | ❌ Absent |

**Conclusion :** Il n'existe aucun système de gestion de fichiers dans le projet. Les photos liées aux tickets de maintenance (signalement, constat, réparation) ne peuvent pas être stockées.

---

## 7. AUTHENTIFICATION

### Fonctionnement actuel

| Aspect | Implémentation |
|---|---|
| Type de token | JWT signé avec `JWT_SECRET` (env) |
| Durée de vie | 7 jours (`JWT_EXPIRES_IN` ou hardcodé `7d`) |
| Stockage client | `localStorage` (`token` + objet `user`) |
| Refresh token | ❌ Absent — pas de mécanisme de renouvellement |
| Logout | Suppression manuelle du localStorage (`removeItem`) |

### Payload JWT

Le token contient (d'après `auth.controller.js`) :
```json
{
  "id": 1,
  "email": "...",
  "role": "ADMIN",
  "nom": "...",
  "prenom": "..."
}
```

### Intercepteur Axios (api.js)

Ajouté dans cette session — injecte automatiquement le token dans l'en-tête `Authorization: Bearer <token>` sur chaque requête.

### Sécurité — Points faibles identifiés

1. **Vérification de rôle absente côté backend** : `requireAuth` vérifie le JWT mais ne vérifie pas `req.user.role`. N'importe quel utilisateur connecté peut appeler `/api/admin/stats`.
2. **Vérification de rôle côté frontend uniquement** : Basée sur `localStorage`, manipulable par l'utilisateur.
3. **Pas de refresh token** : Après 7 jours, l'utilisateur est déconnecté sans préavis.
4. **Pas de liste noire de tokens** : Un token volé reste valide jusqu'à expiration.

---

## 8. CE QUI MANQUE PAR RAPPORT AUX NOUVEAUX BESOINS MÉTIER

### A) Distinction Locataire Privé / Locataire Fonctionnaire

| Vérification | Résultat |
|---|---|
| Champ `typeLocataire` dans `Utilisateur` | ❌ Absent |
| Champ `typeLocataire` dans `Occupation` | ❌ Absent |
| Enum `TypeLocataire` dans le schéma | ❌ Absent |
| Logique tarifaire différenciée | ❌ Absente |

**Ce qui manque :**
- Un champ `typeLocataire: TypeLocataire` (enum : `PRIVE` / `FONCTIONNAIRE`) sur le modèle `Utilisateur` ou `Occupation`
- Des règles métier différentes selon le type (calcul de loyer, priorité d'attribution, etc.)

---

### B) Rôle DIRECTION (validation intermédiaire des demandes)

| Vérification | Résultat |
|---|---|
| Rôle `DIRECTION` dans l'enum `Role` | ❌ Absent — seulement ADMIN, AGENT, RESPONSABLE, TECHNICIEN |
| Statut `EN_VALIDATION_DIRECTION` dans `StatutDemande` | ❌ Absent — workflow : SOUMISE → EN_ETUDE → APPROUVEE/REJETEE |
| Dashboard dédié DIRECTION | ❌ Absent |
| Route backend pour actions DIRECTION | ❌ Absente |

**Ce qui manque :**
- `DIRECTION` dans l'enum `Role`
- `EN_VALIDATION_DIRECTION` dans l'enum `StatutDemande`
- Un workflow de demande à **4 étapes** : SOUMISE → EN_ETUDE → EN_VALIDATION_DIRECTION → APPROUVEE/REJETEE
- Un tableau de bord et des routes dédiés au rôle DIRECTION

---

### C) Circuit de maintenance avec constat obligatoire

| Vérification | Résultat |
|---|---|
| Étape "constat" avant intervention | ❌ Absente — le ticket passe directement à l'intervention |
| Champ `typeReparation` (locataire vs SONAPIE) | ❌ Absent |
| Étape de vérification/clôture après réparation locataire | ❌ Absente |
| Statut `EN_ATTENTE_CONSTAT` dans `StatutTicket` | ❌ Absent |
| Rapport de constat distinct du rapport d'intervention | ❌ Absent |
| Table `Constat` dédiée | ❌ Absente |

**Workflow actuel (incomplet) :**
```
TicketMaintenance : SOUMIS → ASSIGNE → EN_COURS → CLOTURE
Intervention      : ASSIGNEE → EN_COURS → TERMINEE
```

**Workflow cible (manquant) :**
```
TicketMaintenance : SOUMIS → ASSIGNE → EN_ATTENTE_CONSTAT
                    → CONSTAT_REALISE
                    → [REPARATION_LOCATAIRE | REPARATION_SONAPIE]
                    → EN_COURS → EN_ATTENTE_VERIFICATION → CLOTURE
```

---

### D) Système de photos pour les tickets de maintenance

| Vérification | Résultat |
|---|---|
| Table `Photo` ou `PieceJointe` | ❌ Absente |
| Champ `photos` sur `TicketMaintenance` | ❌ Absent |
| Champ `photos` sur `Intervention` | ❌ Absent |
| Étape "photos au signalement" | ❌ Absente |
| Étape "photos au constat" | ❌ Absente |
| Étape "photos après réparation" | ❌ Absente |
| Backend upload (multer + stockage) | ❌ Absent |

**Ce qui manque :**
```prisma
model Photo {
  id          Int      @id @default(autoincrement())
  url         String
  etape       EtapePhoto  // SIGNALEMENT / CONSTAT / APRES_REPARATION
  ticketId    Int?
  ticket      TicketMaintenance? @relation(...)
  interventionId Int?
  intervention   Intervention?  @relation(...)
  uploadedAt  DateTime @default(now())
}
```
+ Backend multer + Cloudinary/stockage local

---

### E) Module de paiement

| Vérification | Résultat |
|---|---|
| Table `Paiement` ou `Loyer` | ❌ Absente |
| Enum `ModePaiement` | ❌ Absent |
| Logique de calcul de loyer | ❌ Absente |
| Historique des paiements | ❌ Absent |
| Distinction espèces / mobile money / chèque / prélèvement | ❌ Absente |
| Intégration passerelle de paiement | ❌ Absente |
| Génération de quittance | ❌ Absente |

**Ce qui manque :**
```prisma
enum ModePaiement {
  ESPECES
  MOBILE_MONEY
  CHEQUE
  PRELEVEMENT_AUTOMATIQUE
}

model Paiement {
  id            Int          @id @default(autoincrement())
  occupationId  Int
  occupation    Occupation   @relation(...)
  montant       Float
  modePaiement  ModePaiement
  moisConcerne  DateTime
  datePaiement  DateTime?
  reference     String?
  statut        StatutPaiement
  createdAt     DateTime     @default(now())
}
```

---

## 9. RECOMMANDATIONS — ÉCARTS PRIORITAIRES À COMBLER

### PRIORITÉ 1 — Sécurité immédiate

| # | Action | Fichier(s) concerné(s) |
|---|---|---|
| 1.1 | Créer un middleware `requireRole(...roles)` côté backend | `server/src/middlewares/auth.middleware.js` |
| 1.2 | Protéger `/api/admin/stats` avec `requireRole('ADMIN')` | `server/src/routes/admin.routes.js` |
| 1.3 | Ajouter des protected routes côté frontend (composant `<ProtectedRoute>`) | `client/src/App.jsx` |

### PRIORITÉ 2 — Données réelles (GestionUtilisateurs)

| # | Action |
|---|---|
| 2.1 | Créer `GET /api/admin/utilisateurs` — liste paginée |
| 2.2 | Créer `POST /api/admin/utilisateurs` — création avec rôle |
| 2.3 | Créer `PUT /api/admin/utilisateurs/:id` — modification |
| 2.4 | Créer `PATCH /api/admin/utilisateurs/:id/statut` — activer/désactiver |
| 2.5 | Créer `DELETE /api/admin/utilisateurs/:id` — suppression |
| 2.6 | Brancher GestionUtilisateurs.jsx sur ces routes (supprimer le mock) |

### PRIORITÉ 3 — Schéma de base de données (migrations)

| # | Action | Impact |
|---|---|---|
| 3.1 | Ajouter `DIRECTION` à l'enum `Role` | Nouveau profil utilisateur |
| 3.2 | Ajouter `typeLocataire` (`PRIVE` / `FONCTIONNAIRE`) à `Utilisateur` | Distinction locataires |
| 3.3 | Enrichir `StatutDemande` : ajouter `EN_VALIDATION_DIRECTION` | Workflow demandes |
| 3.4 | Enrichir `StatutTicket` : ajouter `EN_ATTENTE_CONSTAT`, `CONSTAT_REALISE`, `EN_ATTENTE_VERIFICATION` | Circuit maintenance |
| 3.5 | Ajouter `typeReparation` (`LOCATAIRE` / `SONAPIE`) à `Intervention` | Circuit maintenance |
| 3.6 | Créer le modèle `Photo` avec enum `EtapePhoto` | Pièces jointes tickets |
| 3.7 | Créer le modèle `Paiement` avec enum `ModePaiement` et `StatutPaiement` | Module loyers |

### PRIORITÉ 4 — Modules métier manquants (backend + frontend)

| Module | Backend | Frontend |
|---|---|---|
| Logements | Routes CRUD complètes | Page liste + détail + formulaire |
| Demandes de logement | Routes CRUD + workflow direction | Page locataire + page admin/direction |
| Tickets de maintenance | Routes CRUD + circuit constat | Page locataire + page technicien + constat |
| Interventions | Routes + assignation | Page responsable technique |
| Mutations | Routes CRUD + workflow | Page locataire + admin |
| Paiements / Loyers | Routes CRUD + calcul | Page locataire + admin |
| Notifications | Routes lecture/marquage | Composant global (cloche) |

### PRIORITÉ 5 — Infrastructure upload

| # | Action |
|---|---|
| 5.1 | Installer `multer` côté serveur |
| 5.2 | Configurer Cloudinary (ou stockage local `/uploads`) |
| 5.3 | Créer la route `POST /api/upload` |
| 5.4 | Lier les photos aux tickets/interventions via le modèle `Photo` |

---

## SYNTHÈSE VISUELLE

```
                    ÉTAT ACTUEL DU PROJET
╔══════════════════════════════════════════════════════════╗
║  ✅ FAIT            ⚠️ PARTIEL          ❌ MANQUANT      ║
╠══════════════════════════════════════════════════════════╣
║  Auth JWT           GestionUsers        Logements       ║
║  Landing page       Dashboard legacy    Demandes        ║
║  Login/Logout       RegisterPage        Mutations       ║
║  AdminDashboard     Role check backend  Paiements       ║
║  AdminLayout        Protected routes    Photos/Upload   ║
║  Stats API          Refresh token       Module DIRECTION║
║  Schéma Prisma      (8 tables posées)   TypeLocataire   ║
║                                         Circuit constat ║
║                                         Notifications   ║
╚══════════════════════════════════════════════════════════╝

  Avancement estimé : ~15% du projet complet
  Base solide — architecture propre — prête à être étendue
```

---

*Rapport généré par analyse statique du code source — aucune modification effectuée.*
