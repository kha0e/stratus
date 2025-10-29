# STRATUS – Démo de vol 3D photoréaliste

STRATUS est une démonstration de vol en 3D centrée sur la qualité
graphique. Elle permet de survoler différents environnements
photoréalistes avec des commandes simplifiées : puissance, tangage et
roulis. Le client repose sur Three.js (WebGL/WebGPU) et est
compatible avec les navigateurs modernes. Un serveur Express
optionnel expose les scènes et presets via une API légère et peut
servir la build statique en production.

## Structure du dépôt

* `client/` – Application front‑end (Three.js, Vite, TS)
* `server/` – API Node.js/Express pour les presets et la télémétrie
* `assets/` – Placez ici vos textures HDRI, heightmaps et autres
  ressources (non incluses par défaut)
* `infra/render/` – Dockerfile et instructions de déploiement Render
* `.github/workflows/` – Workflows CI/CD (lint/build/tests, déploiement)

## Lancement local

1. Installez les dépendances du client :
   ```bash
   cd client
   npm install
   npm run dev
   ```
   L’application sera disponible sur `http://localhost:5173`.

2. (Optionnel) Démarrez l’API :
   ```bash
   cd server
   npm install
   node index.js
   ```
   L’API écoute sur le port 3000 et expose `/api/scenes` et `/api/presets`.

## Déploiement

Pour un déploiement sur Render :

1. **Service web statique** : configurez la racine du projet sur
   `client` et la commande de build `npm run build`. Le répertoire de
   publication est `client/dist`.
2. **Service API** : configurez la racine du projet sur `server` et la
   commande de démarrage `node index.js`.

Alternativement, utilisez le Dockerfile multi‑étage situé dans
`infra/render/` pour construire une seule image combinant client et
serveur.
