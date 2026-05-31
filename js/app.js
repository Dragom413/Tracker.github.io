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
// 0. MENÚ DE CATEGORÍAS
// ==========================================
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

// ==========================================
// 1. LÓGICA DE AUTENTICACIÓN
// ==========================================
window.iniciarSesion = function() {
    if (isEntornoLocal()) return;
    signInWithPopup(auth, provider).catch(error => console.error("Error Login:", error));
};

window.cerrarSesion = function() {
    if (!isEntornoLocal() && usuarioActual) {
        signOut(auth);
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
};

window.entrarComoInvitado = function() {
    document.title = 'Media Tracker Pro (Invitado)';
    mostrarApp();
    cargarDatosDesdeLocalStorage();
    switchTab('home');
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
            <option value="Por ver">Por ver</option>
            <option value="Visto">Visto</option>
        `;
    } else if (tab === 'videojuegos') {
        select.innerHTML = `
            <option value="Por Jugar">Por Jugar</option>
            <option value="Jugando">Jugando</option>
            <option value="Jugado">Jugado</option>
            <option value="Pausado">Pausado</option>
            <option value="Abandonado">Abandonado</option>
        `;
    } else if (tab === 'comics') {
        select.innerHTML = `
            <option value="Por leer">Por leer</option>
            <option value="Leyendo">Leyendo</option>
            <option value="Leído">Leído</option>
            <option value="Pausado">Pausado</option>
            <option value="Abandonado">Abandonado</option>
        `;
    } else {
        select.innerHTML = `
            <option value="Por ver">Por ver</option>
            <option value="Viendo">Viendo</option>
            <option value="Visto">Visto</option>
            <option value="Pausado">Pausado</option>
            <option value="Abandonado">Abandonado</option>
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
    document.getElementById('box-stat-pausados').classList.add('hidden');
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
            document.getElementById('box-stat-pausados').classList.remove('hidden');
            document.getElementById('stats-header-grid').className = "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6";

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
            document.getElementById('box-stat-pausados').classList.remove('hidden');
            document.getElementById('stats-header-grid').className = "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6";
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
    // Siempre habilitado: Por leer/Por ver no implica emisión, la obra puede estar terminada
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

        const apiSourceContainer = document.getElementById('modal-api-source-container');
        if (currentTab === 'comics') {
            apiSourceContainer.classList.remove('hidden');
            document.getElementById('modal-api-source').value = 'anilist';
        } else {
            apiSourceContainer.classList.add('hidden');
        }

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

    const externalId = item._anilistId || item._tmdbId || item._comicvineId || '';
    document.getElementById('form-external-id').value = externalId;

    if (item.apiStatus) {
        document.getElementById('form-estado').value = item.apiStatus;
        if (item.totales != null) {
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
        if ((currentTab === 'comics' && estado === 'Leído' && totales > 0 && vistos < totales) ||
            (currentTab === 'series' && estado === 'Visto' && totales > 0 && vistos < totales)) {
            estado = currentTab === 'comics' ? 'Leyendo' : 'Viendo';
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
            item.estado = 'Por ver';
        } else if (currentTab === 'comics') {
            item.estado = 'Leyendo';
        } else {
            item.estado = 'Viendo';
        }
    } else {
        item.estado = 'Abandonado';
    }
    window.saveToStorage();
};

window.togglePausado = function(id) {
    const item = mediaData[currentTab].find(i => i.id === id);
    if (!item) return;
    if (item.estado === 'Pausado') {
        if (currentTab === 'videojuegos') {
            item.estado = 'Jugando';
        } else if (currentTab === 'comics') {
            item.estado = 'Leyendo';
        } else {
            item.estado = 'Viendo';
        }
    } else {
        item.estado = 'Pausado';
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
            if (s === 'RELEASING') return 'Por leer';
            if (s === 'FINISHED') return 'Leído';
            if (s === 'HIATUS') return 'Por leer';
            return 'Por leer';
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
            if (s === 'Returning Series' || s === 'In Production' || inProd) return 'Por ver';
            if (s === 'Ended') return 'Visto';
            if (s === 'Canceled') return 'Abandonado';
            return 'Por ver';
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
        const estadoCurso = cat === 'comics' ? 'Leyendo' : 'Viendo';
        const estadoCompletado = cat === 'comics' ? 'Leído' : 'Visto';
        for (const item of mediaData[cat]) {
            if (item.estado !== estadoCurso || !item.externalId) continue;

            let result = null;
            if (cat === 'comics') {
                result = await fetchAnilistStatus(Number(item.externalId));
            } else {
                result = await fetchTMDBStatus(Number(item.externalId));
            }

            if (result && (result.status === 'Leído' || result.status === 'Visto')) {
                item.estado = estadoCompletado;
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

    if (item.estado === 'Abandonado' || item.estado === 'Pausado') return;

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
            item.estado = 'Por ver';
            item.vistos = 0;
        } else {
            item.estado = 'Visto';
            item.vistos = 1;
        }
    } else {
        const estadoCurso = cat === 'comics' ? 'Leyendo' : 'Viendo';
        const estadoCompletado = cat === 'comics' ? 'Leído' : 'Visto';
        const estadoPorEmpezar = cat === 'comics' ? 'Por leer' : 'Por ver';
        if (item.totales > 0 && item.vistos >= item.totales) {
            item.vistos = 0;
            item.estado = estadoCurso;
        } else {
            item.vistos++;
            if (item.estado === estadoPorEmpezar) {
                item.estado = estadoCurso;
            }
            if (item.totales > 0 && item.vistos >= item.totales) {
                item.vistos = item.totales;
                item.estado = estadoCompletado;
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
            if (item.estado === 'Pausado' || item.estado === 'Abandonado') return false;
            const completado = item.totales > 0 && item.vistos >= item.totales;
            return !completado && item.vistos > 0;
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
            else if (item.estado === 'Pausado') actionBtnText = '⏸️ Pausado';
            else if (cat === 'videojuegos' && item.estado === 'Jugando') actionBtnText = '🕹️ Jugado';

            const div = document.createElement('div');
            div.className = UI.homeItem;
            const isBlockedHome = item.estado === 'Abandonado' || item.estado === 'Pausado';
            const blockColor = item.estado === 'Abandonado' ? 'bg-rose-100 dark:bg-rose-950 text-rose-400 border border-rose-200 dark:border-rose-900' : 'bg-amber-100 dark:bg-amber-950 text-amber-500 border border-amber-200 dark:border-amber-900';
            div.innerHTML = `
                <img src="${item.portada}" class="w-10 h-14 object-cover rounded-md ${UI.imgPlaceholder} shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold ${UI.textPrimary} truncate" title="${item.titulo}">${item.titulo}</h4>
                    <div class="flex items-center gap-2 mt-1">${platform}<p class="text-[10px] ${UI.textMuted} font-mono">${labelInfo}</p></div>
                    ${isBlockedHome
                        ? `<button class="mt-2 w-full ${blockColor} text-[10px] py-1 rounded-lg font-mono cursor-not-allowed opacity-60">${actionBtnText}</button>`
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
    
    let statVistos = 0, statLeyendo = 0, statPendientes = 0, statCompletados = 0, statAbandonados = 0, statPausados = 0;
    rawList.forEach(item => {
        if (currentTab === 'peliculas') {
            if (item.estado === 'Visto') statCompletados++; else statLeyendo++; 
        } else if (currentTab === 'videojuegos') {
            if (item.estado === 'Abandonado') statAbandonados++;
            else if (item.estado === 'Pausado') statPausados++;
            else if (item.estado === 'Por Jugar') statPendientes++; 
            else if (item.estado === 'Jugando') statLeyendo++; 
            else statCompletados++;
            statVistos += item.vistos;
        } else {
            statVistos += item.vistos;
            if (item.estado === 'Abandonado') { statAbandonados++; return; }
            if (item.estado === 'Pausado') { statPausados++; return; }
            if (item.estado === 'Leído' || item.estado === 'Visto') {
                statCompletados++;
            } else if (item.totales > 0 && item.vistos >= item.totales) {
                statCompletados++;
            } else if (item.estado === 'Leyendo' || item.estado === 'Viendo' || item.vistos > 0) {
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
    document.getElementById('stat-pausados').innerText = statPausados;

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
                let order;
                if (currentTab === 'comics') {
                    order = { 'Por leer': 0, 'Leyendo': 1, 'Leído': 2, 'Pausado': 3, 'Abandonado': 4 };
                } else if (currentTab === 'series') {
                    order = { 'Por ver': 0, 'Viendo': 1, 'Visto': 2, 'Pausado': 3, 'Abandonado': 4 };
                } else if (currentTab === 'peliculas') {
                    order = { 'Por ver': 0, 'Visto': 1 };
                } else if (currentTab === 'videojuegos') {
                    order = { 'Por Jugar': 0, 'Jugando': 1, 'Jugado': 2, 'Pausado': 3, 'Abandonado': 4 };
                } else {
                    order = {};
                }
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
            else if (item.estado === 'Pausado') { tagEstado = 'Pausado'; colorTag = 'bg-amber-700 text-white'; }
            else if (item.estado === 'Abandonado') { tagEstado = 'Abandonado'; colorTag = 'bg-rose-600 text-white'; }
            else { tagEstado = 'Jugado'; colorTag = 'bg-purple-600 text-white'; }
        } else {
            if (item.totales > 0 && item.vistos >= item.totales) { 
                tagEstado = voc.completado; 
                colorTag = 'bg-purple-600'; 
            } else if (item.estado === 'Pausado') { 
                tagEstado = 'Pausado'; 
                colorTag = 'bg-amber-700 text-white'; 
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
        } else if (item.estado === 'Pausado') {
            actionBtnText = '⏸️ Pausado';
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
        const isPausado = item.estado === 'Pausado';
        let actionBtn = (isAbandonado || isPausado)
            ? `<button class="mt-2 w-full ${isAbandonado ? 'bg-rose-100 dark:bg-rose-950 text-rose-400 border border-rose-200 dark:border-rose-900' : 'bg-amber-100 dark:bg-amber-950 text-amber-500 border border-amber-200 dark:border-amber-900'} font-medium text-[11px] py-1.5 rounded-xl transition font-mono cursor-not-allowed opacity-60">${actionBtnText}</button>`
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
                <img src="${item.portada}" class="${currentTab === 'videojuegos' ? 'game-cover' : 'w-full h-full object-cover'}">
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
                    ${currentTab !== 'peliculas' ? `
                        <button onclick="togglePausado(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl ${item.estado === 'Pausado' ? 'text-emerald-400' : 'text-amber-500'} cursor-pointer">${item.estado === 'Pausado' ? '▶️ Reanudar' : '⏸️ Pausar'}</button>
                        ${item.estado !== 'Abandonado' 
                            ? `<button onclick="toggleAbandonado(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl text-rose-400 cursor-pointer">🚫 Abandonar</button>`
                            : `<button onclick="toggleAbandonado(${item.id})" class="w-full py-1.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-bold rounded-xl text-emerald-400 cursor-pointer">▶️ Reanudar</button>`
                        }
                    ` : ''}
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
    renderRecommendations();
    let allFavs = [];
    ['comics', 'series', 'peliculas', 'videojuegos'].forEach(t => {
        if(mediaData[t]) mediaData[t].forEach(i => { if(i.favorito) allFavs.push({...i, type: t}); });
    });

    const favDiv = document.createElement('div');
    favDiv.className = UI.card;
    let fHtml = `<div class="flex justify-between items-center border-b ${UI.borderDivider} pb-2"><h3 class="text-sm font-bold text-amber-400">❤️ Mis Favoritos Globales</h3><span class="text-xs bg-amber-400/10 text-amber-400 px-2 rounded">${allFavs.length}</span></div>`;
    if(!allFavs.length) fHtml += `<p class="text-xs ${UI.textDim}">Sin favoritos mapeados.</p>`;
    else {
        fHtml += `<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">`;
        allFavs.forEach(f => { fHtml += `<div class="text-center"><img src="${f.portada}" class="aspect-[3/4] w-full object-cover rounded-lg ${UI.imgPlaceholder}"><p class="text-[9px] truncate text-slate-700 dark:text-slate-300 mt-0.5">${f.titulo}</p></div>`; });
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
        let itemsHtml = (!list.items.length) ? `<p class="text-xs ${UI.textDim}">Lista vacía.</p>` : `<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">`;
        list.items.forEach(ref => {
            const actualItem = mediaData[ref.type]?.find(i => i.id === ref.id);
            if(actualItem) itemsHtml += `<div class="relative group"><img src="${actualItem.portada}" class="aspect-[3/4] w-full object-cover rounded-lg ${UI.imgPlaceholder}"><button onclick="removeItemFromList('${list.id}', '${ref.type}', ${ref.id})" class="absolute inset-1 bg-rose-950/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition text-[9px] font-bold cursor-pointer">Quitar</button><p class="text-[9px] truncate text-slate-700 dark:text-slate-300 mt-0.5">${actualItem.titulo}</p></div>`;
        });
        if(list.items.length) itemsHtml += `</div>`;

        listDiv.innerHTML = `<div class="flex justify-between items-center border-b ${UI.borderDivider} pb-2"><div class="flex items-center gap-2"><h4 class="text-xs md:text-sm font-bold ${UI.textPrimary}">📋 ${list.name}</h4><button onclick="deleteCustomList('${list.id}')" class="text-[10px] text-rose-500 cursor-pointer">Eliminar</button></div><select onchange="addItemToList('${list.id}', this)" class="${UI.select}">${optionsHtml}</select></div>${itemsHtml}`;
        wrapper.appendChild(listDiv);
    });
}

function renderStats() {
    const list = mediaData[currentStatsSubTab] || [];
    let generoMap = {}; let subtipoMap = {}; let anioMap = {};
    let estadoCounts = { 'En Curso': 0, 'Completados': 0, 'Pendientes': 0, 'Abandonados': 0, 'Pausados': 0 };
    
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
            else if (item.estado === 'Pausado') estadoCounts['Pausados']++;
            else if (item.estado === 'Abandonado') estadoCounts['Abandonados']++;
            else estadoCounts['Completados']++;
        } else {
            if (item.estado === 'Abandonado') { estadoCounts['Abandonados']++; }
            else if (item.estado === 'Pausado') { estadoCounts['Pausados']++; }
            else if (item.totales > 0 && item.vistos >= item.totales) estadoCounts['Completados']++;
            else if (item.estado === 'Leído' || item.estado === 'Visto') estadoCounts['Completados']++;
            else if (item.estado === 'Leyendo' || item.estado === 'Viendo' || item.vistos > 0) estadoCounts['En Curso']++;
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
        data: { labels: [labelEstadoCurso, 'Completados', 'Pendientes', 'Pausados', 'Abandonados'], datasets: [{ data: [estadoCounts['En Curso'], estadoCounts['Completados'], estadoCounts['Pendientes'], estadoCounts['Pausados'], estadoCounts['Abandonados']], backgroundColor: ['#3b82f6', '#a855f7', '#64748b', '#f59e0b', '#e11d48'], borderRadius: 6 }] },
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
// SISTEMA DE RECOMENDACIONES
// ==========================================
const REC_CACHE_KEY = 'multimedia-recommendations';
const MAX_REFRESHES = 3;
const REFRESH_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 horas

function getRecCache() {
    try { return JSON.parse(localStorage.getItem(REC_CACHE_KEY) || 'null'); } catch (e) { return null; }
}

function saveRecCache(cache) {
    localStorage.setItem(REC_CACHE_KEY, JSON.stringify(cache));
}

function getTopGenres(category) {
    const items = mediaData[category] || [];
    const rated = items.filter(i => i.rating && i.rating !== '0');
    if (!rated.length) return null;

    const genreWeight = {};
    rated.forEach(item => {
        const weight = parseFloat(item.rating) || 1;
        (item.genero || '').split(/,\s*/).map(g => g.trim()).filter(Boolean).forEach(g => {
            genreWeight[g] = (genreWeight[g] || 0) + weight;
        });
    });

    const sorted = Object.entries(genreWeight).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : null;
}

function getTopSeriesNames(category, count) {
    const items = mediaData[category] || [];
    return items
        .filter(i => i.rating && i.rating !== '0')
        .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
        .slice(0, count)
        .map(i => i.titulo);
}

async function fetchComicVineBySeriesNames(names) {
    let allResults = [];
    for (const name of names) {
        const results = await fetchComicVineRecommendations(name);
        allResults = allResults.concat(results);
    }
    return filterNewItems('comics', allResults).slice(0, 8);
}

const TMDB_GENRE_NAME_TO_ID = {
    'Acción': 28, 'Aventura': 12, 'Animación': 16, 'Comedia': 35, 'Crimen': 80,
    'Documental': 99, 'Drama': 18, 'Familiar': 10751, 'Fantasía': 14, 'Historia': 36,
    'Terror': 27, 'Música': 10402, 'Misterio': 9648, 'Romance': 10749,
    'Ciencia Ficción': 878, 'Suspense': 53, 'Bélico': 10752, 'Western': 37,
    'Acción y Aventura': 10759, 'Infantil': 10762,
};

const RAWG_GENRE_SLUGS = {
    'Acción': 'action', 'Aventura': 'adventures', 'Comedia': 'casual',
    'Estrategia': 'strategy', 'RPG': 'role-playing-games-rpg',
    'Deportes': 'sports', 'Carreras': 'racing', 'Puzzle': 'puzzle',
    'Terror': 'horror', 'Simulación': 'simulation', 'Indie': 'indie',
    'Arcade': 'arcade', 'Plataformas': 'platformers', 'Lucha': 'fighting',
};

async function fetchAnilistRecommendations(genre, type, page = 1) {
    const graphql = JSON.stringify({
        query: `query ($genre: String, $page: Int) {
            Page(page: $page, perPage: 10) {
                media(genre: $genre, type: ${type}, sort: POPULARITY_DESC, countryOfOrigin: "JP") {
                    title { romaji, english }
                    coverImage { large }
                    genres
                    startDate { year }
                    ${type === 'MANGA' ? 'chapters' : 'episodes'}
                    format
                    description(asHtml: false)
                }
            }
        }`,
        variables: { genre, page },
    });

    const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: graphql,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.Page?.media || []).map(m => ({
        titulo: m.title.english || m.title.romaji,
        portada: m.coverImage.large,
        genero: (m.genres || []).join(', '),
        anio: m.startDate.year || '',
    }));
}

async function fetchComicVineRecommendations(query, page = 1) {
    const key = window.API_CONFIG.COMICVINE_KEY;
    if (!key) return [];

    const apiUrl = `https://comicvine.gamespot.com/api/search/?api_key=${encodeURIComponent(key)}&format=json&resources=volume&query=${encodeURIComponent(query)}&page=${page}`;
    const url = `https://corsproxy.io/?url=${encodeURIComponent(apiUrl)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).filter(r => r.name).slice(0, 10).map(r => ({
            titulo: r.name || '',
            portada: r.image?.super_url || r.image?.medium_url || r.image?.original_url || r.image?.thumb_url || '',
            genero: '',
            anio: r.start_year || '',
        }));
    } catch (e) {
        console.warn('[MULTIMEDIA.io] Error Comic Vine recommendations:', e);
        return [];
    }
}

async function fetchTMDBRecommendations(genreName, page = 1) {
    const genreId = TMDB_GENRE_NAME_TO_ID[genreName];
    if (!genreId) return [];
    const key = window.API_CONFIG.TMDB_KEY;
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&language=es-ES&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).slice(0, 10).map(r => ({
        titulo: r.title,
        portada: r.poster_path ? 'https://image.tmdb.org/t/p/w500' + r.poster_path : '',
        genero: (r.genre_ids || []).map(id => {
            const map = { 28:'Acción',12:'Aventura',16:'Animación',35:'Comedia',80:'Crimen',99:'Documental',18:'Drama',10751:'Familiar',14:'Fantasía',36:'Historia',27:'Terror',10402:'Música',9648:'Misterio',10749:'Romance',878:'Ciencia Ficción',53:'Suspense',10752:'Bélico',37:'Western' };
            return map[id] || '';
        }).filter(Boolean).join(', '),
        anio: (r.release_date || '').substring(0, 4),
    }));
}

const TMDB_TV_GENRE_NAME_TO_ID = {
    'Acción y Aventura': 10759, 'Animación': 16, 'Comedia': 35, 'Crimen': 80,
    'Documental': 99, 'Drama': 18, 'Familiar': 10751, 'Infantil': 10762,
    'Misterio': 9648, 'Noticias': 10763, 'Reality': 10764, 'Ciencia Ficción': 878,
    'Soap': 10766, 'Talk': 10767, 'Guerra y Política': 10768, 'Western': 37,
    'Acción': 10759, 'Aventura': 10759, 'Terror': 9648, 'Suspenso': 9648,
    'Romance': 18, 'Fantasía': 18, 'Historia': 18,
};

async function fetchTMDBSeriesRecommendations(genreName, page = 1) {
    const genreId = TMDB_TV_GENRE_NAME_TO_ID[genreName];
    if (!genreId) return [];
    const key = window.API_CONFIG.TMDB_KEY;
    const url = `https://api.themoviedb.org/3/discover/tv?api_key=${key}&language=es-ES&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=50&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).slice(0, 10).map(r => ({
        titulo: r.name,
        portada: r.poster_path ? 'https://image.tmdb.org/t/p/w500' + r.poster_path : '',
        genero: (r.genre_ids || []).map(id => {
            const map = { 10759:'Acción y Aventura',16:'Animación',35:'Comedia',80:'Crimen',99:'Documental',18:'Drama',10751:'Familiar',10762:'Infantil',9648:'Misterio',878:'Ciencia Ficción',10768:'Guerra y Política',37:'Western' };
            return map[id] || '';
        }).filter(Boolean).join(', '),
        anio: (r.first_air_date || '').substring(0, 4),
    }));
}

async function fetchRAWGRecommendations(genreSlug, page = 1) {
    const key = window.API_CONFIG.RAWG_KEY;
    const url = `https://api.rawg.io/api/games?key=${key}&genres=${genreSlug}&ordering=-rating&page_size=10&exclude_additions=true&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).map(r => ({
        titulo: r.name,
        portada: (r.background_image || '') + '?trim=fit&w=400',
        genero: (r.genres || []).map(g => g.name).join(', '),
        anio: (r.released || '').substring(0, 4),
    }));
}

function filterNewItems(category, results) {
    const existing = (mediaData[category] || []).map(i => i.titulo.toLowerCase());
    return results.filter(r => !existing.includes(r.titulo.toLowerCase())).slice(0, 8);
}

async function getRecommendations() {
    const cache = getRecCache();
    const topGenres = {};

    ['comics', 'series', 'peliculas', 'videojuegos'].forEach(cat => {
        topGenres[cat] = getTopGenres(cat);
    });

    const hasAnyGenre = Object.values(topGenres).some(Boolean);
    if (!hasAnyGenre) return null;

    const startPage = (cache && cache.page) || 1;
    const data = {};

    async function fillCategory(genre, fetchFn, category) {
        let allResults = [];
        for (let p = startPage; p <= startPage + 3 && allResults.length < 8; p++) {
            const results = await fetchFn(genre, p);
            const newItems = filterNewItems(category, results);
            allResults = allResults.concat(newItems);
            if (results.length < 5) break;
        }
        return allResults.slice(0, 8);
    }

    if (topGenres.comics) {
        data.comics_anilist = await fillCategory(topGenres.comics, (g, p) => fetchAnilistRecommendations(g, 'MANGA', p), 'comics');
        const topNames = getTopSeriesNames('comics', 5);
        if (topNames.length) {
            data.comics_cv = await fetchComicVineBySeriesNames(topNames);
        }
    }
    if (topGenres.series) {
        data.series = await fillCategory(topGenres.series, (g, p) => fetchTMDBSeriesRecommendations(g, p), 'series');
    }
    if (topGenres.peliculas) {
        data.peliculas = await fillCategory(topGenres.peliculas, (g, p) => fetchTMDBRecommendations(g, p), 'peliculas');
    }
    if (topGenres.videojuegos) {
        const genreSlug = RAWG_GENRE_SLUGS[topGenres.videojuegos] || 'action';
        data.videojuegos = await fillCategory(genreSlug, (g, p) => fetchRAWGRecommendations(g, p), 'videojuegos');
    }

    const newCache = {
        data,
        topGenres,
        timestamp: Date.now(),
        refreshCount: cache ? cache.refreshCount : 0,
        page: startPage,
    };
    saveRecCache(newCache);
    return newCache;
}

function canRefresh() {
    if (isEntornoLocal()) return true;
    const cache = getRecCache();
    if (!cache) return false;
    const isExpired = (Date.now() - cache.timestamp) > REFRESH_WINDOW_MS;
    if (isExpired) return true;
    return cache.refreshCount < MAX_REFRESHES;
}

window.forceRefreshRecommendations = async function() {
    if (!canRefresh()) return;
    if (!isEntornoLocal()) {
        const cache = getRecCache();
        if (cache) cache.refreshCount++;
        saveRecCache(cache || { refreshCount: 1, timestamp: Date.now(), data: {}, topGenres: {}, page: 1 });
    }

    const currentCache = getRecCache();
    const nextPage = currentCache ? ((currentCache.page || 1) % 3) + 1 : 1;
    const tempCache = getRecCache() || {};
    tempCache.page = nextPage;
    saveRecCache(tempCache);

    const recs = await getRecommendations();
    if (recs && !isEntornoLocal()) {
        const cache = getRecCache();
        recs.refreshCount = cache ? cache.refreshCount : 1;
        saveRecCache(recs);
    }
    renderRecommendations();
};

async function renderRecommendations() {
    const container = document.getElementById('recommendations-container');
    if (!container) return;

    let cache = getRecCache();
    const hasAnyGenre = ['comics', 'series', 'peliculas', 'videojuegos'].some(cat => getTopGenres(cat));

    if (!hasAnyGenre) {
        container.innerHTML = '';
        return;
    }

    if (!cache) {
        container.innerHTML = `<div class="${UI.card}"><div class="flex justify-between items-center border-b ${UI.borderDivider} pb-2"><h3 class="text-sm font-bold text-indigo-400">✨ Recomendaciones para ti</h3><span class="text-[10px] ${UI.textDim}">Generando...</span></div><div class="flex justify-center py-8"><div class="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full"></div></div></div>`;
        cache = await getRecommendations();
        if (!cache) { container.innerHTML = ''; return; }
    }

    const isExpired = (Date.now() - cache.timestamp) > REFRESH_WINDOW_MS;
    const isLocal = isEntornoLocal();
    const refreshesLeft = isLocal ? '∞' : (isExpired ? MAX_REFRESHES : Math.max(0, MAX_REFRESHES - (cache.refreshCount || 0)));
    const canRefreshNow = isLocal || refreshesLeft > 0 || isExpired;

    const genreLabels = Object.entries(cache.topGenres || {}).filter(([, v]) => v).map(([, v]) => v);
    const timeAgo = getTimeAgo(cache.timestamp);

    let html = `<div class="${UI.card}">`;
    html += `<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b ${UI.borderDivider} pb-2 gap-2">`;
    html += `<div><h3 class="text-sm font-bold text-indigo-400">✨ Recomendaciones para ti</h3>`;
    if (genreLabels.length) html += `<p class="text-[10px] ${UI.textDim}">Basado en: ${genreLabels.join(', ')}</p>`;
    html += `</div>`;
    html += `<div class="flex items-center gap-2">`;
    html += `<span class="text-[10px] ${UI.textDim}">${timeAgo}${isLocal ? '' : ' · ' + refreshesLeft + '/' + MAX_REFRESHES}</span>`;
    html += `<button onclick="forceRefreshRecommendations()" ${canRefreshNow ? '' : 'disabled'} class="text-[10px] px-2 py-1 rounded-lg ${canRefreshNow ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 cursor-pointer' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'} transition">🔄 Actualizar</button>`;
    html += `</div></div>`;

    const filteredData = {};
    for (const [cat, items] of Object.entries(cache.data || {})) {
        filteredData[cat] = filterNewItems(cat, items);
    }

    const categories = [
        { key: 'comics_anilist', icon: '📚', label: 'Cómics - Manga/Manhwa' },
        { key: 'comics_cv', icon: '📚', label: 'Cómics - Marvel/DC/Image' },
        { key: 'series', icon: '📺', label: 'Series' },
        { key: 'peliculas', icon: '🎬', label: 'Películas' },
        { key: 'videojuegos', icon: '🎮', label: 'Videojuegos' },
    ];

    categories.forEach(({ key, icon, label }) => {
        const items = filteredData[key] || [];
        const genre = cache.topGenres?.[key] || cache.topGenres?.comics;
        if (!items.length) return;
        const recId = `rec-${key}`;
        html += `<div class="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">`;
        html += `<button onclick="document.getElementById('${recId}').classList.toggle('hidden'); this.querySelector('.rec-arrow').classList.toggle('rotate-90')" class="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer">`;
        html += `<div class="flex items-center gap-2"><span class="text-[10px] rec-arrow transition-transform">▶</span><span class="text-[10px] font-bold ${UI.textMuted}">${icon} ${label}${genre ? ` (${genre})` : ''}</span></div>`;
        html += `<span class="text-[9px] ${UI.textDim}">${items.length} resultados</span>`;
        html += `</button>`;
        html += `<div id="${recId}" class="hidden px-3 py-2">`;
        html += `<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">`;
        items.forEach(item => {
            html += `<div class="cursor-pointer hover:opacity-80 transition" onclick="window.addRecommendation('${item.titulo.replace(/'/g, "\\'")}', '${key}', '${(item.portada || '').replace(/'/g, "\\'")}', '${(item.genero || '').replace(/'/g, "\\'")}', '${item.anio || ''}')">`;
            html += `<img src="${item.portada}" class="${key === 'videojuegos' ? 'game-cover' : 'aspect-[3/4] w-full object-cover rounded-lg'} ${UI.imgPlaceholder}" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400'">`;
            html += `<p class="text-[9px] truncate text-slate-700 dark:text-slate-300 mt-0.5">${item.titulo}</p>`;
            html += `</div>`;
        });
        html += `</div></div></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
}

window.addRecommendation = async function(titulo, category, portada, genero, anio) {
    const actualCategory = category.replace('_anilist', '').replace('_cv', '');
    const existingItem = (mediaData[actualCategory] || []).find(i => i.titulo.toLowerCase() === titulo.toLowerCase());
    if (existingItem) {
        alert(`"${titulo}" ya está en tu colección de ${actualCategory}.`);
        return;
    }

    const defaultStates = {
        comics: 'Por leer',
        series: 'Por ver',
        peliculas: 'Por ver',
        videojuegos: 'Por Jugar',
    };
    const defaultState = defaultStates[actualCategory] || 'Por leer';

    if (!confirm(`¿Añadir "${titulo}" a ${actualCategory}?\nEstado: ${defaultState}`)) return;

    let totales = 0;
    let externalId = '';
    let subtipo = '';

    if (actualCategory === 'comics' || actualCategory === 'series') {
        try {
            const type = actualCategory === 'comics' ? 'MANGA' : 'ANIME';
            const graphql = JSON.stringify({
                query: `query ($search: String) {
                    Media(search: $search, type: ${type}) {
                        id
                        ${type === 'MANGA' ? 'chapters' : 'episodes'}
                        format
                        status
                    }
                }`,
                variables: { search: titulo },
            });
            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: graphql,
            });
            if (res.ok) {
                const json = await res.json();
                const m = json.data?.Media;
                if (m) {
                    externalId = m.id || '';
                    subtipo = m.format || '';
                    const isOngoing = m.status === 'RELEASING' || m.status === 'HIATUS';
                    if (isOngoing) {
                        totales = 0;
                    } else {
                        totales = (type === 'MANGA' ? m.chapters : m.episodes) || 0;
                    }
                }
            }
        } catch (e) { /* Sin conexión, se queda totales=0 */ }
    }

    const newItem = {
        id: Date.now(),
        titulo,
        subtipo,
        genero: genero || '',
        anio: anio || '',
        estado: defaultState,
        totales,
        vistos: 0,
        portada: portada || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400',
        rating: '0',
        plataforma: '',
        notas: '',
        resena: '',
        favorito: false,
        externalId: String(externalId),
    };

    mediaData[actualCategory].push(newItem);
    window.saveToStorage();
    const totalesInfo = totales > 0 ? ` (${totales} ${actualCategory === 'comics' ? 'capítulos' : 'episodios'})` : ' (sin total conocido)';
    alert(`"${titulo}" añadido a ${actualCategory} como "${defaultState}"${actualCategory === 'comics' || actualCategory === 'series' ? totalesInfo : ''}.`);
};

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
            startStatusChecker();
        } else {
            usuarioActual = null;
            mediaData = { comics: [], series: [], peliculas: [], videojuegos: [], customLists: [] };
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    });
}
