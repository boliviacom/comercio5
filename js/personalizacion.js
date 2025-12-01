/**
 * AdminPersonalizationManager.js
 * * Gestión del Modal y Aplicación de Temas.
 */

document.addEventListener('DOMContentLoaded', () => {
    // === Constantes y Elementos del DOM ===
    
    // Selectores del modal
    const customizeLink = document.getElementById('customize-link');
    const personalizationModal = document.getElementById('personalization-modal');
    const closePersonalizationModalBtn = document.getElementById('close-personalization-modal-btn');
    
    // Selectores de temas
    const themeButtons = document.querySelectorAll('.theme-btn');
    const body = document.body;
    
    // Clave y tema por defecto
    const THEME_STORAGE_KEY = 'adminThemePreference';
    const DEFAULT_THEME = 'default';
    const TRANSITION_DURATION_MS = 300; // Coincide con tu CSS (0.3s)

    // === Lógica de Temas ===

    /**
     * Aplica la clase del tema al body y guarda la preferencia.
     * @param {string} theme - El nombre del tema ('default', 'dark', 'blue').
     */
    function applyTheme(theme) {
        // 1. Eliminar clases de temas previas
        body.classList.remove('dark', 'blue', 'gold', 'magenta', 'forest-green');
        
        // 2. Aplicar la nueva clase si no es el tema por defecto
        if (theme !== DEFAULT_THEME) {
            body.classList.add(theme);
        }
        
        // 3. Guardar la preferencia
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        
        // 4. Marcar el botón de tema como activo
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active-theme');
            } else {
                btn.classList.remove('active-theme');
            }
        });
    }

    /**
     * Carga el tema guardado en localStorage al iniciar la aplicación.
     */
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
        applyTheme(savedTheme);
    }
    
    // Aplicar el tema guardado inmediatamente al cargar el script
    loadSavedTheme();

    // === Lógica de Apertura y Cierre del Modal (CORREGIDA) ===

    /**
     * Cierra el modal, esperando la transición de opacidad.
     */
    function closePersonalizationModal() {
        personalizationModal.classList.remove('active');
        // Esperar a que termine la animación (300ms) antes de ocultar el display
        setTimeout(() => {
            personalizationModal.style.display = 'none';
        }, TRANSITION_DURATION_MS);
    }
    
    // 1. Abrir modal al hacer clic en el enlace "Personalizar"
    if (customizeLink) {
        customizeLink.addEventListener('click', (e) => {
            e.preventDefault();
            // 1. Cambiar a 'flex' para que sea afectado por la opacidad
            personalizationModal.style.display = 'flex';
            
            // 2. Usar setTimeout para agregar la clase 'active' en el siguiente ciclo
            // del navegador, permitiendo que la transición de opacidad ocurra.
            setTimeout(() => {
                personalizationModal.classList.add('active'); 
            }, 10); 
        });
    }

    // 2. Cerrar modal con el botón 'x'
    if (closePersonalizationModalBtn) {
        closePersonalizationModalBtn.addEventListener('click', closePersonalizationModal);
    }

    // 3. Cerrar si se hace clic fuera del modal (en el overlay)
    if (personalizationModal) {
        personalizationModal.addEventListener('click', (e) => {
            if (e.target === personalizationModal) {
                closePersonalizationModal();
            }
        });
    }

    // === Event Listeners para el Cambio de Tema ===
    
    // Manejar el clic en los botones de tema
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newTheme = button.dataset.theme;
            applyTheme(newTheme);
            closePersonalizationModal(); // Usar la función de cierre correcta
        });
    });
});