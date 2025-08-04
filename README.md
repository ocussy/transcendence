| Personne                                         | Modules & Tâches Techniques                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🧑‍🎮 **P1 - Responsable Jeu** *(Gameplay & UX)* | **🎮 Jeu Pong (obligatoire)**<br>• Match local sur le même clavier<br>• Matchmaking<br>• Tournoi avec alias & ordre<br>• Vitesse uniforme pour tous<br><br>**🎮 Modules activés :**<br>• `Major: AI Opponent`<br>• `Minor: Game Customisation`<br>**🎨 Module activé :**<br>• `Major: 3D Techniques` (si vous choisissez une version 3D du jeu)                                                                                                                                |
| 🛠️ **P2 - Backend & Authentification**          | **🌐 Web Backend :**<br>• `Major: Backend Framework (Fastify)`<br>• `Minor: Database Backend`<br><br>**👤 User Management :**<br>• `Major: Standard user management` (inscription, login, users across tournaments)<br>• `Major: Remote Auth` (OAuth Google)<br><br>**📋 Accesibilite :**<br>• `Minor: Multiple Languages` (stats utilisateur / partie)<br><br>**🔐 Cybersecurity :**<br>• `Major: 2FA + JWT` (auth sécurisée)<br>• Stockage `.env`, validation back, sécurisation des routes |
| 🛡️ **P3 - Frontend & Sécurité**                 | **🖥️ Frontend :**<br>• `Minor: Frontend Framework (ex: React)`<br>• TypeScript, SPA, navigation avec boutons, Firefox compatible<br><br>**🔐 Sécurité Client :**<br>• Validation formulaires<br>• Protection XSS<br>• Connexion HTTPS / WSS<br>• Sécurisation côté client<br><br>**📈 GDPR & UX :**<br>• `Minor: GDPR Compliance`<br>• `Minor: Browser Compatibility`<br>• `Minor: Dashboards`                                                             |


Bien sûr ! Voici une version **en français**, claire et structurée, que tu peux utiliser telle quelle pour un rapport, une soutenance ou un cahier des charges :

---

## 🔐 Module Mineur – Conformité RGPD

### 🎯 **Objectif général**

Renforcer la confidentialité des utilisateurs et la protection des données personnelles en fournissant des outils conformes au **Règlement Général sur la Protection des Données (RGPD)**. Ce module permet aux utilisateurs d’exercer pleinement leurs droits sur leurs données personnelles.

---

## ✅ **Fonctionnalités clés et objectifs**

### 1. **Anonymisation des données personnelles**

* **But :** Permettre aux utilisateurs de demander l’anonymisation de leurs données, afin qu’aucune information ne permette de les identifier directement ou indirectement.
* **Options d’implémentation :**

  * Anonymisation irréversible : suppression ou transformation définitive des noms, emails, adresses IP, etc.
  * Pseudonymisation : remplacement des identifiants par des jetons sécurisés, avec clé de correspondance stockée à part.
* **Exemples :**

  * Remplacement de `email = user@example.com` par `email_hash = ab23f7...`
  * Suppression du nom complet et des métadonnées sensibles.

---

### 2. **Gestion locale des données**

* **But :** Donner aux utilisateurs un contrôle total sur les données stockées localement (par exemple dans les cookies ou le localStorage).
* **Fonctionnalités proposées :**

  * Interface pour **afficher**, **modifier** ou **supprimer** les données personnelles associées à leur compte.
  * Gestion du **consentement** (bannière, préférences de cookies, choix granulaire).
  * Transparence sur les données collectées côté client et leur utilisation.

---

### 3. **Suppression définitive du compte**

* **But :** Offrir aux utilisateurs une méthode simple et claire pour supprimer leur compte ainsi que toutes les données associées.
* **Processus :**

  * Bouton ou lien accessible dans les paramètres du compte.
  * Notification de confirmation et exécution de la suppression dans un délai raisonnable.
  * Suppression des données dans les bases, fichiers, journaux, et à terme dans les sauvegardes.
* **Respect du droit à l'effacement (article 17 RGPD).**

---

### 4. **Communication claire des droits**

* **But :** Informer l’utilisateur de manière transparente sur ses droits et sur les moyens de les exercer.
* **Supports proposés :**

  * Page dédiée aux **droits des utilisateurs**.
  * Politique de confidentialité claire, concise et facilement accessible.
  * Notifications ou rappels lors des actions sensibles (ex. : modification d’email, suppression de compte).

---

## 🧩 **Avantages de ce module**

* Conformité légale (RGPD).
* Renforcement de la confiance des utilisateurs.
* Réduction des risques liés aux violations de données.
* Meilleure transparence et image éthique du service.

---

Souhaites-tu que je t’aide à rédiger :

* Des exemples d’interface utilisateur (UI) ?
* Des endpoints backend (Fastify/Express) ?
* Un modèle de politique de confidentialité conforme RGPD ?

Je peux aussi t’aider à **implémenter une fonction `DELETE /account` ou `POST /anonymize`** si tu veux.
