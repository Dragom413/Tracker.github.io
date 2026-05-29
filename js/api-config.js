// ============================================
// MULTIMEDIA.io — Configuración de APIs
// ============================================
// Lee keys de localStorage. Se configuran desde el panel de UI.
// Fallback: api-keys.js si existe (legacy).
// ============================================

const STORAGE_API_KEYS = 'multimedia-io-api-keys';

window.API_CONFIG = {
    TMDB_BASE: 'https://api.themoviedb.org/3',
    TMDB_IMG: 'https://image.tmdb.org/t/p/w500',
    ANILIST_URL: 'https://graphql.anilist.co',
    RAWG_BASE: 'https://api.rawg.io/api',
    COMICVINE_BASE: 'https://comicvine.gamespot.com/api',

    get TMDB_KEY() {
        return this._getKey('TMDB_KEY');
    },
    get RAWG_KEY() {
        return this._getKey('RAWG_KEY');
    },
    get COMICVINE_KEY() {
        return this._getKey('COMICVINE_KEY');
    },
    get COMICS_SOURCE() {
        return this._getKey('COMICS_SOURCE') || 'anilist';
    },

    get TMDB_ENABLED() {
        return this.TMDB_KEY && this.TMDB_KEY !== 'AQUI_TU_KEY_DE_TMDB';
    },
    get RAWG_ENABLED() {
        return this.RAWG_KEY && this.RAWG_KEY !== 'AQUI_TU_KEY_DE_RAWG';
    },
    get COMICVINE_ENABLED() {
        return this.COMICVINE_KEY && this.COMICVINE_KEY !== 'AQUI_TU_KEY_DE_COMICVINE';
    },
    ANILIST_ENABLED: true,

    _getKey(key) {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_API_KEYS) || '{}');
            if (stored[key]) return stored[key];
        } catch (e) {}
        // Fallback a api-keys.js (legacy)
        return (window.API_KEYS && window.API_KEYS[key]) || '';
    }
};

window.loadAPIKeys = function() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_API_KEYS) || '{}');
    } catch (e) { return {}; }
};

window.saveAPIKeys = function(keys) {
    const current = window.loadAPIKeys();
    const merged = Object.assign({}, current, keys);
    localStorage.setItem(STORAGE_API_KEYS, JSON.stringify(merged));
};

window.getAllAPIStatus = function() {
    return {
        anilist: true,
        tmdb: window.API_CONFIG.TMDB_ENABLED,
        rawg: window.API_CONFIG.RAWG_ENABLED,
        comicvine: window.API_CONFIG.COMICVINE_ENABLED,
        comicsSource: window.API_CONFIG.COMICS_SOURCE,
    };
};
