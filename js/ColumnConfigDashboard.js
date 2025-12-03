import { ColumnVisibilityManager } from './ColumnVisibilityManager.js';
import { REPORT_CONFIG } from './config/tableConfigs.js';

const MODAL_ID = 'crud-modal';
const DISPLAY_ELEMENT_ID = 'admin-display-area';

// Metadatos con los iconos y descripciones actualizadas
const TABLE_METADATA = {
    'producto': { icon: 'fas fa-box-open', description: 'Gestionar columnas como precio, stock, categoría, etc.' },
    'usuario': { icon: 'fas fa-users', description: 'Gestionar columnas como email, rol, fecha de registro, etc.' },
    'orden': { icon: 'fas fa-receipt', description: 'Gestionar columnas como ID de pedido, cliente, total, estado, etc.' },
    'categoria': { icon: 'fas fa-tags', description: 'Gestionar la visibilidad de las columnas para la tabla de Categoría.' },
    'direccion': { icon: 'fas fa-map-marked-alt', description: 'Gestionar la visibilidad de las columnas para la tabla de Dirección.' },
    'departamento': { icon: 'fas fa-globe-americas', description: 'Gestionar datos geográficos de departamentos.' },
    'municipio': { icon: 'fas fa-city', description: 'Gestionar datos geográficos de municipios.' },
    'localidad': { icon: 'fas fa-map-pin', description: 'Gestionar datos geográficos de localidades.' },
    'zona': { icon: 'fas fa-map', description: 'Gestionar datos geográficos de zonas.' },
    'orden_detalle': { icon: 'fas fa-list-alt', description: 'Gestionar la visibilidad de las columnas para los detalles de la orden.' },
};
const DEFAULT_METADATA = { icon: 'fas fa-table', description: 'Gestión de visibilidad de columnas por rol y usuario.' };


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

    _renderTableCard(tableName, description, iconClass) {
        const formattedName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' ');
        const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9]/g, '');

        return `
            <div class="table-card" data-table-name="${tableName}">
                <div class="card-header">
                    <i class="${iconClass} card-icon"></i>
                    
                    <div class="card-actions dropdown">
                        <button class="dropdown-toggle" data-toggle="dropdown" data-table="${tableName}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu" id="crud-menu-${sanitizedTableName}">
                            <a class="dropdown-item crud-action" data-action="view-data" data-table="${tableName}"><i class="fas fa-eye"></i> Ver datos de la tabla</a>
                            <a class="dropdown-item crud-action" data-action="add" data-table="${tableName}"><i class="fas fa-plus-circle"></i> Añadir</a>
                            <a class="dropdown-item crud-action" data-action="edit" data-table="${tableName}"><i class="fas fa-edit"></i> Editar</a>
                            <div class="dropdown-divider"></div>
                            <a class="dropdown-item crud-action" data-action="delete" data-table="${tableName}"><i class="fas fa-trash-alt"></i> Eliminar</a>
                        </div>
                    </div>
                </div>
                
                <h3 class="card-title">Tabla de ${formattedName}</h3>
                <p class="card-description">${description}</p>
                <div class="card-footer">
                    <button class="btn-manage-table" data-table-name="${tableName}">
                        <i class="fas fa-cog"></i> Gestionar Tabla
                    </button>
                </div>
            </div>
        `;
    }

    loadConfigurationPanel() {

        const tableNames = Object.keys(REPORT_CONFIG);

        const tableCardsHTML = tableNames
            .map(tableName => {
                const meta = TABLE_METADATA[tableName] || DEFAULT_METADATA;
                return this._renderTableCard(tableName, meta.description, meta.icon);
            })
            .join('');

        this.displayElement.innerHTML = `
            <div class="panel-header-wrapper">
                <h1>Panel de Super Administrador</h1>
                <p>Elija una tabla para gestionar su configuración o sus datos.</p>
            </div>
            
            <div class="table-cards-grid">
                ${tableCardsHTML}
                
            </div>
        `;

        // --- LISTENERS ---

        document.querySelectorAll('.btn-manage-table').forEach(button => {
            button.addEventListener('click', (e) => {
                const tableName = e.currentTarget.getAttribute('data-table-name');
                this.showColumnVisibilityPanel(tableName);
            });
        });

        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
                    if (menu !== e.currentTarget.nextElementSibling) {
                        menu.classList.remove('active');
                    }
                });

                const menu = e.currentTarget.nextElementSibling;
                menu?.classList.toggle('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('active'));
            }
        });

        document.querySelectorAll('.crud-action').forEach(actionLink => {
            actionLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = e.currentTarget.getAttribute('data-action');
                const table = e.currentTarget.getAttribute('data-table');

                alert(`Acción: ${e.currentTarget.textContent.trim()} (${action}) en la tabla: ${table}`);

                e.currentTarget.closest('.dropdown-menu').classList.remove('active');
            });
        });

    }

    async showColumnVisibilityPanel(tableName) {
        this.modalTitle.textContent = `Gestión de Columnas: ${tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' ')}`;
        this.modalBody.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando panel...</div>';
        this.modal.classList.add('active');

        try {
            const panelHTML = await this.columnManager.renderPanel(tableName);
            this.modalBody.innerHTML = panelHTML;

            await new Promise(resolve => setTimeout(resolve, 0));

            await this.columnManager.initializePanelListeners(tableName);

        } catch (error) {
            console.error('Error al mostrar el panel de configuración de columnas:', error);
            this.modalBody.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
        }
    }
}