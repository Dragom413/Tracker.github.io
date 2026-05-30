// Importaciones de Firebase SDK v10 (Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBGA5TDfcfRRWAPZyNX3lyGi30s6CRKgMM",
    authDomain: "tracker-3f893.firebaseapp.com",
    projectId: "tracker-3f893",
    storageBucket: "tracker-3f893.firebasestorage.app",
    messagingSenderId: "148753508737",
    appId: "1:148753508737:web:22552d33879dbbbd9fa080",
    measurementId: "G-3V8BVS05VN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({ prompt: 'select_account' });

const STORAGE_KEY = 'mediaData Engine v6';
const isEntornoLocal = window.isEntornoLocal;

let usuarioActual = null;

// Estructura Base de Datos en Memoria
let currentTab = 'home';
let currentStatsSubTab = 'comics';
let mediaData = { comics: [], series: [], peliculas: [], videojuegos: [], customLists: [] };

let chartC, chartS, chartE, chartR, chartA;

const vocabulary = {
    comics: { vistos: 'Leídos', viendo: 'Leyendo Actualmente', completado: 'Leído', accion: '+1 Capítulo', unidad: 'Capítulos' },
    series: { vistos: 'Vistos', viendo: 'Viendo Actualmente', completado: 'Visto', accion: '+1 Capítulo', unidad: 'Capítulos' },
    peliculas: { vistos: 'Vistos', viendo: 'Filtro Películas', completado: 'Visto', accion: 'Marcar Visto', unidad: 'Películas' },
    videojuegos: { vistos: 'Sesiones/Horas', viendo: 'Jugando Actualmente', completado: 'Jugado', accion: '🕹️ Jugado', unidad: 'Progreso' }
};

const UI = {
    navActive: 'px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-indigo-600 text-white transition shadow-md cursor-pointer',
    navInactive: 'px-3 py-2 rounded-xl text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer',
    subTabActive: 'px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs shrink-0',
    subTabInactive: 'px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0',
    card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl',
    cardInner: 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-center',
    homeItem: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition',
    mediaCard: 'relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition duration-200 shadow-md',
    textPrimary: 'text-slate-800 dark:text-slate-200',
    textMuted: 'text-slate-600 dark:text-slate-400',
    textDim: 'text-slate-500',
    borderDivider: 'border-slate-200 dark:border-slate-800',
    input: 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800',
    btnGhost: 'bg-slate-100 dark:bg-slate-950 hover:bg-indigo-600/20 text-indigo-400 border border-slate-200 dark:border-slate-800',
    btnSurface: 'bg-slate-200 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950',
    imgPlaceholder: 'bg-slate-200 dark:bg-slate-800',
    overlay: 'bg-white/95 dark:bg-slate-950/95',
    badge: 'bg-white/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800',
    select: 'bg-white dark:bg-slate-950 text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg p-1 max-w-[150px]'
};

function getChartThemeColors() {
    const dark = document.documentElement.classList.contains('dark');
    return {
        grid: dark ? '#1e293b' : '#e2e8f0',
        ticks: dark ? '#94a3b8' : '#64748b',
    };
}

function titleCase(str) {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/(^|[\s,]+)(\w)/g, function(_, sep, c) { return sep + c.toUpperCase(); });
}

window.onThemeChange = () => {
    if (currentTab === 'stats') renderStats();
};

// ==========================================
// 0. CONFIGURACIÓN DE APIs (Panel UI)
// ==========================================
window.toggleAPIPanel = function() {
    const panel = document.getElementById('api-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadAPIPanelData();
};

window.toggleCategoryDropdown = function() {
    document.getElementById('category-dropdown').classList.toggle('hidden');
};

document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('category-dropdown-wrapper');
    const dropdown = document.getElementById('category-dropdown');
    if (wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

window.loadAPIPanelData = function() {
    const keys = window.loadAPIKeys();
    document.getElementById('api-tmdb-key').value = keys.TMDB_KEY || '';
    document.getElementById('api-rawg-key').value = keys.RAWG_KEY || '';
    updateAPIStatusIndicators();
};

window.saveAPIPanel = function() {
    const keys = {
        TMDB_KEY: document.getElementById('api-tmdb-key').value.trim(),
        RAWG_KEY: document.getElementById('api-rawg-key').value.trim(),
    };
    window.saveAPIKeys(keys);
    updateAPIStatusIndicators();
    alert('Configuración de APIs guardada.');
};

function updateAPIStatusIndicators() {
    const tmdbOk = window.API_CONFIG.TMDB_ENABLED;
    const rawgOk = window.API_CONFIG.RAWG_ENABLED;
    const tmdbDot = document.getElementById('api-tmdb-status');
    const rawgDot = document.getElementById('api-rawg-status');
    const tmdbText = document.getElementById('api-tmdb-status-text');
    const rawgText = document.getElementById('api-rawg-status-text');
    const indicator = document.getElementById('api-panel-indicator');

    if (tmdbDot) { tmdbDot.className = `w-2 h-2 rounded-full ${tmdbOk ? 'bg-emerald-400' : 'bg-slate-400'}`; }
    if (rawgDot) { rawgDot.className = `w-2 h-2 rounded-full ${rawgOk ? 'bg-emerald-400' : 'bg-slate-400'}`; }
    if (tmdbText) { tmdbText.innerText = tmdbOk ? 'Configurada' : 'No configurada'; }
    if (rawgText) { rawgText.innerText = rawgOk ? 'Configurada' : 'No configurada'; }
    if (indicator) {
        const anyConfigured = tmdbOk || rawgOk;
        indicator.textContent = anyConfigured ? '⚙️✅' : '⚙️';
    }
}

// ==========================================
// 1. LÓGICA DE AUTENTICACIÓN
// ==========================================
window.iniciarSesion = function() {
    if (isEntornoLocal()) return;
    signInWithPopup(auth, provider).catch(error => console.error("Error Login:", error));
};

window.cerrarSesion = function() {
    if (isEntornoLocal()) return;
    signOut(auth);
};

window.entrarComoInvitado = function() {
    document.title = 'Media Tracker Pro (Invitado)';
    mostrarApp();
    cargarDatosDesdeLocalStorage();
    switchTab('home');
    setTimeout(updateAPIStatusIndicators, 0);
    startStatusChecker();
};

function mostrarApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    const btnSalir = document.querySelector('[onclick="cerrarSesion()"]');
    if (btnSalir) btnSalir.classList.toggle('hidden', isEntornoLocal());
}

async function iniciarAppLocal() {
    document.title = 'Media Tracker Pro (Local)';
    mostrarApp();
    cargarDatosDesdeLocalStorage();
    switchTab('home');
    setTimeout(updateAPIStatusIndicators, 0);
    startStatusChecker();
}

function cargarDatosDesdeLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) mediaData = JSON.parse(raw);
    } catch (e) { console.error("Error al cargar datos locales:", e); }
}

