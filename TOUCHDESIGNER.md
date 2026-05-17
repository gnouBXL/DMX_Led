# Guide TouchDesigner — Contrôle de barres LED via Art-Net

Ce guide est basé sur des tests réels avec TouchDesigner Non-Commercial Build 2025.32280.

## Architecture du réseau TD

```
Line SOP (géométrie)
      ↓
Lookup Texture SOP (applique les couleurs d'un TOP sur les points)
      ↓
DMX Fixture POP (convertit les couleurs en canaux DMX) — 1 par bande LED
      ↓
DMX Out POP (envoie via Art-Net) — 1 seul pour tout
```

## Réseau de base — vue d'ensemble

```
noise1 (TOP) ──→ null1 (TOP) ──→ lookuptex1 (SOP) ──→ dmxfixture1 ──→
line_ledStrip (SOP) ──────────────────────────────────────────────────   dmxout1
constant1 (TOP) ─→ null2 (TOP) ──→ lookuptex2 (SOP) ──→ dmxfixture2 ──→
line_ledStrip1 (SOP) ─────────────────────────────────────────────────
```

Les connexions se font en tirant des lignes entre les sorties et entrées des opérateurs dans le network TD.

---

## 1. Line SOP — Définir le nombre de LEDs

Le **Line SOP** représente la barre LED physique. Chaque point de la ligne = 1 LED.

**Onglet Setup :**
- Output : **Subdivided Lines** ← obligatoire

**Onglet Divisions :**
- Divisions Method : Divisions per Segment
- Divisions : **nombre de LEDs** (ex: 30 pour 30 LEDs)

---

## 2. Lookup Texture SOP — Appliquer les couleurs

Le **Lookup Texture SOP** est le pont entre le monde image (TOP) et le monde géométrie (SOP/POP). Il échantillonne une texture 2D et écrit les couleurs sur les points de la ligne.

**Paramètres clés :**
- Attribute Class : **Point**
- TOP : nom du TOP source (ex: `null1`)
- Lookup Index U : **P(0)** — utilise la position X du point pour échantillonner la texture
- Lookup Index V : **P(1)**
- Output Attribute Scope : **Color**

---

## 3. DMX Fixture POP — Convertir en DMX

Créez un **DMX Fixture POP** par bande LED. Connectez la sortie du Lookup Texture SOP à son entrée.

### Onglet Fixture

| Paramètre | Valeur | Note |
|---|---|---|
| Active | On | |
| Auto Layout | On | |
| Net | 0 à 127 | Selon config ESP32 |
| Subnet | 0 à 15 | Selon config ESP32 |
| Universe | 0 à 15 | Selon config ESP32 |
| Channel | 1 | Canal de départ |
| Channel Gap | 0 | |
| Quantize Universe | By Components | **Valeur par défaut** — à laisser |

**Quantize Universe = By Components** garantit que R, G, B d'un même pixel restent dans le même univers. C'est le mode **Pixel aligné** dans la config ESP32.

### Onglet DMX Profile

| Paramètre | Valeur | Note |
|---|---|---|
| Name | Color | |
| Value Type | **Point** | Important — différent du défaut |
| Value Source | Attribute | |
| Attribute | **Color.rgb** | Voir note ci-dessous |
| Value Resolution | 8-bit | |
| Value is Normalized | On | |

**Color.rgb vs Color :**
- `Color` (défaut) — inclut le canal Alpha → 4 canaux par LED, à éviter
- `Color.rgb` — exactement 3 canaux RGB par LED ← **recommandé**
- `Color.grb` — ordre GRB pour les LEDs WS2811

**Syntaxes équivalentes :**
- `Color.rgb` ← plus lisible
- `Color(0) Color(1) Color(2)` ← même résultat

---

## 4. DMX Out POP — Envoyer via Art-Net

Un seul **DMX Out POP** suffit pour toutes les barres. Connectez tous vos DMX Fixture POPs à son entrée.

### Onglet DMX

| Paramètre | Valeur | Note |
|---|---|---|
| Active | On | |
| Interface | **Art-Net** | |
| Rate | 40 à 60 | Max 44Hz recommandé par le standard DMX |

### Onglet Network

