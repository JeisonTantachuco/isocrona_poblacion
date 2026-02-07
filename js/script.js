// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const SUPABASE_URL = 'https://hkaondldeifdjtnyjezk.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW9uZGxkZWlmZGp0bnlqZXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjgwODMsImV4cCI6MjA4NTgwNDA4M30.Mf1Fk_XFsmDjSy75IGeVR3Xy8pBec7764BySiLDgqt4';

// Inicializamos el cliente de Supabase
// (La librería ya se cargó en el HTML, aquí la usamos)
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. INICIALIZAR MAPA Y CAPAS
// ==========================================

// --- Definir Mapas Base ---

// 1. Mapa Claro (CartoDB) - El que tenías
const capaCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    maxZoom: 20
});

// 2. Mapa Satelital (Esri World Imagery) - Muy buena calidad gratis
const capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 19
});

// 3. Google Maps (Híbrido: Satélite + Calles)
const capaGoogle = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

// --- Crear el Mapa ---
// Iniciamos centrado y con la capa 'capaCarto' por defecto
const map = L.map('map', {
    center: [-12.046674378764054, -77.04233704332704], // Coordenadas iniciales  
    zoom: 12,
    layers: [capaCarto] // Aquí decidimos cuál se ve primero
});

// --- Agregar el Control de Capas (La cajita arriba derecha) ---
const baseMaps = {
    "Mapa Claro": capaCarto,
    "Satélite (Esri)": capaSatelite,
    "Google Híbrido": capaGoogle
};

// Esto crea el botón desplegable automáticamente
L.control.layers(baseMaps).addTo(map);

// Variables globales para los dibujos
let capaIsocrona = null;   // El polígono verde
let marcadorInicio = null; // El pin donde haces clic

// ==========================================
// 3. LÓGICA DEL CLIC
// ==========================================
// ==========================================
// 3. LÓGICA DEL CLIC
// ==========================================
map.on('click', async function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // 1. GESTIÓN DEL MARCADOR (NUEVO)
    // ------------------------------------------------
    // Si ya existe un marcador, lo quitamos para poner el nuevo
    if (marcadorInicio) {
        map.removeLayer(marcadorInicio);
    }
    
    // Creamos el nuevo marcador y lo agregamos al mapa
    marcadorInicio = L.marker([lat, lng]).addTo(map);
    
    // Opcional: Agregar un popup chiquito que diga "Inicio"
    marcadorInicio.bindPopup("<b>Punto de Inicio</b><br>Calculando...").openPopup();
    // ------------------------------------------------

    // Obtener valor del input del HTML
    const inputMinutos = document.getElementById('minutos');
    const tiempo = parseInt(inputMinutos.value);

    // Validar...
    if (!tiempo || tiempo <= 0) {
        alert("Por favor ingresa un tiempo válido");
        return;
    }

    actualizarInterfazInicio();

    try {
        // ... (el resto de tu código sigue igual: llamada a supabase, etc)
        const { data, error } = await _supabase.functions.invoke('obtener-isocrona', {
            body: { lat, lng, time_minutes: tiempo }
        });

        if (error) throw error;
        procesarExito(data);

    } catch (err) {
        procesarError(err);
    }
});

// ==========================================
// 4. FUNCIONES AUXILIARES (Para mantener orden)
// ==========================================

function actualizarInterfazInicio() {
    // Cambiar textos a "Cargando..."
    const estado = document.getElementById('estado');
    const poblacion = document.getElementById('poblacion');
    
    estado.innerText = "Conectando con satélites...";
    estado.className = "loading";
    poblacion.innerText = "...";

    // Borrar dibujo anterior si existe
    if (capaIsocrona) {
        map.removeLayer(capaIsocrona);
    }
}

function procesarExito(data) {
    const estado = document.getElementById('estado');
    const poblacion = document.getElementById('poblacion');

    // 1. Mostrar Textos
    poblacion.innerText = data.poblacion.toLocaleString(); // Pone puntos de miles
    estado.innerText = "Cálculo completado.";
    estado.className = "";

    // 2. Dibujar Polígono
    capaIsocrona = L.geoJSON(data.geojson, {
        style: {
            color: '#24b47e',   // Borde verde
            weight: 2,
            fillColor: '#24b47e',
            fillOpacity: 0.2    // Relleno transparente
        }
    }).addTo(map);

    // Hacer zoom al polígono nuevo
    map.fitBounds(capaIsocrona.getBounds());

    // 3. Abrir sidebar automáticamente en móviles para mostrar resultados
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        sidebar.classList.add('active');
        sidebarToggle.classList.add('active'); // El botón también se mueve
    }
}

function procesarError(err) {
    console.error("Error detallado:", err);
    document.getElementById('estado').innerText = "Ocurrió un error.";
    document.getElementById('poblacion').innerText = "Error";
    alert("Error: " + (err.message || "Revisa la consola"));
}

// ==========================================
// 5. RESPONSIVE - TOGGLE SIDEBAR EN MÓVILES
// ==========================================
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('active');
    sidebarToggle.classList.toggle('active'); // El botón también se mueve
});

// Cerrar sidebar cuando se hace clic en el mapa (solo en móviles)
map.on('click', function() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active'); // El botón vuelve a su posición
    }
});