// ==========================================
// 2. SINCRONIZACIÓN CON FIREBASE
// ==========================================
async function cargarDatosDesdeFirebase() {
    try {
        const docRef = doc(db, "usuarios", usuarioActual.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().coleccionMultimedia) {
            mediaData = docSnap.data().coleccionMultimedia;
        } else {
            // MIGRACIÓN: Si la nube está vacía, buscar datos antiguos locales del usuario
            const datosLocales = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (datosLocales) {
                mediaData = datosLocales;
                await window.saveToStorage(); // Lo sube automáticamente
            }
        }
    } catch (e) { console.error("Error al cargar datos:", e); }
}

window.saveToStorage = async function() {
    if (isEntornoLocal()) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mediaData));
        } catch (error) { console.error("Error al guardar en LocalStorage:", error); }
    } else if (usuarioActual) {
        try {
            await setDoc(doc(db, "usuarios", usuarioActual.uid), { coleccionMultimedia: mediaData });
        } catch (error) { console.error("Error al guardar en Firebase:", error); }
    }
    // Actualización de interfaces
    if(currentTab === 'home') { renderHomeView(); }
    else if(currentTab === 'stats') { renderStats(); } 
    else if(currentTab === 'lists') { renderListsView(); }
    else { 
        updateFilterOptions();
        renderCollection(); 
    }
};

// ==========================================
// 3. LÓGICA DE INTERFAZ Y RENDERIZADO (Globalizada para módulos)
// ==========================================

