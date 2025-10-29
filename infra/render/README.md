# Déploiement sur Render

Ce dossier contient la configuration permettant de déployer STRATUS sur
Render avec un seul conteneur. Le Dockerfile multi‑étage compile le
client (`client/dist`) puis l’intègre dans le serveur Express. Pour
suivre la séparation recommandée (« service web statique » et
« service API »), connectez votre dépôt GitHub à Render et créez :

1. **Service API Node.js** : pointez vers le répertoire `server` ou
   utilisez le Dockerfile pour construire et lancer l’API. Configurez
   la variable d’environnement `PORT` si nécessaire (3000 par défaut).
2. **Service web statique** : sélectionnez `client/dist` comme
   répertoire de build. Render servira automatiquement les fichiers
   statiques via son CDN.

L’intégration GitHub Actions comprend un workflow `deploy.yml` qui
construit l’image Docker. Render proposera automatiquement une
intégration continue lorsque le dépôt est associé.
