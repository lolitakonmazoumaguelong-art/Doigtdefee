# Doigt de Fée

Logiciel de gestion pour installateurs de vidéosurveillance, d'alarmes et de maison intelligente :
stock, clients, interventions, devis et factures. Chaque entreprise inscrite a son espace isolé.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000. Aucune configuration : une base Postgres embarquée est créée dans `.data/`.

## Mettre en ligne (GitHub + Supabase + Vercel)

1. Pousse ce dossier sur un dépôt GitHub.
2. Supabase : crée un projet, puis copie l'URL de connexion « Transaction pooler » (Project Settings > Database).
3. Crée les tables une seule fois depuis ton ordinateur :

```bash
DATABASE_URL="l-url-supabase" npm run db:migrate
```

4. Vercel : importe le dépôt GitHub et ajoute la variable d'environnement `DATABASE_URL` avec la même URL.
5. Déploie. Le lien Vercel est celui à donner au client, qui crée son espace via « Créer mon espace ».

## Organisation du code

- `src/db/schema.ts` : tables (entreprises, utilisateurs, clients, articles, mouvements de stock, documents, interventions)
- `src/actions/` : toutes les écritures (validées et filtrées par entreprise)
- `src/lib/queries.ts` : toutes les lectures
- `src/app/app/` : écrans de l'espace connecté
- `src/app/page.tsx` : page d'accueil publique

Après une modification de `schema.ts` : `npm run db:generate`, puis `npm run db:migrate` sur la base en ligne.

## Règles métier à connaître

- Le stock sort au moment où une facture est **émise** (pas en brouillon). Une facture émise est verrouillée.
- Supprimer une facture émise remet le matériel en stock.
- Un devis accepté ou envoyé se transforme en facture en un clic.
- Chaque devis ou facture (hors brouillon) a un lien public `/d/...` à envoyer au client final.
- Le responsable gère les réglages et les comptes employés ; les employés ont accès au reste.
- Le fil « Équipe » est partagé par toute l'entreprise ; seul le responsable épingle des consignes.
- Stock disponible = stock physique moins le matériel réservé (devis acceptés non facturés, factures en brouillon).
- La liste « À commander » se calcule seule ; un bon de commande reçu remet le matériel en stock.
- Un produit arrêté sort des devis et des commandes mais garde son historique.
- Les statistiques (réservées au responsable) s'appuient sur les factures émises, les bilans d'intervention et les produits signalés défectueux.
