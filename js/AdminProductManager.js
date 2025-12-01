import { ProductoService } from './services/ProductoService.js';
// Asumiendo que esta es la ruta de tu CategoriaService (necesario para el mapeo)
import { CategoriaService } from './services/CategoriaService.js';
import { ColumnVisibilityManager } from './ColumnVisibilityManager.js';
import { REPORT_CONFIG, CRUD_FIELDS_CONFIG } from './config/tableConfigs.js';

const SERVICE_MAP = {
    'producto': ProductoService,
    // Puedes expandir aquí para otras tablas si tienes más managers
};

const TABLES_ALLOWING_CREATE = ['producto'];

const COLUMN_KEY_MAP = {
    'n_producto': 'N°',
    'producto': 'PRODUCTO',
    'precio_unitario': 'PRECIO UNIT.',
    'stock': 'STOCK',
    'categoria': 'CATEGORÍA',
    'opciones': 'OPCIONES',
    'acciones': 'ACCIONES'
};

const SEARCH_FILTER_CONTAINER_ID = 'product-search-filter-controls-wrapper';


export class AdminProductManager {

    constructor(displayElementId, modalId = 'crud-modal') {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);

        // Prevención de TypeError si los IDs no existen en el HTML
        this.modalTitle = this.modal ? this.modal.querySelector('#modal-title') : null;
        this.modalBody = this.modal ? this.modal.querySelector('#modal-body') : null;
        this.closeModalBtn = this.modal ? this.modal.querySelector('#modal-close-btn') : null;

        this.currentTable = 'producto';
        this.currentLinkText = 'Productos';

        this.fullData = []; // Cache local de todos los datos
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSearchTerm = '';
        this.searchTimeout = null;

        this.categoryNameMap = new Map();

        // Columnas visibles por defecto (esto sería cargado desde el backend por rol/usuario)
        this.visibleProductColumns = ['n_producto', 'producto', 'precio_unitario', 'stock', 'categoria', 'opciones', 'acciones'];

        this.loadingHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando datos...</div>';

