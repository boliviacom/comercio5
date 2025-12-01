// js/ColumnConfigDashboard.js

import { ColumnVisibilityManager } from './ColumnVisibilityManager.js';

const MODAL_ID = 'crud-modal';
const DISPLAY_ELEMENT_ID = 'admin-display-area';

export class ColumnConfigDashboard {

    constructor(displayElementId = DISPLAY_ELEMENT_ID, modalId = MODAL_ID) {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalCloseBtn = document.getElementById('modal-close-btn');

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

    loadConfigurationPanel(tableName = 'producto') {
        this.displayElement.innerHTML = `
            <div class="panel-header-wrapper">
                <h1>Administración de Visibilidad de Columnas</h1>
                <p>Bienvenido al gestor de configuración de la vista de tablas por rol.</p>
                <button class="btn-primary" id="open-config-btn">
                    <i class="fas fa-columns"></i> Abrir Configuración de Columnas
                </button>
            </div>
        `;

        document.getElementById('open-config-btn')?.addEventListener('click', () => {
            this.showColumnVisibilityPanel(tableName);
        });

        this.showColumnVisibilityPanel(tableName);
    }

    async showColumnVisibilityPanel(tableName) {
        this.modalTitle.textContent = 'Gestión de Visibilidad de Columnas';
        this.modalBody.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando panel...</div>';
        this.modal.classList.add('active');

        try {
            const panelHTML = await this.columnManager.renderPanel(tableName);
            this.modalBody.innerHTML = panelHTML;

            // 🔑 CORRECCIÓN DE TIMING: Espera un microciclo para asegurar que el DOM ha cargado los nuevos elementos.
            await new Promise(resolve => setTimeout(resolve, 0));

            await this.columnManager.initializePanelListeners();

        } catch (error) {
            console.error('Error al mostrar el panel de configuración de columnas:', error);
            this.modalBody.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
        }
    }
}