window.exportDataToJSON = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mediaData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `multimedia_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

window.importDataFromJSON = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (parsedData.comics && parsedData.series && parsedData.videojuegos) {
                mediaData = parsedData;
                await window.saveToStorage(); // Obliga la subida a Firebase
                alert('¡Base de datos importada y subida a la nube con éxito!');
                switchTab('home');
            } else { alert('El archivo JSON no tiene el formato correcto.'); }
        } catch (err) { alert('Error al leer el archivo JSON.'); }
    };
    reader.readAsText(file);
};

function updateStateOptions(tab) {
    const select = document.getElementById('form-estado');
    select.innerHTML = '';
    
    if (tab === 'peliculas') {
        select.innerHTML = `
            <option value="No Visto">Por ver</option>
            <option value="Visto">Visto</option>
        `;
    } else if (tab === 'videojuegos') {
        select.innerHTML = `
            <option value="Por Jugar">Por Jugar</option>
            <option value="Jugando">Jugando</option>
            <option value="Jugado">Jugado</option>
        `;
    } else {
        select.innerHTML = `
            <option value="Por emitir">Por empezar / Por emitir</option>
            <option value="En curso">En curso / Emisión</option>
            <option value="Finalizado">Finalizado / Lanzado</option>
        `;
    }
}

window.resetFilters = function() {
    document.getElementById('filter-search').value = "";
    document.getElementById('filter-estado').value = "";
    document.getElementById('filter-genero').value = "";
    document.getElementById('filter-subtipo').value = "";
    document.getElementById('filter-completado').value = "";
    document.getElementById('filter-sort').value = "";
    renderCollection();
};

function updateFilterOptions() {
    const list = mediaData[currentTab] || [];
    
    const genSelect = document.getElementById('filter-genero');
    const subSelect = document.getElementById('filter-subtipo');
    const estSelect = document.getElementById('filter-estado');
    
    const currGen = genSelect.value;
    const currSub = subSelect.value;
    const currEst = estSelect.value;

    const generos = [...new Set(list.flatMap(i => (i.genero || '').split(/,\s*/).map(g => g.trim())).filter(Boolean))].sort();
    const subtipos = [...new Set(list.map(i => titleCase(i.subtipo)).filter(Boolean))].sort();
    const estados = [...new Set(list.map(i => i.estado).filter(Boolean))].sort();

    genSelect.innerHTML = '<option value="">Género: Todos</option>' + generos.map(g => `<option value="${g}">${g}</option>`).join('');
    subSelect.innerHTML = '<option value="">Subtipo: Todos</option>' + subtipos.map(s => `<option value="${s}">${s}</option>`).join('');
    estSelect.innerHTML = '<option value="">Estado: Todos</option>' + estados.map(e => `<option value="${e}">${e}</option>`).join('');

    if (generos.includes(currGen)) genSelect.value = currGen;
    if (subtipos.includes(currSub)) subSelect.value = currSub;
    if (estados.includes(currEst)) estSelect.value = currEst;
}

window.switchTab = function(tab) {
    currentTab = tab;

    const tabLabels = {
        home: { icon: '🏠', label: 'Inicio' },
        comics: { icon: '📚', label: 'Cómics & Manga' },
        series: { icon: '📺', label: 'Series & Anime' },
        peliculas: { icon: '🎬', label: 'Películas' },
        videojuegos: { icon: '🎮', label: 'Videojuegos' },
        lists: { icon: '📋', label: 'Mis Listas' },
        stats: { icon: '📊', label: 'Estadísticas' },
    };
    const info = tabLabels[tab] || tabLabels.home;
    document.getElementById('category-current-icon').textContent = info.icon;
    document.getElementById('category-current-label').textContent = info.label;
    document.getElementById('category-dropdown').classList.add('hidden');

    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-collection').classList.add('hidden');
    document.getElementById('view-stats').classList.add('hidden');
    document.getElementById('view-lists').classList.add('hidden');

    document.getElementById('box-stat-vistos').classList.remove('hidden');
    document.getElementById('box-stat-leyendo').classList.remove('hidden');
    document.getElementById('box-stat-pendientes').classList.remove('hidden');
    document.getElementById('box-stat-completados').classList.remove('hidden');
    document.getElementById('box-stat-abandonados').classList.add('hidden');
    document.getElementById('stats-header-grid').className = "grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6";

    if(tab === 'home') { document.getElementById('view-home').classList.remove('hidden'); renderHomeView(); }
    else if(tab === 'stats') { document.getElementById('view-stats').classList.remove('hidden'); window.switchStatsSubTab(currentStatsSubTab); }
    else if(tab === 'lists') { document.getElementById('view-lists').classList.remove('hidden'); renderListsView(); }
    else {
        document.getElementById('view-collection').classList.remove('hidden');
        
        const plataformaContainer = document.getElementById('container-form-plataforma');
        const ratingContainer = document.getElementById('container-form-rating');
        const unidadesContainer = document.getElementById('container-form-unidades');
        
        if(tab === 'videojuegos') {
            plataformaContainer.classList.remove('hidden');
            unidadesContainer.classList.remove('hidden');
            document.getElementById('form-plataforma').required = true;
            ratingContainer.className = "col-span-1";
            
            document.getElementById('box-stat-vistos').classList.add('hidden');
            document.getElementById('box-stat-abandonados').classList.remove('hidden');
            document.getElementById('stats-header-grid').className = "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6";

        } else if(tab === 'peliculas') {
            plataformaContainer.classList.add('hidden');
            unidadesContainer.classList.add('hidden');
            document.getElementById('form-plataforma').required = false;
            ratingContainer.className = "col-span-2";
            
            document.getElementById('box-stat-vistos').classList.add('hidden');
            document.getElementById('box-stat-pendientes').classList.add('hidden');
            document.getElementById('box-stat-completados').classList.remove('hidden'); 
            document.getElementById('stats-header-grid').className = "grid grid-cols-2 gap-4 md:gap-6 max-w-md";

        } else {
            plataformaContainer.classList.add('hidden');
            unidadesContainer.classList.remove('hidden');
            document.getElementById('form-plataforma').required = false;
            ratingContainer.className = "col-span-2";
            document.getElementById('box-stat-abandonados').classList.remove('hidden');
            document.getElementById('stats-header-grid').className = "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6";
        }

        document.getElementById('gallery-title').innerText = tab === 'comics' ? 'Mis Cómics & Mangas' : tab === 'series' ? 'Mis Series & Anime' : tab === 'peliculas' ? 'Mis Películas' : 'Mis Videojuegos';
        
        const voc = vocabulary[tab];
        document.getElementById('score-vistos-title').innerText = tab === 'peliculas' ? 'Películas Vistas' : `${voc.vistos} Totales`;
        document.getElementById('score-leyendo-title').innerText = tab === 'videojuegos' ? 'En Curso (Jugando)' : tab === 'peliculas' ? 'Por ver' : voc.viendo;
        document.getElementById('score-pendientes-title').innerText = tab === 'videojuegos' ? 'Por Jugar' : `Por Empezar / En Cola`;
        document.getElementById('score-completados-title').innerText = tab === 'videojuegos' ? 'Total Jugados' : `Total Completados`;
        
        document.getElementById('modal-label-totales').innerText = `${voc.unidad} Tot.`;
        document.getElementById('modal-label-vistos').innerText = `${voc.vistos}`;

        window.resetFilters();
        updateFilterOptions();
    }
};

window.switchStatsSubTab = function(subTab) {
    currentStatsSubTab = subTab;
    ['comics', 'series', 'peliculas', 'videojuegos'].forEach(st => {
        const btn = document.getElementById(`sub-btn-${st}`);
        if(btn) btn.className = (st === subTab) ? UI.subTabActive : UI.subTabInactive;
    });
    renderStats();
};

window.toggleFormCapitulos = function() {
    if(currentTab === 'peliculas' || currentTab === 'videojuegos') return;
    const estado = document.getElementById('form-estado').value;
    const inputTotales = document.getElementById('form-totales');
    if(estado === 'En emisión' || estado === 'Por emitir') {
        inputTotales.value = 0;
        inputTotales.disabled = true;
        inputTotales.classList.add('opacity-50');
    } else {
        inputTotales.disabled = false;
        inputTotales.classList.remove('opacity-50');
    }
};

window.openModal = function(mode, id = null) {
    document.getElementById('media-modal').classList.remove('hidden');
    document.getElementById('media-form').reset();
    document.getElementById('form-id').value = '';
    
    updateStateOptions(currentTab);

    if(mode === 'add') {
        document.getElementById('modal-title').innerText = 'Añadir Nuevo Registro';
        document.getElementById('form-rating').value = "0";
        document.getElementById('form-notas').value = "";
        document.getElementById('form-resena').value = "";

        const tituloInput = document.getElementById('form-titulo');
        tituloInput.oninput = function() {
            if (typeof SearchAPIs !== 'undefined') {
                SearchAPIs.search(this.value, currentTab);
            }
        };
    } else if(mode === 'edit') {
        document.getElementById('modal-title').innerText = 'Editar Registro';
        const item = mediaData[currentTab].find(i => i.id === id);
        if(item) {
            document.getElementById('form-id').value = item.id;
            document.getElementById('form-titulo').value = item.titulo;
            document.getElementById('form-subtipo').value = item.subtipo || '';
            document.getElementById('form-genero').value = item.genero || '';
            document.getElementById('form-anio').value = item.anio || '';
            document.getElementById('form-estado').value = item.estado;
            document.getElementById('form-totales').value = item.totales || 0;
            document.getElementById('form-vistos').value = item.vistos || 0;
            document.getElementById('form-portada').value = item.portada;
            document.getElementById('form-rating').value = item.rating || "0";
            document.getElementById('form-plataforma').value = item.plataforma || '';
            document.getElementById('form-notas').value = item.notas || '';
            document.getElementById('form-resena').value = item.resena || '';
        }
    }
};

window.selectSearchResult = function(item) {
    document.getElementById('form-titulo').value = item.titulo || '';
    document.getElementById('form-portada').value = item.portada || '';
    document.getElementById('form-genero').value = item.genero || '';
    document.getElementById('form-anio').value = item.anio || '';
    if (item.subtipo) document.getElementById('form-subtipo').value = item.subtipo;
    if (item.plataforma) document.getElementById('form-plataforma').value = item.plataforma;
    if (item.sinopsis) document.getElementById('form-notas').value = item.sinopsis;

    const externalId = item._anilistId || item._tmdbId || '';
    document.getElementById('form-external-id').value = externalId;

    if (item.apiStatus) {
        document.getElementById('form-estado').value = item.apiStatus;
        if (item.apiStatus === 'En curso') {
            document.getElementById('form-totales').value = 0;
        } else if (item.totales != null) {
            document.getElementById('form-totales').value = item.totales;
        }
    } else if (item.totales != null) {
        document.getElementById('form-totales').value = item.totales;
    }

    if (typeof SearchAPIs !== 'undefined') SearchAPIs.closeDropdown();

    ['form-titulo', 'form-portada', 'form-genero', 'form-anio', 'form-totales', 'form-subtipo', 'form-plataforma', 'form-notas'].forEach(fid => {
        const el = document.getElementById(fid);
        if (el) { el.style.transition = 'background-color 0.4s'; el.style.backgroundColor = 'rgba(99,102,241,0.1)'; setTimeout(() => { el.style.backgroundColor = ''; }, 600); }
    });
};

window.closeModal = function() {
    document.getElementById('media-modal').classList.add('hidden');
    if (typeof SearchAPIs !== 'undefined') SearchAPIs.closeDropdown();
};

window.saveMedia = function(e) {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    const titulo = document.getElementById('form-titulo').value;
    const subtipo = titleCase(document.getElementById('form-subtipo').value);
    const genero = titleCase(document.getElementById('form-genero').value);
    const anio = document.getElementById('form-anio').value;
    let estado = document.getElementById('form-estado').value;
    const rating = document.getElementById('form-rating').value;
    const plataforma = document.getElementById('form-plataforma').value || '';
    let totales = parseInt(document.getElementById('form-totales').value) || 0;
    let vistos = parseInt(document.getElementById('form-vistos').value) || 0;
    let portada = document.getElementById('form-portada').value || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400';
    const notas = document.getElementById('form-notas').value;
    const resena = document.getElementById('form-resena').value;
    const externalId = document.getElementById('form-external-id').value || '';

    if(currentTab === 'peliculas') {
        totales = 1;
        vistos = (estado === 'Visto') ? 1 : 0;
    } else if (currentTab === 'comics' || currentTab === 'series') {
        // BIDIRECCIONAL: Si se guardan cambios y los vistos son menores al total pero estaba finalizado
        if (estado === 'Finalizado' && totales > 0 && vistos < totales) {
            estado = 'En curso';
        }
    }

    if(id) {
        const idx = mediaData[currentTab].findIndex(i => i.id == id);
        if(idx !== -1) {
            const wasFav = mediaData[currentTab][idx].favorito || false;
            mediaData[currentTab][idx] = { id: Number(id), titulo, subtipo, genero, anio, estado, totales, vistos, portada, rating, plataforma, notas, resena, favorito: wasFav, externalId };
        }
    } else {
        mediaData[currentTab].push({ id: Date.now(), titulo, subtipo, genero, anio, estado, totales, vistos, portada, rating, plataforma, notas, resena, favorito: false, externalId });
    }
    window.closeModal();
    window.saveToStorage();
};

window.deleteMedia = function(id) {
    if(confirm('¿Deseas eliminar permanentemente este elemento?')) {
        mediaData[currentTab] = mediaData[currentTab].filter(i => i.id !== id);
        window.saveToStorage();
    }
};

window.toggleFavorito = function(id) {
    const item = mediaData[currentTab].find(i => i.id === id);
    if(item) { item.favorito = !item.favorito; window.saveToStorage(); }
};

window.toggleAbandonado = function(id) {
    const item = mediaData[currentTab].find(i => i.id === id);
    if (!item) return;
    if (item.estado === 'Abandonado') {
        if (currentTab === 'videojuegos') {
            item.estado = 'Por Jugar';
        } else if (currentTab === 'peliculas') {
            item.estado = 'No Visto';
        } else {
            item.estado = 'En curso';
        }
    } else {
        item.estado = 'Abandonado';
    }
    window.saveToStorage();
};

// ==========================================
// CHECKER PERIÓDICO DE ESTADOS
// ==========================================
async function fetchAnilistStatus(anilistId) {
    try {
        const graphql = JSON.stringify({
            query: `query ($id: Int) {
                Media(id: $id, type: MANGA) {
                    status
                    chapters
                }
            }`,
            variables: { id: anilistId },
        });
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: graphql,
        });
        if (!res.ok) return null;
        const json = await res.json();
        const m = json.data?.Media;
        if (!m) return null;
        const mapStatus = (s) => {
            if (s === 'RELEASING') return 'En curso';
            if (s === 'FINISHED') return 'Finalizado';
            if (s === 'HIATUS') return 'En curso';
            return 'Por emitir';
        };
        return { status: mapStatus(m.status), chapters: m.chapters || null };
    } catch (e) { return null; }
}

async function fetchTMDBStatus(tmdbId) {
    try {
        const key = window.API_CONFIG.TMDB_KEY;
        if (!key) return null;
        const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${encodeURIComponent(key)}&language=es-ES`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const mapStatus = (s, inProd) => {
            if (s === 'Returning Series' || s === 'In Production' || inProd) return 'En curso';
            if (s === 'Ended') return 'Finalizado';
            if (s === 'Canceled') return 'Abandonado';
            return 'Por emitir';
        };
        const total = (data.seasons || [])
            .filter(s => s.season_number > 0)
            .reduce((sum, s) => sum + (s.episode_count || 0), 0);
        return { status: mapStatus(data.status, data.in_production), episodes: total || null };
    } catch (e) { return null; }
}

