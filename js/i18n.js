/* js/i18n.js */

/* js/i18n.js */
const translations = {
    es: {
        // ... (html) ...
        page_title: "Mapa de Isocronas y Población",
        main_title: "Análisis de Población",
        label_time: "Tiempo de viaje (minutos):",
        results_title: "Resultados",
        status_initial: "Haz clic en el mapa para calcular.",
        est_population: "Habitantes estimados",
        // ...
        
        // --- NUEVOS PARA EL SCRIPT ---
        popup_start: "Punto de Inicio",
        popup_calculating: "Calculando...",
        status_calculating: "Calculando...",
        status_done: "Cálculo completado.",
        status_error: "Ocurrió un error.",
        status_pop_error: "Error",
        alert_invalid_time: "Por favor ingresa un tiempo válido",
        alert_generic_error: "Error: "
    },
    en: {
        // ... (html) ...
        page_title: "Isochrone & Population Map",
        main_title: "Population Analysis",
        label_time: "Travel time (minutes):",
        results_title: "Results",
        status_initial: "Click on the map to calculate.",
        est_population: "Estimated population",
        // ...

        // --- NUEVOS PARA EL SCRIPT ---
        popup_start: "Start Point",
        popup_calculating: "Calculating...",
        status_calculating: "Calculating...",
        status_done: "Calculation complete.",
        status_error: "An error occurred.",
        status_pop_error: "Error",
        alert_invalid_time: "Please enter a valid time",
        alert_generic_error: "Error: "
    }
};


window.currentLang = 'es';

function setLanguage(lang) {
    window.currentLang = lang;
    
    // 1. Actualizar textos estáticos (HTML)
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.innerText = translations[lang][key];
        }
    });

    // 2. Actualizar botones
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${lang}'`)) {
            btn.classList.add('active');
        }
    });

    // 3. DISPARAR UN EVENTO PERSONALIZADO
    // Esto avisa a script.js que el idioma cambió
    const event = new CustomEvent('languageChanged', { detail: lang });
    window.dispatchEvent(event);
}