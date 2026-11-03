# PabloHFlix Console V2

> État : première intégration du design dans le fork Homarr, non déployée et non validée par un build complet.

## Base

- Upstream : homarr-labs/homarr, tag v2.10.1 (30 octobre 2026).
- Base stable conservée dans la branche pablohflix/base-v2.10.1.
- Modifications dans feat/pablohflix-console-v2, PR à relire avant fusion.
- Licence Apache 2.0 et attributions de Homarr conservées.

## Ce qui fonctionne dans le code

- Nouvelle route /console, qui réutilise la véritable définition du tableau de bord d'accueil Homarr.
- Widgets, cache, connexions et permissions restent gérés par le moteur Homarr ; aucune API métier dupliquée.
- Accès réservé aux utilisateurs authentifiés, avec redirection vers le login Homarr.
- Quatre apparences : Terminal Neon, Matrix, Midnight, Minimal Light.
- Thème persistant dans le navigateur via localStorage (pas encore synchronisé entre Mac et iPhone).
- Menu d'accès au tableau de bord natif (/), aux intégrations et à l'administration (/manage).
- Styles visuels limités à /console ; la navigation Homarr native reste présente ailleurs.

## À vérifier avant tout déploiement

1. Installer les dépendances conformément au README, à la version de Bun et au lockfile du tag stable.
2. Lancer les commandes officielles de lint/typecheck/build (workspace Next.js) sur un ordinateur de développement.
3. Vérifier les pages /console, /, /manage, la connexion et les permissions d'un utilisateur non administrateur.
4. Tester les thèmes et la disposition sur MacBook Air et iPhone Pro Max.
5. Vérifier le rendu de tous les types de widgets et leur lisibilité avant de déclarer la maquette atteinte.

## Ce qui reste à développer

- Mise en page des cartes conforme aux maquettes (les widgets Homarr gardent encore leur grille standard).
- Sources SMART individuelles, RAID Btrfs et snapshots UGOS Pro.
- API recordstudio, VPN media et VPN suisse avec contrôle réel du tunnel.
- Synchronisation des thèmes entre appareils et stratégies d'alertes.
- Image Docker versionnée et déploiement UGOS sous LAN/Tailscale.

## Sécurité et coexistence

- Ne pas monter docker.sock sans analyse de privilèges et contrôle d'accès.
- Ne pas exposer la console au WAN Freebox ; LAN et Tailscale uniquement.
- Ne pas altérer les stacks media-arr, recordstudio, Pi-hole, NPM, Tailscale, ni le pare-feu UGOS.
- Garder le projet nas-dashboard v0.1.1 installé tant que la V2 n'a pas été testée.
- Aucune clé API, mot de passe ni secret dans le dépôt public.

## Plan de rollback

Le code Homarr n'est pas encore exécuté sur le NAS. Supprimer la branche de travail ou ne pas fusionner la PR restaure la situation initiale ; aucun service existant n'a été touché.
