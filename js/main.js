const supabaseUrl = 'https://hjqcisqmiyadzzmrjemm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcWNpc3FtaXlhZHp6bXJqZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjMxOTgsImV4cCI6MjA4ODgzOTE5OH0.BX9AOYF_xgugkyEJFbgGu9KFVXQCTLYXlooalQZpItw';
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
const ADMIN_EMAIL = 'netopalma54@aol.com';
let mapData = null; // Store map data for validation

// DOM Elements
const btnLogout = document.getElementById('btn-logout');
const btnAdmin = document.getElementById('btn-admin');
const adminPanel = document.getElementById('admin-panel');
const registroMenu = document.getElementById('registro-menu');
const modalAuth = document.getElementById('modal-auth');
const modalRegistro = document.getElementById('modal-registro');
const closeBtns = document.querySelectorAll('.btn-close-modal');

// Auth Form Elements
const btnRequestOtp = document.getElementById('btn-request-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const authEmailInput = document.getElementById('auth-email');
const authOtpInput = document.getElementById('auth-otp');
const authStep1 = document.getElementById('auth-step-1');
const authStep2 = document.getElementById('auth-step-2');
const authError = document.getElementById('auth-error');

// Guest & Map Control Elements
const btnViewMap = document.getElementById('btn-view-map');
const mapContainer = document.getElementById('map-container');
const bgImage = document.getElementById('background-img');

// Admin Elements
const btnResetEvent = document.getElementById('btn-reset-event');
const btnResetColors = document.getElementById('btn-reset-colors');

// Register Form Elements
const regEmailInput = document.getElementById('reg-email');
const regCasaInput = document.getElementById('reg-casa');
const btnSubmitRegistro = document.getElementById('btn-submit-registro');
const regError = document.getElementById('reg-error');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check initial auth state
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    handleAuthStateChange(session);

    // Listen to Auth changes
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        handleAuthStateChange(session);
    });

    // Load Map Data for Validation
    try {
        const response = await fetch('data/map-data.json');
        mapData = await response.json();
    } catch (error) {
        console.error('Error loading map data:', error);
    }
});

async function handleAuthStateChange(session) {
    if (session) {
        currentUser = session.user;
        btnViewMap.classList.add('hidden'); // Hide guest button
        btnLogout.classList.remove('hidden');
        regEmailInput.value = currentUser.email;

        // Show map
        showMap();

        // Check if the user already has a registered vivienda
        try {
            const { data: userViviendas, error } = await window.supabaseClient
                .from('viviendas')
                .select('id')
                .eq('email', currentUser.email);

            console.log('Viviendas query result:', { userViviendas, error });

            if (error) {
                console.error('Error al consultar viviendas:', error.message);
            }

            if (!error && (!userViviendas || userViviendas.length === 0)) {
                // User doesn't have a registered vivienda, show the prompt
                // Small delay to ensure auth modal is fully closed
                setTimeout(() => {
                    modalAuth.classList.remove('active'); // Ensure auth modal is closed
                    if (currentUser.email !== ADMIN_EMAIL) {
                        modalRegistro.classList.add('active');
                        regError.style.display = 'none';
                        regCasaInput.value = '';
                        console.log('Modal registro shown for user:', currentUser.email);
                    }
                }, 400);
            }
        } catch (err) {
            console.error('Exception al consultar viviendas:', err);
        }

        // Check Admin
        if (currentUser.email === ADMIN_EMAIL) {
            btnAdmin.classList.remove('hidden');
        } else {
            btnAdmin.classList.add('hidden');
            adminPanel.style.display = 'none';
        }
    } else {
        currentUser = null;
        btnViewMap.classList.remove('hidden'); // Show guest button
        btnLogout.classList.add('hidden');
        btnAdmin.classList.add('hidden');
        adminPanel.style.display = 'none';
        regEmailInput.value = '';
    }
}

function showMap() {
    mapContainer.classList.remove('map-hidden');
    bgImage.classList.add('dimmed');
    const controls = document.getElementById('map-controls');
    if (controls) controls.classList.remove('hidden');

    // Hide CTA Buttons when map is active
    registroMenu.classList.add('hidden');
    btnViewMap.classList.add('hidden');

    // Show participant counter
    const totalParticipantes = document.getElementById('total-participantes');
    if (totalParticipantes) {
        totalParticipantes.style.display = 'block';
    }
    const Rotulo = document.getElementById('Rotulo');
    if (Rotulo) {
        Rotulo.style.display = 'block';
    }
    const logo = document.getElementById('logo');
    if (logo) {
        logo.style.display = 'block';
    }

    // Attempt to resize map to fit screen now that it's visible
    if (window.panZoomInstance) {
        window.panZoomInstance.resize();
        window.panZoomInstance.fit();
        window.panZoomInstance.center();
    }
}

// Modal & Buttons Handlers
btnViewMap.addEventListener('click', () => {
    showMap();
});

registroMenu.addEventListener('click', () => {
    if (!currentUser) {
        // Must be logged in to register, use the big button as the Auth trigger
        modalAuth.classList.add('active');
        authStep1.classList.remove('hidden');
        authStep2.classList.add('hidden');
        authError.style.display = 'none';
        authEmailInput.value = '';
        authOtpInput.value = '';
        return;
    }
    // Already logged in
    modalRegistro.classList.add('active');
    regError.style.display = 'none';
    regCasaInput.value = '';
});