async function checkSeriesStatus() {
    const lastCheck = localStorage.getItem('lastStatusCheck');
    const now = Date.now();
    if (lastCheck && (now - parseInt(lastCheck)) < 24 * 60 * 60 * 1000) return;

    let changed = false;

    for (const cat of ['comics', 'series']) {
        for (const item of mediaData[cat]) {
            if (item.estado !== 'En curso' || !item.externalId) continue;

            let result = null;
            if (cat === 'comics') {
                result = await fetchAnilistStatus(Number(item.externalId));
            } else {
                result = await fetchTMDBStatus(Number(item.externalId));
            }

            if (result && result.status === 'Finalizado') {
                item.estado = 'Finalizado';
                if (cat === 'comics' && result.chapters) item.totales = result.chapters;
                if (cat === 'series' && result.episodes) item.totales = result.episodes;
                changed = true;
            }
        }
    }

    if (changed) window.saveToStorage();
    localStorage.setItem('lastStatusCheck', now.toString());
}

function startStatusChecker() {
    checkSeriesStatus();
    setInterval(checkSeriesStatus, 24 * 60 * 60 * 1000);
}

window.incrementCapitulo = function(id, forceCategory = null) {
    const cat = forceCategory || currentTab;
    const item = mediaData[cat].find(i => i.id === id);
    if(!item) return;

    if (item.estado === 'Abandonado') return;

    if (cat === 'videojuegos') {
        if (item.estado === 'Por Jugar') {
            item.estado = 'Jugando';
            item.vistos = 1; 
        } else if (item.estado === 'Jugando') {
            item.vistos++;
            if(item.totales > 0 && item.vistos >= item.totales) {
                item.estado = 'Jugado';
            } else if (confirm('¿Quieres marcar este juego como completado ("Jugado") ya mismo?')) {
                item.estado = 'Jugado';
            }
        } else if (item.estado === 'Jugado') {
            item.estado = 'Por Jugar';
            item.vistos = 0;
        }
    } else if (cat === 'peliculas') {
        if (item.estado === 'Visto') {
            item.estado = 'No Visto';
            item.vistos = 0;
        } else {
            item.estado = 'Visto';
            item.vistos = 1;
        }
    } else { 
        if (item.totales > 0 && item.vistos >= item.totales) {
            item.vistos = 0;
            item.estado = 'En curso';
        } else {
            item.vistos++;
            if (item.estado === 'Por emitir') {
                item.estado = 'En curso';
            }
            if (item.totales > 0 && item.vistos >= item.totales) {
                item.vistos = item.totales;
                item.estado = 'Finalizado';
            }
        }
    }
    window.saveToStorage();
};