| Paramètre | Valeur | Note |
|---|---|---|
| Network Address | **255.255.255.255** | Broadcast — valeur par défaut |
| Network Port | 6454 | Port Art-Net standard |
| Send ArtSync | On ou Off | Utile avec beaucoup d'univers simultanés |

**Send ArtSync :** envoie un paquet de synchronisation après tous les univers d'une frame. Utile pour éviter le tearing avec 10+ univers. Pour 2-3 barres, ça ne change pas grand chose.

---

## 5. Adressage Art-Net

Art-Net utilise trois niveaux pour identifier un univers DMX :

```
Univers absolu = (Net × 256) + (Subnet × 16) + Universe
```

Exemples :
```
Net=0, Sub=0, U=0 → absolu = 0
Net=0, Sub=0, U=1 → absolu = 1
Net=0, Sub=1, U=0 → absolu = 16
Net=0, Sub=1, U=3 → absolu = 19
```

**Important :** le numéro d'univers configuré dans l'ESP32 doit correspondre à l'univers absolu calculé depuis Net/Subnet/Universe dans TD.

---

## 6. Configuration type pour 2 barres

### BarA — 30 LEDs, Univers 1

**DMX Fixture POP (dmxfixture1) — Onglet Fixture :**
- Net : 0, Subnet : 0, Universe : **1**, Channel : 1

**DMX Fixture POP (dmxfixture1) — Onglet DMX Profile :**
- Attribute : `Color.rgb`, Value Type : Point, Resolution : 8-bit

### BarB — 10 LEDs, Univers 2

**DMX Fixture POP (dmxfixture2) — Onglet Fixture :**
- Net : 0, Subnet : 0, Universe : **2**, Channel : 1

**DMX Fixture POP (dmxfixture2) — Onglet DMX Profile :**
- Attribute : `Color.rgb`, Value Type : Point, Resolution : 8-bit

### DMX Out POP

- Interface : Art-Net
- Rate : 60
- Network Address : 255.255.255.255

---

## 7. Sources de couleur (TOP)

### Noise TOP — couleurs animées aléatoires

Idéal pour tester rapidement. Le Noise TOP génère des textures animées colorées.

### Constant TOP — couleur fixe

Pour tester une couleur précise sur toute la barre.

### Movie File In TOP, Render TOP, etc.

N'importe quel TOP peut être utilisé comme source de couleur. Le Lookup Texture SOP échantillonne la texture à la position de chaque point.

---

## 8. Connexion dans le network

Dans TouchDesigner, les connexions se font en tirant une ligne depuis la sortie d'un opérateur vers l'entrée d'un autre. Les opérateurs connectés apparaissent dans "Connected Input OPs" en bas du panneau de paramètres.

```
Workflow :
1. Créer un Line SOP → configurer Divisions = nombre de LEDs
2. Créer un TOP source (Noise, Constant, etc.)
3. Créer un Lookup Texture SOP → connecter Line SOP + TOP
4. Créer un DMX Fixture POP → connecter Lookup Texture SOP
5. Créer un DMX Out POP → connecter tous les DMX Fixture POPs
6. Activer le DMX Out POP
```

---

## 9. Dépannage

**Les LEDs ne répondent pas**
- Vérifier que Net/Subnet/Universe dans TD correspond à l'univers absolu dans l'ESP32
- Vérifier que le DMX Out POP est actif (Active = On)
- Vérifier que le réseau Wi-Fi est le même pour le Mac et l'ESP32

**Les couleurs sont décalées / mauvais pixels**
- Vérifier que Attribute = `Color.rgb` et non `Color`
- Vérifier le canal de départ (Channel) dans le DMX Fixture POP

**Les LEDs se figent avec 3+ fixtures**
- Réduire le Rate dans le DMX Out POP (40 au lieu de 60)
- Ce bug était présent dans les versions antérieures du firmware — mettre à jour le firmware

**Mauvais ordre de couleurs (ex: vert au lieu de rouge)**
- Changer `Color.rgb` en `Color.grb` dans le DMX Profile si les LEDs sont en ordre GRB

---

## 10. Générer la config automatiquement

Le dashboard LED Controller (http://localhost:5173) génère automatiquement :
- La **Routing Table** pour le DMX Out POP
- Un **script Python** avec la configuration de toutes les bandes

Aller dans l'onglet **TouchDesigner** du dashboard pour accéder à ces outils.