closeBtns.forEach(btn => {
    const closeModals = (e) => {
        e.preventDefault();
        modalAuth.classList.remove('active');
        modalRegistro.classList.remove('active');
    };
    btn.addEventListener('click', closeModals);
    btn.addEventListener('touchstart', closeModals, { passive: false });
});

btnLogout.addEventListener('click', async () => {
    await window.supabaseClient.auth.signOut();
});

if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
        adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
    });
}

// Admin Actions
if (btnResetEvent) {
    btnResetEvent.addEventListener('click', async () => {
        if (confirm("¿Está seguro de querer reiniciar todo el evento? Esto borrará todos los registros de viviendas.")) {
            btnResetEvent.disabled = true;
            btnResetEvent.textContent = "Borrando...";

            const { error } = await window.supabaseClient
                .from('viviendas')
                .delete()
                .neq('id', 'INVALID_ID_TO_DELETE_ALL');

            btnResetEvent.disabled = false;
            btnResetEvent.textContent = "Resetear Evento";

            if (error) {
                alert("Error al resetear: " + error.message);
            } else {
                alert("Evento reiniciado con éxito.");
                location.reload(); // Refresh to clean map and states
            }
        }
    });
}

if (btnResetColors) {
    btnResetColors.addEventListener('click', async () => {
        if (confirm("¿Desea volver todas las viviendas a su color original y limpiar los emails registrados?")) {
            btnResetColors.disabled = true;
            btnResetColors.textContent = "Actualizando...";

            const { error } = await window.supabaseClient
                .from('viviendas')
                .update({ estado: false, email: '' })
                .eq('estado', true);

            btnResetColors.disabled = false;
            btnResetColors.textContent = "Limpiar Colores y Emails";

            if (error) {
                alert("Error al actualizar colores: " + error.message);
            } else {
                alert("Colores y emails restaurados con éxito.");
                location.reload(); // Refresh to clean map and states
            }
        }
    });
}

// Auth Flow (OTP)
btnRequestOtp.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    if (!email) {
        showAuthError("Por favor ingrese su correo.");
        return;
    }

    btnRequestOtp.disabled = true;
    btnRequestOtp.textContent = "Enviando...";

    const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: email,
    });

    btnRequestOtp.disabled = false;
    btnRequestOtp.textContent = "Enviar Código";

    if (error) {
        showAuthError(error.message);
    } else {
        authError.style.display = 'none';
        authStep1.classList.add('hidden');
        authStep2.classList.remove('hidden');
    }
});

btnVerifyOtp.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const token = authOtpInput.value.trim();

    if (!token || token.length !== 6) {
        showAuthError("El código debe tener 6 dígitos.");
        return;
    }

    btnVerifyOtp.disabled = true;
    btnVerifyOtp.textContent = "Verificando...";

    const { data, error } = await window.supabaseClient.auth.verifyOtp({
        email,
        token,
        type: 'email'
    });

    btnVerifyOtp.disabled = false;
    btnVerifyOtp.textContent = "Verificar e Ingresar";

    if (error) {
        showAuthError(error.message);
    } else {
        modalAuth.classList.remove('active');
        // Also explicitly trigger registration modal after successful OTP,
        // in case onAuthStateChange fires before this callback
        setTimeout(async () => {
            if (currentUser) {
                try {
                    const { data: userViviendas, error: vErr } = await window.supabaseClient
                        .from('viviendas')
                        .select('id')
                        .eq('email', currentUser.email);
                    if (!vErr && (!userViviendas || userViviendas.length === 0)) {
                        if (currentUser.email !== ADMIN_EMAIL) {
                            modalRegistro.classList.add('active');
                            regError.style.display = 'none';
                            regCasaInput.value = '';
                            regEmailInput.value = currentUser.email;
                        }
                    }
                } catch (e) {
                    console.error('Error checking viviendas post-OTP:', e);
                }
            }
        }, 600);
    }
});

function showAuthError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
}

// Registration Flow
btnSubmitRegistro.addEventListener('click', async () => {
    if (!currentUser) return;

    const casaId = regCasaInput.value.trim().toUpperCase();

    if (!casaId) {
        showRegError("Ingrese un identificador de vivienda.");
        return;
    }

    if (!mapData) {
        showRegError("Datos del mapa no cargados aún, intente de nuevo.");
        return;
    }

    // Validate Casa ID against map-data.json keys
    if (!mapData.hasOwnProperty(casaId)) {
        showRegError("El identificador de vivienda no es válido o no existe en el plano.");
        return;
    }

    btnSubmitRegistro.disabled = true;
    btnSubmitRegistro.textContent = "Registrando...";

    // Insert or update in Supabase
    const { data, error } = await window.supabaseClient
        .from('viviendas')
        .upsert({
            id: casaId,
            email: currentUser.email,
            estado: true,
            Sumar: 1
        });

    btnSubmitRegistro.disabled = false;
    btnSubmitRegistro.textContent = "Registrar Participación";

    if (error) {
        showRegError("Error al registrar: " + error.message);
    } else {
        modalRegistro.classList.remove('active');
        alert("¡Vivienda " + casaId + " registrada exitosamente!");

        // Colorize the house immediately
        if (window.colorizeHouse) {
            window.colorizeHouse(casaId, '#ff4757');
        }

        // Recalculate and draw the route
        if (window.calculateAndDrawRoute) {
            window.calculateAndDrawRoute();
        }
    }
});

function showRegError(msg) {
    regError.textContent = msg;
    regError.style.display = 'block';
}
