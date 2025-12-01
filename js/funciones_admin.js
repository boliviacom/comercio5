// funciones_admin.js

// 1. IMPORTAR EL NUEVO GESTOR DE VISIBILIDAD DE COLUMNAS
import { AdminProductManager } from './AdminProductManager.js';
import { AuthManager } from './authManager.js';
import { ColumnVisibilityManager } from './ColumnVisibilityManager.js'; // ⬅️ Nuevo Import

// 2. DEFINIR EL HTML ESTRUCTURAL (Para inyectar en el content-display)
const COLUMN_MANAGER_HTML = `
    <div id="column-visibility-manager-container" class="config-view-wrapper">
        <div class="config-header">
            <h2 class="config-title">Gestión de Visibilidad de Columnas</h2>
            <p class="config-instruction">Seleccione un usuario o rol para configurar las columnas visibles en la tabla de productos.</p>
        </div>

        <div class="config-content-wrapper">
            <div class="config-controls-side">
                <h3>Configurar para:</h3>
                
                <div class="form-group mb-4">
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-user-shield"></i></span>
                        <select id="role-select" class="form-control-select">
                            <option value="Administrador">Administrador</option>
                            <option value="SuperAdmin">Super Administrador</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-user"></i></span>
                        <select id="user-select" class="form-control-select" disabled>
                            <option value="">Seleccionar Usuario (Opcional)</option>
                        </select>
                    </div>
                </div>

                <div class="role-info-box">
                    <strong>Rol seleccionado:</strong> <span id="selected-role-name">Administrador</span>
                    <p>Los cambios se aplicarán a todos los usuarios con este rol, a menos que un usuario tenga una configuración específica.</p>
                </div>
            </div>

            <div class="column-list-side">
                <div class="column-list-header">
                    <h3>Columnas de la Tabla de Productos</h3>
                    <a href="#" id="select-all-columns" class="select-all-link">Seleccionar todas</a>
                </div>

                <div id="column-switches-list" class="column-switches-list">
                    </div>
            </div>
        </div>

        <div class="config-footer">
            <button type="button" class="btn-cancel" id="cancel-config-btn">Cancelar</button>
            <button type="button" class="btn-save-changes" id="save-config-btn">
                <i class="fas fa-save"></i> Guardar Cambios
            </button>
        </div>
    </div>
`;


/**
 * 3. FUNCIÓN DEDICADA PARA LA GESTIÓN DE VISIBILIDAD DE COLUMNAS
 * Inyecta el HTML y inicializa el ColumnVisibilityManager.
 */
function handleColumnCustomizationClick(displayElementId) {
    const displayElement = document.getElementById(displayElementId);

    // Limpia el contenido y carga la interfaz de configuración
    displayElement.innerHTML = COLUMN_MANAGER_HTML;

    // Inicializa el gestor de columnas sobre el contenedor inyectado
    // El ID que pasamos al constructor debe ser el ID del contenedor padre de toda la interfaz
    new ColumnVisibilityManager('column-visibility-manager-container');

    console.log('[Router] Cargando: Gestión de Visibilidad de Columnas.');
}