        this.setupModalListeners();
    }

    // =========================================================================
    // GESTIÓN DE COLUMNAS DINÁMICAS
    // =========================================================================

    /**
     * Llamado por ColumnVisibilityManager para actualizar la vista.
     * @param {Array<string>} newVisibleKeys - Array de las claves de columnas a mostrar.
     */
    updateVisibleColumns(newVisibleKeys) {
        this.visibleProductColumns = newVisibleKeys;
        this.renderCurrentPage();
    }

    /**
     * Muestra el panel de configuración de visibilidad de columnas en el modal.
     */
    showColumnVisibilityPanel() {
        if (!this.modal || !this.modalTitle || !this.modalBody) {
            console.error("Error: Elementos del modal no encontrados.");
            return;
        }

        this.modalTitle.textContent = 'Gestión de Visibilidad de Columnas';

        const configPanelHTML = `
            <div id="column-visibility-manager-container" class="config-view-wrapper">
                <div class="config-header">
                    <h2 class="config-title">Configuración de Columnas</h2>
                    <p class="config-instruction">Seleccione un rol y active/desactive las columnas.</p>
                </div>
                <div class="config-content-wrapper">
                    <div class="config-controls-side">
                        <h3>Configurar para:</h3>
                        <div class="form-group mb-4">
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user-shield"></i></span>
                                <select id="role-select" class="form-control-select"></select>
                            </div>
                        </div>
                        <div class="role-info-box">
                            <strong>Rol seleccionado:</strong> <span id="selected-role-name">Cargando...</span>
                        </div>
                    </div>
                    <div class="column-list-side">
                        <div class="column-list-header">
                            <h3>Columnas de la Tabla</h3>
                            <a href="#" id="select-all-columns" class="select-all-link">Seleccionar todas</a>
                        </div>
                        <div id="column-switches-list" class="column-switches-list"></div>
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

        this.modalBody.innerHTML = configPanelHTML;
        this.modal.classList.add('active');

        // Inicializar ColumnVisibilityManager, pasándose a sí mismo como referencia (this)
        new ColumnVisibilityManager('column-visibility-manager-container', this.modal, this);
    }

    // =========================================================================
    // CARGA DE DATOS Y RENDERIZADO
    // =========================================================================

    async loadCategoryMap() {
        try {
            const categories = await CategoriaService.fetchData();
            // Mapeamos las categorías por ID para un acceso rápido
            this.categoryNameMap = new Map(categories.map(c => [c.id, c]));
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            // Si falla, el mapa queda vacío, y la columna se renderizará como N/A
        }
    }

    async loadTable() {
        // 1. Cargar el mapa de categorías antes de los productos
        await this.loadCategoryMap();

        try {
            this.displayElement.innerHTML = this.loadingHTML;

            // 2. Usar el servicio real para obtener los datos
            // La función fetchData ya trae los datos filtrados por 'visible = true'
            this.fullData = await ProductoService.fetchData();

            // 3. Renderizar la estructura base de la tabla
            this.displayElement.innerHTML = `
                <div class="table-actions">
                    <div class="header-controls-wrapper">
                        <h2>Gestión de la Tabla: ${this.currentLinkText}</h2>
                        <div class="action-buttons">
                            <button id="show-col-config-btn" class="btn-secondary" title="Configurar Visibilidad de Columnas">
                                <i class="fas fa-eye"></i> Columnas
                            </button>
                            <button id="create-new-btn" class="btn-primary" data-table="producto"><i class="fas fa-plus"></i> Crear Nuevo</button>
                        </div>
                    </div>
                    <div id="${SEARCH_FILTER_CONTAINER_ID}">
                        ${this._renderSearchAndFilterControls()}
                    </div>
                </div>
                <div id="data-table-container"></div>
                <div id="pagination-container"></div>
            `;

            this.renderCurrentPage();

            // 4. Conectar todos los listeners
            this.setupListeners();

        } catch (error) {
            console.error(`Error al cargar la tabla:`, error);
            this.displayElement.innerHTML = `<p class="error-message">Error al cargar datos: ${error.message}</p>`;
        }
    }

    renderCurrentPage() {
        const filteredData = this.fullData.filter(row =>
            JSON.stringify(row).toLowerCase().includes(this.currentSearchTerm.toLowerCase())
        );

        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const dataSlice = filteredData.slice(startIndex, startIndex + this.itemsPerPage);

        this.renderTable(dataSlice, totalPages);
    }

    renderTable(dataSlice, totalPages) {
        const visibleKeys = this.visibleProductColumns;
        let headerHTML = '<tr>';

        // Generación de HEADERS dinámica
        visibleKeys.forEach(key => {
            const label = COLUMN_KEY_MAP[key];
            if (label) {
                headerHTML += `<th ${key === 'acciones' ? 'class="action-column"' : ''}>${label}</th>`;
            }
        });
        headerHTML += '</tr>';

        const tableHTML = `
            <table class="data-table">
                <thead>${headerHTML}</thead>
                <tbody>
                    ${dataSlice.map((row, index) =>
            this.renderRow(row, (this.currentPage - 1) * this.itemsPerPage + index + 1)
        ).join('')}
                    ${dataSlice.length === 0 ? `<tr><td colspan="${visibleKeys.length}" class="no-results-cell">No hay registros que coincidan con la búsqueda.</td></tr>` : ''}
                </tbody>
            </table>
        `;

        document.getElementById('data-table-container').innerHTML = tableHTML;
        document.getElementById('pagination-container').innerHTML = this._renderPaginationControls(totalPages);
        this.setupPaginationListeners(totalPages);
        this.setupRowActionListeners(); // Conecta listeners CRUD
        this.setupBooleanToggleListeners(); // Conecta listeners de switches
    }

    renderRow(row, rowNumber) {
        const rowId = row.id;
        const visibleKeys = this.visibleProductColumns;
        let rowContent = '';

        // Obtener la categoría: puede venir directamente en row.c.nombre si la query SELECT usa el alias 'c' (como en tu config), o usar el mapa.
        const categoriaNombre = row.c ? row.c.nombre : (this.categoryNameMap.get(row.id_categoria)?.nombre || 'N/A');

        visibleKeys.forEach(key => {
            switch (key) {
                case 'n_producto':
                    rowContent += `<td>${rowNumber}</td>`;
                    break;

                case 'producto':
                    rowContent += `
                        <td class="product-cell">
                            <div class="product-info-wrapper">
                                <div class="product-image">
                                    ${row.imagen_url ? `<img src="${row.imagen_url}" alt="Imagen">` : 'Sin Imagen'}
                                </div>
                                <div class="product-details">
                                    <span class="product-name">${row.nombre ?? ''}</span>
                                </div>
                            </div>
                        </td>`;
                    break;

                case 'precio_unitario':
                    rowContent += `<td>Bs. ${parseFloat(row.precio ?? 0).toFixed(2)}</td>`;
                    break;

                case 'stock':
                    rowContent += `<td>${row.stock ?? 0}</td>`;
                    break;

                case 'categoria':
                    rowContent += `<td><span class="category-badge">${categoriaNombre}</span></td>`;
                    break;

                case 'opciones':
                    // Renderiza los switches (mostrar_precio, habilitar_whatsapp, habilitar_formulario)
                    rowContent += `
                        <td class="switch-controls-wrapper"> 
                            <div class="individual-switches-container">
                                ${this._renderBooleanSwitchWithLabel(rowId, 'mostrar_precio', row.mostrar_precio === true, 'Precio')}
                                ${this._renderBooleanSwitchWithLabel(rowId, 'habilitar_whatsapp', row.habilitar_whatsapp === true, 'WhatsApp')}
                                ${this._renderBooleanSwitchWithLabel(rowId, 'habilitar_formulario', row.habilitar_formulario === true, 'Form. Contacto')}
                            </div>
                        </td>`;
                    break;

                case 'acciones':
                    // Renderiza botones CRUD
                    const isInactive = row['visible'] === false;
                    const deleteTitle = isInactive ? 'Registro Inactivo' : 'Eliminar';
                    rowContent += `
                        <td class="action-column">
                            <button class="btn-action btn-edit" data-id="${rowId}" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-action btn-delete" data-id="${rowId}" title="${deleteTitle}" ${isInactive ? 'disabled' : ''}>
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>`;
                    break;
            }
        });

        const rowClass = row.visible === false ? 'inactive-record' : '';
        return `<tr data-id="${rowId}" class="${rowClass}">${rowContent}</tr>`;
    }

    // =========================================================================
    // LÓGICA ASÍNCRONA DE ACCIONES (INTEGRACIÓN CON ProductoService)
    // =========================================================================

    /**
     * Maneja el cambio de estado de los switches de configuración (mostrar_precio, etc.)
     * @param {Event} e 
     */
    async handleBooleanToggle(e) {
        const input = e.currentTarget;
        const id = input.getAttribute('data-id');
        const fieldName = input.getAttribute('data-field');
        const newValue = input.checked;

        if (!id || !fieldName) {
            console.error('ID o FieldName faltante para el toggle.');
            return;
        }

        // Deshabilitar temporalmente el switch
        input.disabled = true;

        try {
            const dataToUpdate = { [fieldName]: newValue };

            // 🔑 LLAMADA ASÍNCRONA A SUPABASE
            await ProductoService.updateField(id, dataToUpdate);

            console.log(`✅ Toggle actualizado: ID: ${id}, Campo: ${fieldName}, Valor: ${newValue}`);

            // Actualizar el dato en la caché local (this.fullData)
            const product = this.fullData.find(p => p.id == id);
            if (product) {
                product[fieldName] = newValue;
            }

        } catch (error) {
            console.error('Error al actualizar el toggle:', error);
            // Revertir el estado del switch en caso de error
            input.checked = !newValue;
            alert(`Error al guardar el cambio: ${error.message}`);
        } finally {
            // Habilitar el switch
            input.disabled = false;
        }
    }

    /**
     * Maneja la acción de Soft Delete (eliminar)
     * @param {string} id 
     */
    async handleDelete(id) {
        if (!confirm(`¿Está seguro de que desea inhabilitar el producto con ID ${id}? Esto lo ocultará del catálogo.`)) {
            return;
        }

        try {
            // 🔑 LLAMADA ASÍNCRONA A SUPABASE
            await ProductoService.softDelete(id);

            // 1. Actualizar la caché local y eliminar la fila de la vista
            this.fullData = this.fullData.filter(p => p.id != id);

            // 2. Recargar la página actual para recalcular la paginación y la tabla
            this.renderCurrentPage();

            alert(`✅ Producto ID ${id} inhabilitado con éxito.`);

        } catch (error) {
            console.error('Error al eliminar producto:', error);
            alert(`Error al inhabilitar el producto: ${error.message}`);
        }
    }

    // =========================================================================
    // CONFIGURACIÓN DE LISTENERS
    // =========================================================================

    setupListeners() {
        this.displayElement.querySelector('#show-col-config-btn')?.addEventListener('click', () => {
            this.showColumnVisibilityPanel();
        });

        this.displayElement.querySelector('#create-new-btn')?.addEventListener('click', () => {
            this.openCrudModal(this.currentTable, 'create');
        });

        this.setupSearchAndFilterListeners();
    }

    setupBooleanToggleListeners() {
        this.displayElement.querySelectorAll('.boolean-toggle').forEach(input => {
            input.addEventListener('change', (e) => this.handleBooleanToggle(e));
        });
    }

    setupRowActionListeners() {
        // Editar
        this.displayElement.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.openCrudModal(this.currentTable, 'edit', id);
            });
        });

        // Eliminar (Soft Delete)
        this.displayElement.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.handleDelete(id);
            });
        });
    }

    setupModalListeners() {
        if (!this.modal) return;

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.classList.remove('active');
            }
        });

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => {
                this.modal.classList.remove('active');
            });
        }
    }

    setupPaginationListeners(totalPages) {
        this.displayElement.querySelectorAll('.page-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const newPage = parseInt(e.currentTarget.getAttribute('data-page'));
                if (newPage >= 1 && newPage <= totalPages) {
                    this.currentPage = newPage;
                    this.renderCurrentPage();
                }
            });
        });
    }

    setupSearchAndFilterListeners() {
        const searchInput = document.getElementById('search-input');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentSearchTerm = searchInput.value.trim();
                    this.currentPage = 1;
                    this.renderCurrentPage();
                }, 300);
            });
        }
    }

    openCrudModal(tableName, mode, id = null) {
        // Lógica para renderizar el formulario de CREATE/UPDATE en this.modalBody
        console.log(`Abriendo modal en modo ${mode} para tabla ${tableName}, ID: ${id}`);
        this.modal.classList.add('active');
        this.modalTitle.textContent = mode === 'create' ? 'Crear Nuevo Producto' : `Editar Producto ID: ${id}`;
        // Aquí iría la lógica para cargar los datos del producto o el formulario vacío
    }

    // =========================================================================
    // MÉTODOS DE RENDERIZADO AUXILIARES
    // =========================================================================

    _renderBooleanSwitchWithLabel(id, fieldName, isChecked, label) {
        const checked = isChecked ? 'checked' : '';
        return `
            <div class="switch-label-group">
                <label class="switch">
                    <input type="checkbox" data-id="${id}" data-field="${fieldName}" class="boolean-toggle" ${checked}>
                    <span class="slider round"></span>
                </label>
                <span class="switch-label">${label}</span>
            </div>
        `;
    }

    _renderSearchAndFilterControls() {
        return `
            <div class="search-filter-controls">
                <div class="search-bar-wrapper">
                    <input type="text" id="search-input" placeholder="Buscar en ${this.currentLinkText}..." value="${this.currentSearchTerm}">
                </div>
            </div>
        `;
    }

    _renderPaginationControls(totalPages) {
        if (totalPages <= 1) return '';

        let pagesHtml = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            pagesHtml += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }

        return `
            <div class="pagination-controls">
                <button class="page-btn" id="prev-page-btn" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                ${pagesHtml}
                <button class="page-btn" id="next-page-btn" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
            </div>
        `;
    }
}