window.toggleCardMenu = function(id) {
    const menu = document.getElementById(`menu-panel-${id}`);
    if (menu) {
        const isHidden = menu.classList.contains('hidden');
        document.querySelectorAll('[id^="menu-panel-"]').forEach(m => m.classList.add('hidden'));
        if (isHidden) menu.classList.remove('hidden');
    }
};

window.createCustomList = function() {
    const name = prompt('Nombre de la lista personalizada:');
    if (name && name.trim() !== '') {
        mediaData.customLists.push({ id: 'list-' + Date.now(), name: name.trim(), items: [] });
        window.saveToStorage();
    }
};
window.deleteCustomList = function(listId) { if(confirm('¿Eliminar lista?')) { mediaData.customLists = mediaData.customLists.filter(l => l.id !== listId); window.saveToStorage(); } };
window.addItemToList = function(listId, selectElement) {
    const val = selectElement.value; if(!val) return;
    const [type, id] = val.split('|');
    const list = mediaData.customLists.find(l => l.id === listId);
    if(list && !list.items.some(i => i.type === type && i.id == id)) { list.items.push({ type, id: Number(id) }); window.saveToStorage(); }
    selectElement.value = '';
};
window.removeItemFromList = function(listId, type, id) {
    const list = mediaData.customLists.find(l => l.id === listId);
    if(list) { list.items = list.items.filter(i => !(i.type === type && i.id === id)); window.saveToStorage(); }
};

function renderHomeView() {
    const categories = ['videojuegos', 'series', 'comics'];
    const containers = { videojuegos: document.getElementById('home-games-container'), series: document.getElementById('home-series-container'), comics: document.getElementById('home-comics-container') };

    categories.forEach(cat => {
        const box = containers[cat]; box.innerHTML = '';
        const activeList = mediaData[cat].filter(item => {
            if(cat === 'videojuegos') return item.estado === 'Jugando';
            const completado = item.totales > 0 && item.vistos >= item.totales;
            return !completado && (item.vistos > 0 || item.estado === 'En curso');
        });

        if(activeList.length === 0) {
            box.innerHTML = `<p class="text-xs ${UI.textDim} italic py-2 col-span-full">No tienes registros en curso en esta sección.</p>`;
            return;
        }

        activeList.forEach(item => {
            const voc = vocabulary[cat];
            const platform = item.plataforma ? `<span class="bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-300 text-[9px] font-mono px-1 py-0.5 rounded">${item.plataforma}</span>` : '';
            const labelInfo = (cat === 'videojuegos') ? `Estado: <b>${item.estado}</b>` : `${voc.vistos}: <b>${item.vistos}</b>`;
            
            let actionBtnText = voc.accion;
            if (item.estado === 'Abandonado') actionBtnText = '🚫 Abandonado';
            else if (cat === 'videojuegos' && item.estado === 'Jugando') actionBtnText = '🕹️ Jugado';

            const div = document.createElement('div');
            div.className = UI.homeItem;
            const isAbandonedHome = item.estado === 'Abandonado';
            div.innerHTML = `
                <img src="${item.portada}" class="w-10 h-14 object-cover rounded-md ${UI.imgPlaceholder} shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold ${UI.textPrimary} truncate" title="${item.titulo}">${item.titulo}</h4>
                    <div class="flex items-center gap-2 mt-1">${platform}<p class="text-[10px] ${UI.textMuted} font-mono">${labelInfo}</p></div>
                    ${isAbandonedHome
                        ? `<button class="mt-2 w-full bg-rose-100 dark:bg-rose-950 text-rose-400 border border-rose-200 dark:border-rose-900 text-[10px] py-1 rounded-lg font-mono cursor-not-allowed opacity-60">${actionBtnText}</button>`
                        : `<button onclick="incrementCapitulo(${item.id}, '${cat}')" class="mt-2 w-full ${UI.btnGhost} text-[10px] py-1 rounded-lg font-mono transition cursor-pointer">${actionBtnText}</button>`
                    }
                </div>
            `;
            box.appendChild(div);
        });
    });
}

