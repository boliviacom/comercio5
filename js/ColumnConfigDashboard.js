// js/ColumnConfigDashboard.js

import { ColumnVisibilityManager } from './ColumnVisibilityManager.js';
// 🔑 Importación necesaria para obtener la lista de tablas
import { REPORT_CONFIG } from './config/tableConfigs.js';

const MODAL_ID = 'crud-modal';
const DISPLAY_ELEMENT_ID = 'admin-display-area';

export class ColumnConfigDashboard {

    constructor(displayElementId = DISPLAY_ELEMENT_ID, modalId = MODAL_ID) {
        // 🔑 Verificaciones defensivas en el constructor para evitar el TypeError
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalCloseBtn = document.getElementById('modal-close-btn');

        if (!this.displayElement || !this.modal) {
            console.error(`ColumnConfigDashboard: No se encontraron los elementos principales (Display: ${!!this.displayElement}, Modal: ${!!this.modal}).`);
            // Retornamos sin inicializar el manager ni listeners si los elementos no están listos.
            return;
        }

        this.columnManager = new ColumnVisibilityManager();
        this.setupModalListeners();
    }

    setupModalListeners() {
        this.modalCloseBtn?.addEventListener('click', () => {
            this.modal.classList.remove('active');
            this.modalBody.innerHTML = '';
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target.id === this.modal.id) {
                this.modal.classList.remove('active');
                this.modalBody.innerHTML = '';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.modal.classList.remove('active');
                this.modalBody.innerHTML = '';
            }
        });
    }

    // 🔑 NUEVO MÉTODO PRINCIPAL: Renderiza la cuadrícula de selección
    loadConfigurationPanel() {
        if (!this.displayElement) {
            // Ya verificamos esto en el constructor, pero lo dejamos como seguro
            console.error("El elemento 'admin-display-area' es nulo. No se puede renderizar el panel.");
            return;
        }

        const tableNames = Object.keys(REPORT_CONFIG);

        // 1. Generar los tiles de las tablas
        const tableTilesHTML = tableNames.map(tableName => {
            const icon = this.getTableIcon(tableName);
            const title = this.formatTableName(tableName);
            const description = this.getTableDescription(tableName);

            return `
                <div class="table-tile" data-table-name="${tableName}">
                    <div class="tile-icon-wrapper">
                        <i class="${icon}"></i>
                    </div>
                    <h3>Tabla de ${title}</h3>
                    <p>${description}</p>
                    <a href="#" class="manage-link" data-table-name="${tableName}">
                        Gestionar Visibilidad <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;
        }).join('');

        // 🔑 Línea donde ocurría el error (ahora segura por la verificación)
        this.displayElement.innerHTML = `
            <div class="panel-header-wrapper">
                <h1>Panel de Super Administrador</h1>
                <h2>Selección de Tablas</h2>
                <p>Elija una tabla para gestionar la visibilidad de sus columnas por rol.</p>
            </div>
            <div id="table-selection-grid">
                ${tableTilesHTML}
                
                <div class="table-tile add-new-tile">
                    <div class="tile-icon-wrapper">
                        <i class="fas fa-plus"></i>
                    </div>
                    <h4>Añadir Nueva Tabla</h4>
                    <p>Configurar una nueva tabla para la gestión (requiere modificación en 'tableConfigs.js').</p>
                </div>
            </div>
        `;

        // 2. Adjuntar listeners
        this.displayElement.querySelectorAll('.manage-link, .table-tile:not(.add-new-tile)').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const tableName = element.getAttribute('data-table-name');
                if (tableName) {
                    this.showColumnVisibilityPanel(tableName);
                }
            });
        });
    }

    // 🔑 MÉTODOS AUXILIARES
    getTableIcon(tableName) {
        const icons = {
            'producto': 'fas fa-box-open',
            'usuario': 'fas fa-users',
            'orden': 'fas fa-receipt',
            'categoria': 'fas fa-tags',
            'direccion': 'fas fa-map-marked-alt',
            'departamento': 'fas fa-globe-americas',
            'municipio': 'fas fa-city',
            'localidad': 'fas fa-map-pin',
            'zona': 'fas fa-map',
            'orden_detalle': 'fas fa-list-alt',
        };
        return icons[tableName] || 'fas fa-table';
    }

    formatTableName(tableName) {
        return tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' ');
    }

    getTableDescription(tableName) {
        const descriptions = {
            'producto': 'Gestionar columnas como precio, stock, categoría, etc.',
            'usuario': 'Gestionar columnas como email, rol, fecha de registro, etc.',
            'orden': 'Gestionar columnas como ID de pedido, cliente, total, estado, etc.',
        };
        return descriptions[tableName] || `Gestionar la visibilidad de las columnas para la tabla de ${this.formatTableName(tableName)}.`;
    }

    // 🔑 Método modificado para aceptar 'tableName'
    async showColumnVisibilityPanel(tableName) {
        if (!this.modal || !this.modalTitle || !this.modalBody) {
            console.error("ColumnConfigDashboard: Elementos modales no inicializados.");
            return;
        }

        this.modalBody.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando panel...</div>';
        this.modal.classList.add('active');

        try {
            // Pasa el tableName al renderPanel
            const panelHTML = await this.columnManager.renderPanel(tableName);
            this.modalBody.innerHTML = panelHTML;

            // Espera un microciclo para asegurar que el DOM ha cargado los nuevos elementos.
            await new Promise(resolve => setTimeout(resolve, 0));

            // Pasa el tableName al initializePanelListeners
            await this.columnManager.initializePanelListeners(tableName);

        } catch (error) {
            console.error('Error al mostrar el panel de configuración de columnas:', error);
            this.modalBody.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
        }
    }
}