// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const SUPABASE_URL = 'https://hkaondldeifdjtnyjezk.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW9uZGxkZWlmZGp0bnlqZXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjgwODMsImV4cCI6MjA4NTgwNDA4M30.Mf1Fk_XFsmDjSy75IGeVR3Xy8pBec7764BySiLDgqt4';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. INICIALIZAR MAPA Y CAPAS
// ==========================================

const capaCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    maxZoom: 20
});

const capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 19
});

const capaGoogle = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

const map = L.map('map', {
    center: [-12.046674378764054, -77.04233704332704], 
    zoom: 12,
    layers: [capaGoogle]
});

const baseMaps = {
    "Mapa Claro": capaCarto,
    "Satélite (Esri)": capaSatelite,
    "Google Híbrido": capaGoogle
};

L.control.layers(baseMaps).addTo(map);

// VARIABLES GLOBALES
let capaIsocrona = null;
let marcadorInicio = null;
// NUEVAS VARIABLES DE ESTADO PARA IDIOMA
let isCalculating = false; 
let calculationDone = false; // Para saber si ya terminamos y mantener el mensaje de "Completado"

// ==========================================
// 3. LÓGICA DEL CLIC
// ==========================================
map.on('click', async function(e) {
    const t = translations[window.currentLang]; // Acceso rápido al diccionario

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // 1. GESTIÓN DEL MARCADOR
    if (marcadorInicio) {
        map.removeLayer(marcadorInicio);
    }
    
    marcadorInicio = L.marker([lat, lng]).addTo(map);
    
    // Marcamos que empieza el cálculo
    isCalculating = true;
    calculationDone = false;
    
    // Actualizamos el popup con el idioma actual
    actualizarPopupMarker(); 
    marcadorInicio.openPopup();

    // Obtener valor del input
    const inputMinutos = document.getElementById('minutos');
    const tiempo = parseInt(inputMinutos.value);

    // Validar
    if (!tiempo || tiempo <= 0) {
        alert(t.alert_invalid_time); // Usando traducción
        isCalculating = false;
        actualizarPopupMarker();
        return;
    }

    actualizarInterfazInicio();

    try {
        const { data, error } = await _supabase.functions.invoke('obtener-isocrona', {
            body: { lat, lng, time_minutes: tiempo }
        });

        if (error) throw error;
        
        // Todo salió bien
        isCalculating = false;
        calculationDone = true;
        procesarExito(data);

    } catch (err) {
        isCalculating = false;
        procesarError(err);
    }
    
    // Al finalizar (éxito o error), actualizamos el popup para quitar "Calculando..."
    actualizarPopupMarker();
});

// ==========================================
// 4. FUNCIONES AUXILIARES
// ==========================================

// --- NUEVA FUNCIÓN: Actualiza el texto del popup según el estado ---
function actualizarPopupMarker() {
    if (!marcadorInicio) return;

    const t = translations[window.currentLang];
    
    // Título base
    let contenido = `<b>${t.popup_start}</b>`;
    
    // Si está calculando, agregamos la segunda línea
    if (isCalculating) {
        contenido += `<br>${t.popup_calculating}`;
    }

    // Si el popup ya existe y está abierto, actualizamos contenido
    if (marcadorInicio.getPopup()) {
        marcadorInicio.getPopup().setContent(contenido);
    } else {
        marcadorInicio.bindPopup(contenido);
    }
}

function actualizarInterfazInicio() {
    const t = translations[window.currentLang];
    const estado = document.getElementById('estado');
    const poblacion = document.getElementById('poblacion');
    
    estado.innerText = t.status_calculating;
    estado.className = "loading";
    poblacion.innerText = "...";

    if (capaIsocrona) {
        map.removeLayer(capaIsocrona);
    }
}

function procesarExito(data) {
    const t = translations[window.currentLang];
    const estado = document.getElementById('estado');
    const poblacion = document.getElementById('poblacion');

    // Guardamos el dato numérico en un atributo para poder traducirlo luego si cambia idioma
    poblacion.dataset.value = data.poblacion; 

    // Mostrar textos
    poblacion.innerText = data.poblacion.toLocaleString();
    estado.innerText = t.status_done;
    estado.className = "";

    // Dibujar Polígono
    capaIsocrona = L.geoJSON(data.geojson, {
        style: {
            color: '#24b47e',
            weight: 2,
            fillColor: '#24b47e',
            fillOpacity: 0.2
        }
    }).addTo(map);

    map.fitBounds(capaIsocrona.getBounds());

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        sidebar.classList.add('active');
        sidebarToggle.classList.add('active');
    }
}

function procesarError(err) {
    const t = translations[window.currentLang];
    console.error("Error detallado:", err);
    
    document.getElementById('estado').innerText = t.status_error;
    document.getElementById('poblacion').innerText = t.status_pop_error;
    
    alert(t.alert_generic_error + (err.message || "Check console"));
}

// ==========================================
// 5. EVENTO DE CAMBIO DE IDIOMA (NUEVO)
// ==========================================
// Este evento viene de i18n.js cuando pulsas la bandera
window.addEventListener('languageChanged', function(e) {
    const t = translations[window.currentLang];

    // 1. Actualizar Popup del Mapa
    actualizarPopupMarker();

    // 2. Actualizar textos de resultado (Estado y Población)
    // Solo si no estamos calculando en este momento
    if (!isCalculating) {
        const estado = document.getElementById('estado');
        const poblacion = document.getElementById('poblacion');

        if (calculationDone) {
            // Si ya terminó un cálculo previo
            estado.innerText = t.status_done;
            // Si tenemos un valor guardado, nos aseguramos que el formato numérico sea correcto
            // (A veces el formato de miles cambia entre inglés/español, aunque aquí usamos toLocaleString simple)
            if (poblacion.dataset.value) {
                poblacion.innerText = parseInt(poblacion.dataset.value).toLocaleString();
            }
        } else {
            // Si estamos en estado inicial (o error), dejamos que i18n.js maneje el texto inicial
            // O podemos forzar el texto de error si hubo uno
            if (poblacion.innerText === t.status_pop_error) { 
                 // Mantener mensaje de error traducido si fuera necesario
            }
        }
    } else {
        // Si justo cambias de idioma MIENTRAS calcula
        document.getElementById('estado').innerText = t.status_calculating;
    }
});


// ==========================================
// 6. RESPONSIVE
// ==========================================
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('active');
    sidebarToggle.classList.toggle('active');
});

map.on('click', function() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
    }
});