window.renderCollection = function() {
    const container = document.getElementById('media-container'); container.innerHTML = '';
    const rawList = mediaData[currentTab] || []; 
    const voc = vocabulary[currentTab];
    
    let statVistos = 0, statLeyendo = 0, statPendientes = 0, statCompletados = 0, statAbandonados = 0;
    rawList.forEach(item => {
        if (currentTab === 'peliculas') {
            if (item.estado === 'Visto') statCompletados++; else statLeyendo++; 
        } else if (currentTab === 'videojuegos') {
            if (item.estado === 'Abandonado') statAbandonados++;
            else if (item.estado === 'Por Jugar') statPendientes++; 
            else if (item.estado === 'Jugando') statLeyendo++; 
            else statCompletados++;
            statVistos += item.vistos;
        } else {
            statVistos += item.vistos;
            if (item.estado === 'Abandonado') { statAbandonados++; return; }
            if (item.totales > 0 && item.vistos >= item.totales) {
                statCompletados++;
            } else if (item.vistos > 0) {
                statLeyendo++;
            } else {
                statPendientes++;
            }
        }
    });
    document.getElementById('stat-vistos').innerText = statVistos;
    document.getElementById('stat-leyendo').innerText = statLeyendo;
    document.getElementById('stat-pendientes').innerText = statPendientes;
    document.getElementById('stat-completados').innerText = statCompletados;
    document.getElementById('stat-abandonados').innerText = statAbandonados;

    const fSearch = document.getElementById('filter-search').value.toLowerCase();
    const fEstado = document.getElementById('filter-estado').value;
    const fGenero = document.getElementById('filter-genero').value;
    const fSubtipo = document.getElementById('filter-subtipo').value;
    const fCompletado = document.getElementById('filter-completado').value;

    const listToDisplay = rawList.filter(item => {
        let match = true;
        if(fSearch && !item.titulo.toLowerCase().includes(fSearch)) match = false;
        if(fEstado && item.estado !== fEstado) match = false;
        if(fGenero && !(item.genero || '').split(/,\s*/).map(g => g.trim()).includes(fGenero)) match = false;
        if(fSubtipo && item.subtipo !== fSubtipo) match = false;
        
        if(fCompletado) {
            const isCompleted = (currentTab === 'peliculas' && item.estado === 'Visto') ||
                                (currentTab === 'videojuegos' && item.estado === 'Jugado') ||
                                (item.totales > 0 && item.vistos >= item.totales);
            if(fCompletado === 'si' && !isCompleted) match = false;
            if(fCompletado === 'no' && isCompleted) match = false;
        }
        return match;
    });

    const filterCountEl = document.getElementById('filter-count');
    if(rawList.length !== listToDisplay.length) {
        filterCountEl.innerText = `Mostrando ${listToDisplay.length} de ${rawList.length} registros.`;
        filterCountEl.classList.remove('hidden');
    } else { filterCountEl.classList.add('hidden'); }

    const fSort = document.getElementById('filter-sort').value;
    if (fSort) {
        listToDisplay.sort((a, b) => {
            if (fSort === 'nombre-asc') return a.titulo.localeCompare(b.titulo);
            if (fSort === 'nombre-desc') return b.titulo.localeCompare(a.titulo);
            if (fSort === 'anio-asc') return (parseInt(a.anio) || 0) - (parseInt(b.anio) || 0);
            if (fSort === 'anio-desc') return (parseInt(b.anio) || 0) - (parseInt(a.anio) || 0);
            if (fSort === 'estado') {
                const order = { 'En curso': 0, 'Jugando': 1, 'Por Jugar': 2, 'No Visto': 3, 'Por emitir': 4, 'Finalizado': 5, 'Visto': 6, 'Jugado': 7, 'Abandonado': 8 };
                return (order[a.estado] ?? 99) - (order[b.estado] ?? 99);
            }
            return 0;
        });
    }

    listToDisplay.forEach(item => {
        let tagEstado = ''; 
        let colorTag = '';

        if (currentTab === 'peliculas') {
            if (item.estado === 'Visto') { tagEstado = 'Visto'; colorTag = 'bg-purple-600/95 text-white'; } 
            else { tagEstado = 'Por ver'; colorTag = 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'; }
        } else if (currentTab === 'videojuegos') {
            if (item.estado === 'Por Jugar') { tagEstado = 'Por Jugar'; colorTag = 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'; }
            else if (item.estado === 'Jugando') { tagEstado = 'Jugando'; colorTag = 'bg-amber-500 text-slate-950 font-bold'; }
            else if (item.estado === 'Abandonado') { tagEstado = 'Abandonado'; colorTag = 'bg-rose-600 text-white'; }
            else { tagEstado = 'Jugado'; colorTag = 'bg-purple-600 text-white'; }
        } else {
            if (item.totales > 0 && item.vistos >= item.totales) { 
                tagEstado = voc.completado; 
                colorTag = 'bg-purple-600'; 
            } else if (item.estado === 'Abandonado') { 
                tagEstado = 'Abandonado'; 
                colorTag = 'bg-rose-600 text-white'; 
            } else if (item.vistos > 0) { 
                tagEstado = (currentTab === 'comics') ? 'Leyendo' : 'Viendo'; 
                colorTag = 'bg-blue-500'; 
            } else { 
                tagEstado = 'En Cola'; 
                colorTag = 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'; 
            }
        }

        let rating = (item.rating && item.rating !== "0") ? `<span class="absolute top-1.5 left-1.5 ${UI.badge} backdrop-blur-md text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center">⭐ ${item.rating}</span>` : '';
        const favActive = item.favorito ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400';
        const favBadge = item.favorito ? `<span class="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[8px] font-extrabold px-1.5 rounded shadow-sm">FAV</span>` : '';
        const platform = item.plataforma ? `<span class="absolute bottom-1.5 left-1.5 ${UI.badge} text-indigo-600 dark:text-indigo-300 text-[9px] font-mono px-1.5 py-0.5 rounded">${item.plataforma}</span>` : '';
        const anioBadge = item.anio ? `<span class="absolute bottom-1.5 right-1.5 bg-white/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-300 text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">${item.anio}</span>` : '';
        const noteIndicator = (item.notas || item.resena) ? `<span class="text-indigo-400 ml-1 text-[10px]" title="Tiene notas guardadas">📝</span>` : '';

        const card = document.createElement('div');
        card.className = UI.mediaCard;
        
        let actionBtnText = voc.accion;
        if (item.estado === 'Abandonado') {
            actionBtnText = '🚫 Abandonado';
        } else if(currentTab === 'videojuegos' && item.estado === 'Por Jugar') {
            actionBtnText = '🎮 Empezar Juego';
        } else if(currentTab === 'videojuegos' && item.estado === 'Jugando') {
            actionBtnText = '🕹️ Jugado';
        } else if(currentTab === 'videojuegos' && item.estado === 'Jugado') {
            actionBtnText = '🔄 Reiniciar Estado';
        } else if(currentTab === 'peliculas') {
            actionBtnText = item.estado === 'Visto' ? '❌ Desmarcar' : '👁️ Marcar Visto';
        } else if((currentTab === 'comics' || currentTab === 'series') && (item.totales > 0 && item.vistos >= item.totales)) {
            actionBtnText = '🔄 Reiniciar Avance';
        }

        const isAbandonado = item.estado === 'Abandonado';
        let actionBtn = isAbandonado
            ? `<button class="mt-2 w-full bg-rose-100 dark:bg-rose-950 text-rose-400 border border-rose-200 dark:border-rose-900 font-medium text-[11px] py-1.5 rounded-xl transition font-mono cursor-not-allowed opacity-60">${actionBtnText}</button>`
            : `<button onclick="incrementCapitulo(${item.id})" class="mt-2 w-full ${UI.btnGhost} font-medium text-[11px] py-1.5 rounded-xl transition font-mono cursor-pointer">${actionBtnText}</button>`;

        let footerInfo = '';
        if(currentTab === 'comics' || currentTab === 'series') {
            let resta = (item.totales > 0 && item.vistos >= item.totales) ? 0 : (item.totales > 0 ? item.totales - item.vistos : '???');
            footerInfo = `<div class="flex justify-between text-[10px] ${UI.textMuted} font-mono"><span>Prog: <b>${item.vistos}</b></span><span>Faltan: <b>${resta}</b></span></div>`;
        } else if(currentTab === 'videojuegos') {
            footerInfo = `<div class="flex justify-between text-[10px] ${UI.textMuted} font-mono"><span>Sesiones/Hrs: <b>${item.vistos}</b></span><span>Meta: <b>${item.totales || 'Libre'}</b></span></div>`;
        } else {
            footerInfo = `<div class="text-[10px] ${UI.textDim} font-mono italic text-center">Película Única</div>`;
        }

        card.innerHTML = `
            <div class="aspect-[3/4] ${UI.imgPlaceholder} relative overflow-hidden">
                <img src="${item.portada}" class="w-full h-full object-cover">
                ${rating} ${favBadge} ${platform} ${anioBadge}
                <span class="absolute top-1.5 right-1.5 ${colorTag} text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-md">${tagEstado}</span>
                
                <button onclick="toggleCardMenu(${item.id})" class="absolute bottom-1.5 right-1.5 ${UI.badge} px-2 py-0.5 rounded-lg text-[10px] ${UI.textPrimary} hover:bg-slate-100 dark:hover:bg-slate-800 transition z-10 cursor-pointer">⚙️ Menú</button>

                <div id="menu-panel-${item.id}" class="hidden absolute inset-0 ${UI.overlay} flex flex-col items-center justify-center space-y-2 px-3 z-20">
                    <button onclick="toggleCardMenu(${item.id})" class="absolute top-2 right-2 ${UI.textMuted} hover:text-slate-900 dark:hover:text-white text-xs p-1 cursor-pointer">❌ Cerrar</button>
                    <div class="flex space-x-1 w-full pt-4">
                        <button onclick="openModal('edit', ${item.id})" class="flex-1 py-1.5 ${UI.btnSurface} rounded-xl text-[11px] font-semibold text-amber-600 dark:text-amber-400 cursor-pointer">Editar</button>
                        <button onclick="deleteMedia(${item.id})" class="flex-1 py-1.5 ${UI.btnSurface} hover:bg-rose-600 hover:text-white rounded-xl text-[11px] font-semibold text-rose-500 cursor-pointer">Borrar</button>
                    </div>
                    <button onclick="toggleFavorito(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl ${favActive} cursor-pointer">❤️ Favorito</button>
                    ${currentTab !== 'peliculas' ? (item.estado !== 'Abandonado' 
                        ? `<button onclick="toggleAbandonado(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl text-rose-400 cursor-pointer">🚫 Abandonar</button>`
                        : `<button onclick="toggleAbandonado(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl text-emerald-400 cursor-pointer">▶️ Reanudar</button>`
                    ) : ''}
                </div>
            </div>
            <div class="p-3 flex flex-col justify-between flex-1 gap-1">
                <div>
                    <h4 class="font-bold text-xs truncate ${UI.textPrimary}" title="${item.titulo}">${item.titulo}${noteIndicator}</h4>
                    <p class="text-[10px] ${UI.textMuted} truncate">${item.genero || 'Sin género'} • <span class="${UI.textDim}">${titleCase(item.subtipo) || 'General'}</span></p>
                </div>
                <div class="mt-1">
                    ${footerInfo}
                    ${actionBtn}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

function renderListsView() {
    const wrapper = document.getElementById('lists-wrapper'); wrapper.innerHTML = '';
    let allFavs = [];
    ['comics', 'series', 'peliculas', 'videojuegos'].forEach(t => {
        if(mediaData[t]) mediaData[t].forEach(i => { if(i.favorito) allFavs.push({...i, type: t}); });
    });

    const favDiv = document.createElement('div');
    favDiv.className = UI.card;
    let fHtml = `<div class="flex justify-between items-center border-b ${UI.borderDivider} pb-2"><h3 class="text-sm font-bold text-amber-400">❤️ Mis Favoritos Globales</h3><span class="text-xs bg-amber-400/10 text-amber-400 px-2 rounded">${allFavs.length}</span></div>`;
    if(!allFavs.length) fHtml += `<p class="text-xs ${UI.textDim}">Sin favoritos mapeados.</p>`;
    else {
        fHtml += `<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">`;
        allFavs.forEach(f => { fHtml += `<div class="${UI.cardInner}"><img src="${f.portada}" class="aspect-[3/4] w-full object-cover rounded-lg"><p class="text-[10px] truncate text-slate-700 dark:text-slate-300 mt-1">${f.titulo}</p></div>`; });
        fHtml += `</div>`;
    }
    favDiv.innerHTML = fHtml; wrapper.appendChild(favDiv);

    let optionsHtml = `<option value="">+ Añadir a la lista...</option>`;
    ['comics', 'series', 'peliculas', 'videojuegos'].forEach(type => {
        if(mediaData[type]?.length) {
            optionsHtml += `<optgroup label="${type.toUpperCase()}">`;
            mediaData[type].forEach(i => { optionsHtml += `<option value="${type}|${i.id}">${i.titulo}</option>`; });
            optionsHtml += `</optgroup>`;
        }
    });

    mediaData.customLists.forEach(list => {
        const listDiv = document.createElement('div');
        listDiv.className = UI.card;
        let itemsHtml = (!list.items.length) ? `<p class="text-xs ${UI.textDim}">Lista vacía.</p>` : `<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">`;
        list.items.forEach(ref => {
            const actualItem = mediaData[ref.type]?.find(i => i.id === ref.id);
            if(actualItem) itemsHtml += `<div class="${UI.cardInner} relative group"><img src="${actualItem.portada}" class="aspect-[3/4] w-full object-cover rounded-lg"><button onclick="removeItemFromList('${list.id}', '${ref.type}', ${ref.id})" class="absolute inset-1.5 bg-rose-950/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition text-[10px] font-bold cursor-pointer">Quitar</button><p class="text-[10px] truncate text-slate-700 dark:text-slate-300 mt-1">${actualItem.titulo}</p></div>`;
        });
        if(list.items.length) itemsHtml += `</div>`;

        listDiv.innerHTML = `<div class="flex justify-between items-center border-b ${UI.borderDivider} pb-2"><div class="flex items-center gap-2"><h4 class="text-xs md:text-sm font-bold ${UI.textPrimary}">📋 ${list.name}</h4><button onclick="deleteCustomList('${list.id}')" class="text-[10px] text-rose-500 cursor-pointer">Eliminar</button></div><select onchange="addItemToList('${list.id}', this)" class="${UI.select}">${optionsHtml}</select></div>${itemsHtml}`;
        wrapper.appendChild(listDiv);
    });
}

function renderStats() {
    const list = mediaData[currentStatsSubTab] || [];
    let generoMap = {}; let subtipoMap = {}; let anioMap = {};
    let estadoCounts = { 'En Curso': 0, 'Completados': 0, 'Pendientes': 0, 'Abandonados': 0 };
    
    let starLabels = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'];
    let ratingMap = { '0.5': 0, '1': 0, '1.5': 0, '2': 0, '2.5': 0, '3': 0, '3.5': 0, '4': 0, '4.5': 0, '5': 0 };

    document.getElementById('chart-title-2').innerText = (currentStatsSubTab === 'videojuegos') ? "Distribución por Plataformas" : "Distribución por Subtipos / Formatos";

    list.forEach(item => {
        const generos = (item.genero || 'No definido').split(/,\s*/).map(g => g.trim()).filter(Boolean);
        generos.forEach(g => {
            generoMap[g] = (generoMap[g] || 0) + 1;
        });

        if (currentStatsSubTab === 'videojuegos') {
            const plataformas = (item.plataforma || 'Sin Hardware').split(/,\s*/).map(p => p.trim()).filter(Boolean);
            plataformas.forEach(p => {
                subtipoMap[p] = (subtipoMap[p] || 0) + 1;
            });
        } else {
            const subKey = item.subtipo || 'No definido';
            subtipoMap[subKey] = (subtipoMap[subKey] || 0) + 1;
        }

        if(item.anio) { anioMap[item.anio] = (anioMap[item.anio] || 0) + 1; }

        if (currentStatsSubTab === 'peliculas') {
            if (item.estado === 'Visto') estadoCounts['Completados']++;
            else estadoCounts['En Curso']++;
        } else if (currentStatsSubTab === 'videojuegos') {
            if (item.estado === 'Por Jugar') estadoCounts['Pendientes']++;
            else if (item.estado === 'Jugando') estadoCounts['En Curso']++;
            else estadoCounts['Completados']++;
        } else {
            if (item.estado === 'Abandonado') { estadoCounts['Abandonados']++; }
            else if (item.totales > 0 && item.vistos >= item.totales) estadoCounts['Completados']++;
            else if (item.estado === 'En curso' || item.vistos > 0) estadoCounts['En Curso']++;
            else estadoCounts['Pendientes']++;
        }

        if (item.rating && item.rating !== "0") {
            let rStr = String(item.rating).replace('.0', '');
            if (ratingMap[rStr] !== undefined) { ratingMap[rStr]++; }
        }
    });

    if (chartC) chartC.destroy();
    if (chartS) chartS.destroy();
    if (chartE) chartE.destroy();
    if (chartR) chartR.destroy();
    if (chartA) chartA.destroy();

    const chartColors = getChartThemeColors();
    const legendOpts = { position: 'bottom', labels: { color: chartColors.ticks, font: { size: 9 } } };
    const barScaleOpts = {
        y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.ticks, stepSize: 1 } },
        x: { ticks: { color: chartColors.ticks } }
    };

    const gLabels = Object.keys(generoMap);
    chartC = new Chart(document.getElementById('chartConcepto'), {
        type: 'doughnut',
        data: { labels: gLabels.length ? gLabels : ['Sin registros'], datasets: [{ data: gLabels.length ? Object.values(generoMap) : [1], backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: legendOpts } }
    });

    const sLabels = Object.keys(subtipoMap);
    chartS = new Chart(document.getElementById('chartSubtipo'), {
        type: 'doughnut',
        data: { labels: sLabels.length ? sLabels : ['Sin datos'], datasets: [{ data: sLabels.length ? Object.values(subtipoMap) : [1], backgroundColor: ['#06b6d4', '#ec4899', '#34d399', '#f43f5e', '#a855f7'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: legendOpts } }
    });

    const labelEstadoCurso = currentStatsSubTab === 'peliculas' ? 'Por ver' : 'En Curso';
    chartE = new Chart(document.getElementById('chartEstado'), {
        type: 'bar',
        data: { labels: [labelEstadoCurso, 'Completados', 'Pendientes', 'Abandonados'], datasets: [{ data: [estadoCounts['En Curso'], estadoCounts['Completados'], estadoCounts['Pendientes'], estadoCounts['Abandonados']], backgroundColor: ['#3b82f6', '#a855f7', '#64748b', '#e11d48'], borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: barScaleOpts, plugins: { legend: { display: false } } }
    });

    chartR = new Chart(document.getElementById('chartRating'), {
        type: 'bar',
        data: { labels: starLabels.map(l => `${l} ⭐`), datasets: [{ label: 'Obras', data: starLabels.map(l => ratingMap[l]), backgroundColor: '#f59e0b', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { ...barScaleOpts, x: { ticks: { color: chartColors.ticks, font: { size: 9 } } } }, plugins: { legend: { display: false } } }
    });

    const sortedYears = Object.keys(anioMap).sort((a, b) => parseInt(a) - parseInt(b));
    chartA = new Chart(document.getElementById('chartAnios'), {
        type: 'bar',
        data: { labels: sortedYears.length ? sortedYears : ['Sin fechas'], datasets: [{ label: 'Lanzamientos', data: sortedYears.length ? sortedYears.map(y => anioMap[y]) : [0], backgroundColor: '#10b981', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { ...barScaleOpts, x: { ticks: { color: chartColors.ticks, font: { size: 10 } } } }, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// INICIALIZACIÓN (al final para que todas las window.* estén definidas)
// ==========================================
if (isEntornoLocal()) {
    iniciarAppLocal();
} else {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            usuarioActual = user;
            mostrarApp();
            await cargarDatosDesdeFirebase();
            switchTab('home');
            setTimeout(updateAPIStatusIndicators, 0);
            startStatusChecker();
        } else {
            usuarioActual = null;
            mediaData = { comics: [], series: [], peliculas: [], videojuegos: [], customLists: [] };
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    });
}
