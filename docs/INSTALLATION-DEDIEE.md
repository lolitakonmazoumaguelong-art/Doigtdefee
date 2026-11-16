# Offre Dédiée : installer Doigt de Fée chez un client

Dans cette offre, le client a sa propre copie de l'application et sa propre base de données,
sur des comptes **à son nom**. Ses données ne passent jamais par tes comptes.

## Avant de commencer

Le client doit créer (ou te laisser créer pour lui, avec son e-mail professionnel) :

- un compte **Supabase** (offre Pro recommandée, pour les sauvegardes quotidiennes)
- un compte **Vercel** (offre Pro obligatoire pour un usage commercial)
- un compte **GitHub**, uniquement si tu veux qu'il reçoive les mises à jour depuis un dépôt à lui

Il active la double authentification sur chacun et t'invite comme collaboratrice le temps de l'installation.

## Installation (environ 30 minutes)

1. **Base de données.** Dans son compte Supabase : créer un projet dans la région la plus proche,
   choisir un mot de passe fait de lettres et de chiffres, puis coller le contenu du fichier
   `drizzle/0000_*.sql` dans SQL Editor et cliquer « Run and enable RLS ».
2. **Adresse de connexion.** Connect > Direct > Transaction pooler : copier l'URL (port 6543)
   et y remplacer `[YOUR-PASSWORD]`.
3. **Code.** Soit tu lui donnes accès à ton dépôt privé en lecture, soit tu en fais une copie
   dans son compte GitHub.
4. **Mise en ligne.** Dans son compte Vercel : Add New > Project > importer le dépôt, ajouter la
   variable `DATABASE_URL` (type Secret), puis Deploy.
5. **Nom de domaine.** Vercel > Domains : brancher son domaine, par exemple `gestion.sasociete.mu`.
6. **Premier compte.** Ouvrir le site, « Create my workspace » : ce compte est le responsable.
7. **Fermer les inscriptions.** Sur une installation dédiée, une seule entreprise doit exister.
   Dans Vercel, ajouter la variable `SIGNUP_CLOSED` avec la valeur `1`, puis redéployer :
   plus personne ne peut créer une deuxième entreprise sur ce site.
8. **Retirer ton accès.** Une fois tout vérifié, le client te retire de ses comptes Supabase et Vercel,
   ou te garde avec un rôle limité si le contrat prévoit la maintenance.

## Mises à jour

Chaque nouvelle version doit être déployée chez chaque client dédié. Les changements de base
s'appliquent tout seuls au démarrage (`src/db/upgrades.ts`). Prévois ce temps dans le prix :
c'est ce qui rend cette offre plus chère que l'offre standard.

## Ce que ça change côté responsabilité

Les données sont hébergées sur les comptes du client, qui en garde les clés. Tu restes prestataire
tant que tu as un accès pour la maintenance : précise dans le contrat quand et pourquoi tu y accèdes.
