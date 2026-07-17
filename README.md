# SONAPIE

Projet fullstack moderne pour la gestion des logements SONAPIE.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Base de donnees: PostgreSQL avec Prisma ORM
- Authentification: JWT

## Installation

Depuis la racine du projet:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

Configurez ensuite `server/.env` avec vos identifiants PostgreSQL.

## Demarrage

Depuis la racine:

```bash
npm run dev
```

Le backend ecoute sur `0.0.0.0:5000` et le frontend Vite sur `0.0.0.0:5173`.
L'adresse reseau affichee au demarrage permet de tester l'application depuis un telephone connecte au meme WiFi.

## Prisma

Depuis `server/`:

```bash
npx prisma generate
npx prisma migrate dev --name init
```
