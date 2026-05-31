// ============================================
// MULTIMEDIA.io — Módulo de Búsqueda de APIs
// ============================================

const SearchAPIs = (() => {
    let debounceTimer = null;
    let abortController = null;
    const DEBOUNCE_MS = 300;
    const MIN_CHARS = 3;
    const MAX_RESULTS = 8;

    const mapStatus = (s) => {
        if (s === 'RELEASING') return 'Por leer';
        if (s === 'FINISHED') return 'Leído';
        if (s === 'HIATUS') return 'Por leer';
        return 'Por leer';
    };

    // --- Anilist (Manga) ---
    async function searchAnilist(query) {
        const graphql = JSON.stringify({
            query: `query ($search: String) {
                Media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
                    title { romaji, english }
                    coverImage { large }
                    genres
                    startDate { year }
                    chapters
                    format
                    status
                    description(asHtml: false)
                }
            }`,
            variables: { search: query },
        });

        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: graphql,
            signal: abortController?.signal,
        });

        if (!res.ok) return [];
        const json = await res.json();
        const m = json.data?.Media;
        if (!m) return [];

        return [{
            titulo: m.title.english || m.title.romaji,
            portada: m.coverImage.large,
            genero: (m.genres || []).join(', '),
            anio: m.startDate.year || '',
            totales: m.chapters || null,
            subtipo: m.format || 'Manga',
            plataforma: '',
            sinopsis: m.description ? m.description.replace(/<[^>]*>/g, '').substring(0, 300) : '',
            apiStatus: mapStatus(m.status),
            _anilistId: m.id,
        }];
    }

    // --- Anilist (Anime/Series) ---
    async function searchAnilistTV(query) {
        const graphql = JSON.stringify({
            query: `query ($search: String) {
                Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    title { romaji, english }
                    coverImage { large }
                    genres
                    startDate { year }
                    episodes
                    format
                    status
                    description(asHtml: false)
                }
            }`,
            variables: { search: query },
        });

        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: graphql,
            signal: abortController?.signal,
        });

        if (!res.ok) return [];
        const json = await res.json();
        const m = json.data?.Media;
        if (!m) return [];

        return [{
            titulo: m.title.english || m.title.romaji,
            portada: m.coverImage.large,
            genero: (m.genres || []).join(', '),
            anio: m.startDate.year || '',
            totales: m.episodes || null,
            subtipo: m.format || 'Anime',
            plataforma: '',
            sinopsis: m.description ? m.description.replace(/<[^>]*>/g, '').substring(0, 300) : '',
            apiStatus: mapStatus(m.status),
            _anilistId: m.id,
        }];
    }

    // --- Comic Vine (Comics occidentales) ---
    async function searchComicVine(query) {
        const key = window.API_CONFIG.COMICVINE_KEY;
        if (!key) return [];

        const apiUrl = `https://comicvine.gamespot.com/api/search/?api_key=${encodeURIComponent(key)}&format=json&resources=volume&query=${encodeURIComponent(query)}`;
        const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`;

        try {
            const res = await fetch(url, { signal: abortController?.signal });
            if (!res.ok) return [];
            const data = await res.json();
            const results = data.results || [];

            return results.filter(r => r.name).slice(0, MAX_RESULTS).map(r => ({
                titulo: r.name || '',
                portada: r.image?.super_url || r.image?.medium_url || r.image?.original_url || r.image?.thumb_url || '',
                genero: '',
                anio: r.start_year || '',
                totales: r.count_of_issues || 0,
                subtipo: 'Comic',
                plataforma: r.publisher?.name || '',
                sinopsis: '',
                apiStatus: 'Por leer',
                _comicvineId: r.id,
            }));
        } catch (e) {
            console.warn('[MULTIMEDIA.io] Error Comic Vine:', e);
            return [];
        }
    }

    // --- TMDB (Películas / Series) ---
    async function getTMDBDetails(tvId) {
        const key = window.API_CONFIG.TMDB_KEY;
        try {
            const url = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${encodeURIComponent(key)}&language=es-ES`;
            const res = await fetch(url, { signal: abortController?.signal });
            if (!res.ok) return null;
            const data = await res.json();
            const total = (data.seasons || [])
                .filter(s => s.season_number > 0)
                .reduce((sum, s) => sum + (s.episode_count || 0), 0);
            return {
                episodes: total || null,
                status: data.status,
                inProduction: data.in_production || false,
            };
        } catch (e) { return null; }
    }

    async function searchTMDB(query, type) {
        const endpoint = type === 'peliculas' ? 'search/movie' : 'search/tv';
        const key = window.API_CONFIG.TMDB_KEY;
        if (!key) return [];

        const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${encodeURIComponent(key)}&language=es-ES&query=${encodeURIComponent(query)}&include_adult=false`;

        const res = await fetch(url, { signal: abortController?.signal });
        if (!res.ok) return [];
        const json = await res.json();
        const results = (json.results || []).slice(0, MAX_RESULTS);

        const mapTMDBStatus = (s, inProd) => {
            if (s === 'Returning Series' || s === 'In Production' || inProd) return 'Por ver';
            if (s === 'Ended') return 'Visto';
            if (s === 'Canceled') return 'Abandonado';
            return 'Por ver';
        };

        const mapped = results.map(r => ({
            titulo: r.title || r.name,
            portada: r.poster_path ? 'https://image.tmdb.org/t/p/w500' + r.poster_path : '',
            genero: (r.genre_ids || []).map(id => {
                const map = type === 'peliculas' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES;
                return map[id] || '';
            }).filter(Boolean).join(', '),
            anio: (r.release_date || r.first_air_date || '').substring(0, 4) || '',
            totales: null,
            subtipo: type === 'peliculas' ? 'Película' : 'Serie',
            plataforma: '',
            sinopsis: r.overview || '',
            apiStatus: mapTMDBStatus(r.status, false),
            _tmdbId: r.id,
        }));

        if (type === 'series') {
            const details = await Promise.all(mapped.map(r => getTMDBDetails(r._tmdbId)));
            mapped.forEach((r, i) => {
                if (details[i]) {
                    r.apiStatus = mapTMDBStatus(details[i].status, details[i].inProduction);
                    r.totales = details[i].episodes;
                }
            });
        }

        return mapped;
    }

    const TMDB_MOVIE_GENRES = {
        28:'Acción',12:'Aventura',16:'Animación',35:'Comedia',80:'Crimen',
        99:'Documental',18:'Drama',10751:'Familiar',14:'Fantasía',36:'Historia',
        27:'Terror',10402:'Música',9648:'Misterio',10749:'Romance',878:'Ciencia Ficción',
        10770:'TV Movie',53:'Suspense',10752:'Bélico',37:'Western',
    };
    const TMDB_TV_GENRES = {
        10759:'Acción y Aventura',16:'Animación',35:'Comedia',80:'Crimen',
        99:'Documental',18:'Drama',10751:'Familiar',10762:'Infantil',9648:'Misterio',
        10763:'Noticias',10764:'Reality',878:'Ciencia Ficción',10766:'Soap',
        10767:'Talk',10768:'Guerra y Política',37:'Western',
    };

    // --- RAWG (Videojuegos) ---
    async function searchRAWG(query) {
        const key = window.API_CONFIG.RAWG_KEY;
        if (!key) return [];

        const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=${MAX_RESULTS}`;

        const res = await fetch(url, { signal: abortController?.signal });
        if (!res.ok) return [];
        const json = await res.json();

        const results = [];
        for (const r of (json.results || [])) {
            const year = (r.released || '').substring(0, 4);
            const genres = (r.genres || []).map(g => g.name).join(', ');
            const platforms = (r.platforms || []).map(p => p.platform?.name).filter(Boolean).join(', ');

            results.push({
                titulo: r.name,
                portada: (r.background_image || r.background_image_additional || '') + '?trim=fit&w=400',
                genero: genres,
                anio: year || '',
                totales: null,
                subtipo: 'Videojuego',
                plataforma: platforms || '',
                sinopsis: '',
            });
        }
        return results;
    }

    // --- Renderizado del dropdown ---
    function renderDropdown(results, inputEl) {
        closeDropdown();
        if (!results.length) return;

        const container = document.getElementById('search-results-dropdown');
        if (!container) return;

        const rect = inputEl.getBoundingClientRect();
        const modal = document.getElementById('media-modal');
        const modalRect = modal.getBoundingClientRect();

        container.style.top = (rect.bottom - modalRect.top + 4) + 'px';
        container.style.left = (rect.left - modalRect.left) + 'px';
        container.style.width = rect.width + 'px';

        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 px-3 py-2 hover:bg-indigo-600/20 dark:hover:bg-indigo-600/20 cursor-pointer transition border-b border-slate-200 dark:border-slate-800 last:border-0';
            div.innerHTML = `
                <img src="${item.portada}" class="w-8 h-11 object-cover rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400'">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${item.titulo}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-slate-500 dark:text-slate-400">${item.anio}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-medium">${item.subtipo}</span>
                    </div>
                </div>
            `;
            div.addEventListener('click', () => {
                if (typeof window.selectSearchResult === 'function') window.selectSearchResult(item);
            });
            container.appendChild(div);
        });

        container.classList.remove('hidden');
    }

    function closeDropdown() {
        const container = document.getElementById('search-results-dropdown');
        if (container) {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
    }

    // --- Búsqueda principal ---
    function search(query, category) {
        if (!query || query.length < MIN_CHARS) {
            closeDropdown();
            return;
        }

        if (abortController) abortController.abort();
        abortController = new AbortController();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            try {
                let results = [];
                if (category === 'comics') {
                    const source = document.getElementById('modal-api-source')?.value || 'anilist';
                    if (source === 'comicvine') {
                        results = await searchComicVine(query);
                    } else {
                        results = await searchAnilist(query);
                    }
                } else if (category === 'series') {
                    const anilistResults = await searchAnilistTV(query);
                    if (window.API_CONFIG.TMDB_ENABLED) {
                        const tmdbResults = await searchTMDB(query, category);
                        results = [...anilistResults, ...tmdbResults].slice(0, MAX_RESULTS);
                    } else {
                        results = anilistResults;
                    }
                } else if (category === 'peliculas') {
                    if (!window.API_CONFIG.TMDB_ENABLED) {
                        console.warn('[MULTIMEDIA.io] TMDB no configurado. Ve a ⚙️ APIs para añadir tu key.');
                        return;
                    }
                    results = await searchTMDB(query, category);
                } else if (category === 'videojuegos') {
                    if (!window.API_CONFIG.RAWG_ENABLED) {
                        console.warn('[MULTIMEDIA.io] RAWG no configurado. Ve a ⚙️ APIs para añadir tu key.');
                        return;
                    }
                    results = await searchRAWG(query);
                }

                const inputEl = document.getElementById('form-titulo');
                if (inputEl && document.activeElement === inputEl) {
                    renderDropdown(results, inputEl);
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.error('[MULTIMEDIA.io] Error en búsqueda:', e);
            }
        }, DEBOUNCE_MS);
    }

    return { search, closeDropdown };
})();