document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    const navLinks = document.querySelectorAll('.nav-list .nav-link');
    const logoutLink = document.getElementById('logout-link');

    const authManager = new AuthManager();

    const displayElementId = 'content-display';
    const modalId = 'crud-modal';

    let currentManager = null;

    const productManager = new AdminProductManager(displayElementId, modalId);

    // Toggle de la barra lateral (Sidebar)
    const icon = toggleBtn.querySelector('i');
    if (!sidebar.classList.contains('collapsed')) {
        icon.classList.add('fa-times');
        icon.classList.remove('fa-bars');
    }

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        } else {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        }
    });

    const managerMap = {
        'producto': productManager,

    };

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();

            // 1. 🚨 LIMPIEZA GLOBAL: Remover 'active' de TODOS los enlaces al inicio
            document.querySelectorAll('.nav-list .nav-link').forEach(l => l.classList.remove('active'));

            // 🌟 4. Manejo del enlace de personalización (NUEVA LÓGICA)
            if (link.id === 'customize-link') {
                handleColumnCustomizationClick(displayElementId);
                link.classList.add('active'); // Activar el enlace de Personalizar
                // Limpiar el manager actual ya que estamos en una vista de configuración
                currentManager = null;
                return;
            }

            // 2. 🟢 LÓGICA CLAVE DEL TOGGLE (Abre/Cierra Submenú) 🟢
            const toggleTargetId = link.getAttribute('data-toggle');
            if (toggleTargetId) {
                const submenu = document.getElementById(toggleTargetId);
                const icon = link.querySelector('.submenu-icon');

                if (submenu) {
                    // Si es un toggle, lo abrimos/cerramos
                    submenu.classList.toggle('collapsed');

                    if (icon) {
                        // Cambia la flecha visualmente
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-up');
                    }
                }
                // Continuar para permitir la carga de tabla si el enlace tiene data-table
            }
            // --- Fin Lógica de Toggle ---


            const action = link.getAttribute('data-action');
            const tableName = link.getAttribute('data-table');

            // 3. Manejo de ACCIONES (Crear Nuevo / Carga Masiva)
            if (action) {
                const manager = managerMap['producto'];

                if (manager) {
                    if (action === 'crear-producto') {
                        manager.showForm('producto', 'create');
                    } else if (action === 'carga-masiva-producto') {
                        manager.showBulkUploadForm();
                    }

                    // 🌟 CLAVE: Asegurarse de que el enlace PADRE 'Productos' quede activo
                    const productToggleLink = document.querySelector('.submenu-toggle[data-table="producto"]');
                    if (productToggleLink) {
                        productToggleLink.classList.add('active');
                    }

                    // 🔄 Reforzar: Asegurarse de que la tabla de Productos esté cargada por debajo del modal.
                    if (currentManager !== managerMap['producto']) {
                        managerMap['producto'].loadTable();
                        currentManager = managerMap['producto'];
                    }
                } else {
                    console.error("[Router] Product Manager no encontrado para la acción.");
                }
                return; // Las acciones abren modal y terminan aquí
            }


            // 4. Manejo de TABLAS (CRUD normal)
            if (tableName) {
                link.classList.add('active'); // Activar el enlace clicado (incluyendo 'Productos')

                const newManager = managerMap[tableName];

                if (newManager && newManager.loadTable) {

                    if (currentManager && currentManager !== newManager && typeof currentManager.cleanupListeners === 'function') {
                        currentManager.cleanupListeners();
                    }

                    newManager.loadTable();
                    currentManager = newManager;
                    console.log(`[Router] Cargando tabla ${tableName} con su Manager especializado.`);

                } else {
                    const linkText = link.querySelector('span')?.textContent.trim() || tableName;
                    document.getElementById(displayElementId).innerHTML = `
                        <p class="info-message">Gestión no disponible para ${linkText} (tabla: ${tableName}).</p>
                    `;
                    console.warn(`[Router] No hay Manager definido para la tabla: ${tableName}`);
                }
            }
        });
    });

    // Lógica de Logout
    logoutLink.addEventListener('click', async (event) => {
        event.preventDefault();

        localStorage.removeItem("usuarioEmail");
        localStorage.removeItem("usuarioId");
        localStorage.removeItem("usuarioRol");

        if (currentManager && typeof currentManager.cleanupListeners === 'function') {
            currentManager.cleanupListeners();
        }

        const result = await authManager.cerrarSesion();

        if (result.success) {
            window.location.href = "index.html";
        } else {
            console.error("Error al cerrar sesión:", result.error);
            alert("⚠️ Error al cerrar sesión. Intenta de nuevo.");
        }
    });

    // Carga inicial y activación del enlace
    productManager.loadTable();
    currentManager = productManager;
    console.log('[Router] Carga inicial: Tabla Productos.');

    const productNavLink = document.querySelector('.submenu-toggle[data-table="producto"]');
    if (productNavLink) {
        productNavLink.classList.add('active');
    }

    // 🟢 LÓGICA DE CARGA INICIAL (ASEGURA QUE ESTÉ ABIERTO) 🟢
    const initialSubmenu = document.getElementById('productos-submenu');
    const initialIcon = document.querySelector('.submenu-toggle[data-table="producto"] .submenu-icon');

    // Al cargar la página, forzamos que el submenú de productos se abra la primera vez.
    if (initialSubmenu) {
        initialSubmenu.classList.remove('collapsed');
        if (initialIcon) {
            initialIcon.classList.remove('fa-chevron-down');
            initialIcon.classList.add('fa-chevron-up');
        }
    }
});