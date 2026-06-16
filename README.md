# GunZ: The Duel — Web Edition ⚔️🔫

Une recréation **jouable dans le navigateur** de [GunZ: The Duel](https://github.com/WhyWolfie/GunZ-The-Duel),
le TPS coréen culte connu pour son **mouvement K-style** (dash, wall-run, butterfly).
Construit en **3D temps réel** avec [Three.js](https://threejs.org/) — aucun build, aucune installation.

> Le jeu d'origine (MAIET Entertainment) est un client C++ massif. Cette version réimplémente
> **l'ADN du gameplay** — l'acrobatie et le duel arme/épée — directement dans le navigateur.

## 🎮 Jouer

Ouvre simplement `index.html` dans un navigateur moderne (Chrome, Edge, Firefox).
Comme c'est un module ES qui charge Three.js depuis un CDN, sers-le via HTTP plutôt qu'en `file://` :

```bash
# depuis la racine du dépôt
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

Une connexion internet est requise au premier chargement (Three.js est récupéré depuis jsDelivr).

## 🕹️ Contrôles

| Touche | Action |
|---|---|
| **Z Q S D** / WASD / flèches | Se déplacer |
| **Souris** | Viser (verrouillage du pointeur) |
| **Clic gauche** | Tirer / Frapper à l'épée |
| **Clic droit** | Bloquer (épée) |
| **Espace** | Saut · **Double saut** en l'air |
| **Maj** | **Dash** dans la direction visée |
| **Z/Q/S/D ×2** (double-tap) | Dash rapide |
| **Vers un mur + Saut** | **Wall-run** / **Wall-jump** |
| **1 – 5** / molette | Changer d'arme |
| **R** | Recharger |
| **Échap** | Pause |

### K-Style
Le sel de GunZ : enchaîne **Saut → Dash → Slash → Block** (Butterfly). Le slash annule le dash,
le dash annule le slash. Sers-toi des murs et des piliers de l'arène pour te repositionner sans cesse.

## 🔫 Arsenal

- **Épée** — slash en arc + parade (clic droit)
- **Pistolets** — tir rapide, précis
- **SMG** — cadence élevée, dégâts continus
- **Shotgun** — 9 plombs, dégâts « spike » à courte portée
- **Roquette** — projectile à dégâts de zone (splash)

## 🎯 Modes

- **Deathmatch** — affronte 3 bots IA, premier à **25 frags**.
- **Entraînement** — maîtrise le mouvement sans pression (2 bots, pas de limite).

Les bots naviguent, te traquent à vue, te tirent dessus et dashent comme dans GunZ.

## 🧱 Architecture

```
index.html          Page + HUD + menus + import-map Three.js
css/gunz.css        Habillage néon / arène
js/gunz/
 ├─ main.js         Bootstrap, boucle de jeu, flux menu/pause/fin
 ├─ world.js        Arène, colliders AABB, lumières, raycasting
 ├─ player.js       Contrôleur 3e personne : K-style, caméra, combat
 ├─ bots.js         IA ennemie + gestionnaire
 ├─ weapons.js      Configs d'armes, meshes, projectiles
 ├─ fighter.js      Modèle humanoïde + animation procédurale
 ├─ effects.js      Particules, traceurs, explosions, screen-shake
 ├─ input.js        Clavier/souris, pointer-lock, double-tap
 ├─ audio.js        SFX synthétisés (WebAudio, zéro fichier)
 └─ hud.js          Mise à jour du HUD (DOM)
```

La physique (collisions cylindre/AABB, raycasting balle, ray-sphere des bots, wall-run) a été
validée hors-ligne via une simulation headless de 900 frames + tests unitaires.

## 📦 À propos de l'ancien projet

Ce dépôt contenait auparavant « KidLearn » (jeux éducatifs). Il a été **préservé** dans
[`kidlearn/`](kidlearn/) et reste accessible à `kidlearn/index.html`.

## 🙏 Crédits

Inspiré de **GunZ: The Duel** (MAIET Entertainment) et de la communauté de préservation
[WhyWolfie/GunZ-The-Duel](https://github.com/WhyWolfie/GunZ-The-Duel). Projet fan, non commercial.
