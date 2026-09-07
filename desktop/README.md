# DMX LED Controller — App Desktop

Application de bureau (Mac / Windows, Linux en bonus) qui embarque le **backend Node.js**
et le **dashboard React** dans une seule fenêtre native, packagée avec
[Electron](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/).

Objectif : configurer et piloter les barres LED ESP32 **sans Raspberry Pi** — un
double-clic sur l'app (`.app` sur Mac, `.exe` sur Windows) suffit.

## Comment ça marche

```
┌─────────────────────────────────────────┐
│  App Electron (macOS / Windows / Linux)  │
│                                           │
│  ┌───────────────┐    ┌────────────────┐ │
│  │ Backend Node   │    │ Fenêtre native │ │
│  │ (process       │───▶│ (Chromium)     │ │
│  │  principal      │    │ charge         │ │
│  │  Electron)      │    │ localhost:3001 │ │
│  └───────────────┘    └────────────────┘ │
│         │                                 │
│         ▼                                 │
│   UDP découverte (port 4210)              │
│   → même réseau Wi-Fi que les ESP32       │
└─────────────────────────────────────────┘
```

Au démarrage, l'app :
1. Lance le backend existant (`backend/src/index.js`) directement dans le
   processus principal Electron (pas besoin d'installer Node.js séparément —
   Electron l'embarque).
2. Attend que `http://localhost:3001/api/ping` réponde.
3. Ouvre une fenêtre qui charge le dashboard (le backend sert déjà
   `frontend/dist` en statique, comme sur le Pi).

Le reste (découverte UDP des ESP32, WebSocket, flash firmware) fonctionne
**à l'identique** de la version Raspberry Pi : c'est le même code backend.

### Stockage des données

Contrairement au Pi, l'app installée est en lecture seule une fois packagée.
La config (groupes, presets) est donc écrite dans le dossier de données
utilisateur standard de l'OS (`app.getPath('userData')`), pas dans le bundle :

- macOS : `~/Library/Application Support/DMX LED Controller/bars.json`
- Windows : `%APPDATA%\DMX LED Controller\bars.json`
- Linux : `~/.config/DMX LED Controller/bars.json`

## Développement

```bash
cd desktop
npm install
npm run dev
```

`npm run dev` build le frontend (`vite build`), installe les dépendances du
backend, puis lance Electron.

## Créer l'exécutable

```bash
cd desktop
npm install

npm run dist:mac    # → release/*.dmg, release/*.zip (macOS, arm64 + x64)
npm run dist:win     # → release/*.exe (installeur NSIS, Windows x64)
npm run dist          # → build pour la plateforme courante
```

Les binaires sortent dans `desktop/release/`.

### Via GitHub Actions

Le workflow [`build-desktop.yml`](../.github/workflows/build-desktop.yml)
build l'app sur macOS, Windows et Linux à chaque push sur `main` (ou
déclenchement manuel depuis l'onglet **Actions**). Les binaires sont
disponibles en artefacts téléchargeables sur la page du run — pas besoin
d'un Mac pour obtenir le `.dmg`.

> **macOS non signé** : sans certificat Apple Developer (payant), l'app est
> signée en **ad-hoc** au build (`scripts/afterSignAdHoc.js`, hook
> `afterSign`) — nécessaire pour que le binaire **arm64/Apple Silicon**
> démarre du tout (macOS refuse d'exécuter du code arm64 non signé, même
> ad-hoc, avec l'erreur *"l'app est endommagée"*). Gatekeeper affichera
> quand même l'avertissement "développeur non identifié" : **clic droit →
> Ouvrir** la première fois suffit.
>
> Si vous avez déjà téléchargé une version buildée **avant** ce correctif et
> que macOS dit *"est endommagée et ne peut pas être ouverte"*, l'app n'a
> aucune signature — supprimez l'attribut de quarantaine manuellement :
> ```bash
> xattr -cr "/Applications/DMX LED Controller.app"
> ```
> (adapter le chemin si l'app n'a pas été déplacée dans `/Applications`),
> puis relancez-la. Ou plus simple : téléchargez un nouveau build depuis
> [Actions](../.github/workflows/build-desktop.yml), il sera signé ad-hoc.
>
> La signature + notarization complètes (nécessitent un compte Apple
> Developer) pourront être ajoutées plus tard dans `package.json` →
> `build.mac` (`identity`, `notarize`).
>
> **Puce M1/M2/M3 (Apple Silicon)** → prendre le fichier `arm64`
> (`DMX LED Controller-*-arm64.dmg`). **Mac Intel** → celui sans suffixe ou
> `x64`.
>
> **Icônes** : par défaut, l'icône Electron générique est utilisée. Pour une
> icône personnalisée, ajouter `desktop/build/icon.icns` (Mac) et
> `desktop/build/icon.ico` (Windows) — electron-builder les détecte
> automatiquement.

## Roadmap mobile (Android / iOS)

Electron ne cible que le desktop. Pour mobile, deux pistes envisagées plus
tard (non implémentées) :

- **PWA** — le dashboard React est déjà servi en HTTP par le backend ; le
  transformer en PWA installable (`manifest.json` existe déjà côté frontend)
  couvrirait une bonne partie du besoin sans backend embarqué.
- **Tauri Mobile** — si un backend embarqué est nécessaire sur mobile aussi,
  Tauri 2 (Rust) supporte Android/iOS, mais demanderait de porter le backend
  Node vers un sidecar ou de le réécrire.

Voir le backlog dans le [README principal](../README.md#backlog) pour le suivi.
