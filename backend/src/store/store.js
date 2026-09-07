// Store central — état en mémoire + persistence JSON
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Surchargeable (app desktop) pour écrire dans un dossier utilisateur inscriptible
// plutôt que dans le bundle de l'app, en lecture seule une fois installée.
const CONFIG_PATH = process.env.BARS_CONFIG_PATH || join(__dirname, '../../config/bars.json');

// État en mémoire
const state = {
    bars: {},      // { [ip]: { ip, name, universe, ... } }
    groups: [],
    presets: [],
};

// Charge la config depuis le fichier JSON
function load() {
    if (existsSync(CONFIG_PATH)) {
        try {
            const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
            if (data.groups)  state.groups  = data.groups;
            if (data.presets) state.presets = data.presets;
            console.log('[Store] Config chargée');
        } catch (e) {
            console.error('[Store] Erreur lecture config:', e.message);
        }
    }
}

// Sauvegarde la config dans le fichier JSON
function save() {
    try {
        const data = {
            groups:  state.groups,
            presets: state.presets,
        };
        writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[Store] Erreur sauvegarde:', e.message);
    }
}

// Mise à jour d'une barre (découverte ou heartbeat)
function updateBar(ip, info) {
    state.bars[ip] = {
        ...state.bars[ip],
        ...info,
        ip,
        lastSeen: Date.now(),
        online: true,
    };
}

// Marque les barres non vues depuis 10s comme offline
function checkOffline() {
    const now = Date.now();
    for (const ip in state.bars) {
        if (now - state.bars[ip].lastSeen > 10000) {
            state.bars[ip].online = false;
        }
    }
}

// Retourne toutes les barres
function getBars() {
    return Object.values(state.bars);
}

function getGroups()  { return state.groups; }
function getPresets() { return state.presets; }

function saveGroup(group) {
    const idx = state.groups.findIndex(g => g.id === group.id);
    if (idx >= 0) state.groups[idx] = group;
    else state.groups.push(group);
    save();
}

function savePreset(preset) {
    const idx = state.presets.findIndex(p => p.id === preset.id);
    if (idx >= 0) state.presets[idx] = preset;
    else state.presets.push(preset);
    save();
}

function deleteGroup(id) {
    state.groups = state.groups.filter(g => g.id !== id);
    save();
}

function deletePreset(id) {
    state.presets = state.presets.filter(p => p.id !== id);
    save();
}

export default {
    load, save,
    updateBar, checkOffline,
    getBars, getGroups, getPresets,
    saveGroup, savePreset,
    deleteGroup, deletePreset,
};