let panZoomInstance;
const SVG_URL = 'https://cdn.jsdelivr.net/gh/netopalma5412/ArchivoNvoSVG1@master/Desktop/ArchivoNvoSVG/PinarAI5.svg';

document.addEventListener('DOMContentLoaded', async () => {
    await loadMap();
    listenToSupabaseChanges();
});

async function loadMap() {
    try {
        const res = await fetch(SVG_URL);
        const svgText = await res.text();
        const mapContainer = document.getElementById('map-container');
        mapContainer.innerHTML = svgText;

        // Initialize Pan/Zoom
        panZoomInstance = svgPanZoom('#map-container svg', {
            zoomEnabled: true,
            controlIconsEnabled: false,
            zoomScaleSensitivity: 0.8,
            minZoom: 0.3,
            maxZoom: 100,
            panEnabled: true,
            dblClickZoomEnabled: false,
            preventMouseEventsDefault: true
        });

        // Add visual controls manually (since we disabled default ones)
        addZoomControls();

        // Fetch current active houses to color on load
        await fetchAndColorizeActiveHouses();

        // Draw the route (base + active) on initial load
        if (window.calculateAndDrawRoute) {
            await window.calculateAndDrawRoute();
        }

    } catch (error) {
        console.error('Error al cargar el mapa SVG:', error);
    }
}

function addZoomControls() {
    const controlsHtml = `
        <div id="map-controls" class="hidden" style="position: absolute; bottom: 80px; right: 20px; z-index: 30; display: flex; flex-direction: column; gap: 10px; pointer-events: auto;">
            <button class="auth-btn" id="ctrl-zoom-in" style="font-size: 20px; padding: 8px 20px; background: rgba(0,0,0,0.7); color: white;">+</button>
            <button class="auth-btn" id="ctrl-zoom-out" style="font-size: 20px; padding: 8px 20px; background: rgba(0,0,0,0.7); color: white;">-</button>
            <button class="auth-btn" id="ctrl-zoom-reset" style="font-size: 18px; padding: 8px 20px; background: rgba(0,0,0,0.7); color: white;">R</button>
        </div>
    `;
    // We append to map-container or directly to body, but body is fine as long as z-index is high.
    // Better to append to ui-layer
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
        uiLayer.insertAdjacentHTML('beforeend', controlsHtml);
    } else {
        document.body.insertAdjacentHTML('beforeend', controlsHtml);
    }

    // Add robust listeners for both mouse and touch
    const doZoomIn = () => { if (panZoomInstance) panZoomInstance.zoom(panZoomInstance.getZoom() * 1.5); };
    const doZoomOut = () => { if (panZoomInstance) panZoomInstance.zoom(panZoomInstance.getZoom() * 0.66); };
    const doZoomReset = () => { if (panZoomInstance) { panZoomInstance.resetZoom(); panZoomInstance.center(); } };

    const btnIn = document.getElementById('ctrl-zoom-in');
    const btnOut = document.getElementById('ctrl-zoom-out');
    const btnReset = document.getElementById('ctrl-zoom-reset');

    btnIn.addEventListener('click', doZoomIn);
    btnIn.addEventListener('touchstart', doZoomIn, { passive: true });
    btnOut.addEventListener('click', doZoomOut);
    btnOut.addEventListener('touchstart', doZoomOut, { passive: true });
    btnReset.addEventListener('click', doZoomReset);
    btnReset.addEventListener('touchstart', doZoomReset, { passive: true });
}

// Map Coloring Functions — exposed globally so main.js can call it
window.colorizeHouse = colorizeHouse;
function colorizeHouse(casaId, color = 'red') {
    // The house texts in the SVG might have id attribute matching the casaId
    // If it's a <text> element:
    const svgElement = document.querySelector("#map-container svg");
    if (!svgElement) return;

    // Looking for an element with an ID that closely matches, we might need to escape
    try {
        const targetElement = svgElement.querySelector(`[id='${casaId}']`) || svgElement.querySelector(`#${CSS.escape(casaId)}`);
        if (targetElement) {
            // Check if it's text or path
            if (targetElement.tagName === 'text' || targetElement.tagName === 'tspan') {
                targetElement.setAttribute('fill', color);
                targetElement.style.fill = color;
                targetElement.style.fontWeight = 'bold';
            } else {
                targetElement.setAttribute('fill', color);
                targetElement.style.fill = color;
            }
            console.log('Colorized element by ID:', casaId);
        } else {
            // Alternative: find text content matching the ID. 
            // In many generated SVGs, text elements might not have the ID attribute, but contain the text itself.
            let found = false;
            const allTexts = svgElement.querySelectorAll('text, tspan');
            allTexts.forEach(el => {
                const text = el.textContent.trim();
                // Exact match or match with different dash types
                if (text === casaId || text.replace(/[‐–—]/g, '-') === casaId) {
                    el.setAttribute('fill', color);
                    el.style.fill = color;
                    el.style.fontWeight = 'bold';
                    found = true;
                }
            });
            if (found) {
                console.log('Colorized element by text content:', casaId);
            } else {
                console.warn('No SVG element found for house:', casaId);
            }
        }
    } catch (e) {
        console.warn('Could not select or colorize house:', casaId, e);
    }
}

async function fetchAndColorizeActiveHouses() {
    const { data: viviendas, error } = await window.supabaseClient
        .from('viviendas')
        .select('id')
        .eq('estado', true);

    if (!error && viviendas) {
        viviendas.forEach(v => {
            colorizeHouse(v.id, '#ff4757'); // A vibrant red-orange nature color
        });
    }

    // Update the counter on initial load
    if (window.updateTotalCounter) {
        window.updateTotalCounter();
    }
}

window.updateTotalCounter = async function () {
    const { data, error } = await window.supabaseClient
        .from('viviendas')
        .select('Sumar')
        .eq('estado', true);
    if (!error && data) {
        const total = data.reduce((acc, row) => acc + (row.Sumar || 0), 0);
        const counterEl = document.getElementById('contador-viviendas');
        if (counterEl) {
            counterEl.textContent = total;
        }
    }
};

function listenToSupabaseChanges() {
    // Realtime subscription
    window.supabaseClient
        .channel('viviendas-cambios')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'viviendas' },
            (payload) => {
                console.log('Cambio detectado en Supabase:', payload);
                if (payload.new && payload.new.estado === true) {
                    colorizeHouse(payload.new.id, '#ff4757');

                    // If routing logic is available, we might want to recalculate
                    if (window.calculateAndDrawRoute) {
                        window.calculateAndDrawRoute();
                    }
                }

                // If a record is deleted or reset to false
                if ((payload.new && payload.new.estado === false) || payload.eventType === 'DELETE') {
                    const idToReset = payload.old ? payload.old.id : payload.new.id;
                    colorizeHouse(idToReset, '#000000'); // Assuming original text color is black

                    if (window.calculateAndDrawRoute) {
                        window.calculateAndDrawRoute();
                    }
                }

                // Update the total counter when any change happens
                if (window.updateTotalCounter) {
                    window.updateTotalCounter();
                }
            }
        )
        .subscribe();
}