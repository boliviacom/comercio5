import { REPORT_CONFIG, CRUD_FIELDS_CONFIG } from './config/tableConfigs.js';
import { ProductoService } from './services/ProductoService.js';
import { CategoriaService } from './services/CategoriaService.js';

const SERVICE_MAP = {
    'producto': ProductoService,
    'categoria': CategoriaService,
};

const TABLES_ALLOWING_CREATE = ['producto'];
const SEARCH_FILTER_CONTAINER_ID = 'product-search-filter-controls-wrapper';

export class AdminProductManager {

    constructor(displayElementId, modalId = 'crud-modal', backToDashboardCallback = null) {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');

        this.currentTable = 'producto';
        this.currentLinkText = 'Productos';

        this.fullData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSearchTerm = '';
        this.currentCategoryId = '';

        this.loadingHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando datos...</div>';

        this.searchTimeout = null;

        this.categoryNameMap = null;
        this.categoryService = SERVICE_MAP['categoria'];

        this.globalToggleHandler = null;

        this.backToDashboardCallback = backToDashboardCallback;

        this.setupModalListeners();
    }

    setupModalListeners() {
        document.getElementById('close-modal-btn')?.addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target.id === this.modal.id) {
                this.modal.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.modal.classList.remove('active');
            }
        });
    }

    _normalizeString(name) {
        if (!name) return '';
        const normalized = String(name)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return normalized.replace(/\s+/g, '').trim();
    }


    async _getCategoryNameMap() {
        if (this.categoryNameMap) {
            return this.categoryNameMap;
        }

        if (!this.categoryService) {

            return {};
        }

        try {
            const categories = await this.categoryService.fetchData();
            const map = {};

            categories.forEach(cat => {
                map[this._normalizeString(cat.nombre)] = cat.id;
            });

            this.categoryNameMap = map;
            return map;

        } catch (e) {

            return {};
        }
    }

    filterData() {
        let data = this.fullData;
        const term = this.currentSearchTerm.toLowerCase().trim();
        const categoryId = this.currentCategoryId;



        let filteredData = data;

        if (term) {
            filteredData = filteredData.filter(row => {
                const nombre = String(row.nombre || '').toLowerCase();
                const descripcion = String(row.descripcion || '').toLowerCase();
                const categoriaNombre = String(row.c ? row.c.nombre : '').toLowerCase();

                return nombre.includes(term) || descripcion.includes(term) || categoriaNombre.includes(term);
            });
        }

        if (categoryId && categoryId !== 'all') {
            const filterId = String(categoryId);

            filteredData = filteredData.filter(row => {



                const directId = String(row.id_categoria ?? '');


                const nestedId = String(row.c?.id ?? '');

                const matches = directId === filterId || nestedId === filterId;

                return matches;
            });
        }



        return filteredData;
    }

    _getGlobalSwitchInitialState(fieldName) {
        const dataToCheck = this.filterData();

        if (dataToCheck.length === 0) {
            return false;
        }

        const allAreActive = dataToCheck.every(product => product[fieldName] === true);

        return allAreActive;
    }

    _updateTableBodyOnly(dataSlice, isCrudTable, indexOffset) {
        const tableBody = this.displayElement.querySelector('.data-table tbody');
        const paginationControls = this.displayElement.querySelector('.pagination-controls');
        const recordCountSpan = this.displayElement.querySelector('.record-count');

        const tableName = this.currentTable;
        const totalRecords = this.filterData().length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        if (recordCountSpan) {
            recordCountSpan.textContent = `Total: ${totalRecords} registros visibles (${dataSlice.length} en esta página)`;
        }

        if (tableBody) {
            const globalControlsRow = this.currentTable === 'producto' ? this._renderGlobalControlsRow() : '';

            const newBodyContent = globalControlsRow + dataSlice.map((row, index) =>
                this.renderRow(row, tableName, isCrudTable, indexOffset + index)
            ).join('');

            tableBody.innerHTML = newBodyContent;
        }

        if (paginationControls) {
            paginationControls.outerHTML = this._renderPaginationControls(totalPages);
        }

        this.enableCrudListeners(tableName);

        if (tableName === 'producto') {
            this.setupGlobalControlsListeners(tableName);
        }
    }

    _renderGlobalSwitch(fieldName, label) {
        const isChecked = this._getGlobalSwitchInitialState(fieldName);
        const checkedAttribute = isChecked ? 'checked' : '';

        return `
            <label class="switch" title="Control Global para ${label}">
                <input 
                    type="checkbox" 
                    class="global-switch-toggle"
                    data-field="${fieldName}"
                    ${checkedAttribute}
                >
                <span class="slider round"></span>
            </label>
        `;
    }

    _renderGlobalControlsRow() {
        if (this.currentTable !== 'producto') return '';

        const labelColSpan = 5;

        const switchMostrarPrecio = `
            <div class="global-switch-item">
                <span class="switch-label">Mostrar Precio</span>
                ${this._renderGlobalSwitch('mostrar_precio', 'Mostrar Precio')}
            </div>
        `;
        const switchHabilitarWhatsApp = `
            <div class="global-switch-item">
                <span class="switch-label">WhatsApp</span>
                ${this._renderGlobalSwitch('habilitar_whatsapp', 'Habilitar WhatsApp')}
            </div>
        `;
        const switchHabilitarFormulario = `
            <div class="global-switch-item">
                <span class="switch-label">Form. Contacto</span>
                ${this._renderGlobalSwitch('habilitar_formulario', 'Habilitar Formulario')}
            </div>
        `;

        return `
            <tr class="global-controls-row">
                <td colspan="${labelColSpan}" class="global-controls-cell global-controls-cell-label">
                    <span class="global-controls-label">Opciones Globales:</span>
                </td> 
                
                <td colspan="2" class="global-controls-cell global-switches-wrapper">
                    <div class="global-switches-container">
                        ${switchMostrarPrecio}
                        ${switchHabilitarWhatsApp}
                        ${switchHabilitarFormulario}
                    </div>
                </td>
            </tr>
        `;
    }

    async loadTable() {
        const tableName = this.currentTable;
        const linkText = this.currentLinkText;

        const categoryFilterHtml = await this._renderCategoryFilter();

        const backButtonHTML = this.backToDashboardCallback ?
            `<div class="back-button-row-wrapper">
                <button id="back-to-dashboard-btn" class="btn-secondary-action" title="Volver al Panel Principal de Administración">
                    <i class="fas fa-arrow-left"></i> Volver al Panel
                </button>
            </div>` : '';


        const createAndBulkButtons = TABLES_ALLOWING_CREATE.includes(tableName) ?
            `<div class="action-buttons-wrapper">
                <button id="add-new-record-btn" class="btn-secondary-action" title="Añadir Nuevo ${linkText}">
                    <i class="fas fa-plus"></i> Añadir Nuevo
                </button>
                <button id="bulk-upload-btn-trigger" class="btn-secondary-action" title="Carga Masiva de Productos">
                    <i class="fas fa-upload"></i> Carga Masiva
                </button>
            </div>` : '';


        this.displayElement.innerHTML = `
            ${backButtonHTML} 
            
            <div class="table-header-wrapper">
                
                <div class="header-title-actions-wrapper"> 
                    <div class="header-and-counter-wrapper">
                        <h2>Gestión de la Tabla: ${linkText}</h2>
                        
                    </div>
                    ${createAndBulkButtons} 
                    <div class="record-count-wrapper top-right-counter">
                            <span class="record-count">Cargando...</span>
                        </div>
                </div>

                <div class="filter-controls-container-row"> 
                    <div id="${SEARCH_FILTER_CONTAINER_ID}" class="filter-controls-container">
                        ${this._renderSearchBoxContent()} 
                        ${categoryFilterHtml} 
                    </div>
                </div>

            </div>
            
            <div id="table-content-wrapper">
                ${this.loadingHTML}
            </div>
        `;

        this.setupSearchAndFilterListeners();
        this.setupBackButtonListener();
        this.setupCreateAndBulkButtonListeners(tableName);

        if (tableName === 'producto') {
            this.setupGlobalControlsListeners(tableName);
        }

        const service = SERVICE_MAP[tableName];
        const config = REPORT_CONFIG[tableName];
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        if (!config || !service) {
            tableContentWrapper.innerHTML = `<p class="error-message">Configuración o Servicio no encontrado para la tabla: ${tableName}</p>`;
            return;
        }

        try {
            const data = await service.fetchData(config.select);
            this.fullData = data;

            if (this.fullData.length > 0) {


                if (this.fullData[0].id_categoria === undefined && this.fullData[0].c?.id === undefined) {

                }
            }

            this.currentPage = 1;
            this.currentSearchTerm = '';
            this.renderCurrentPage();

        } catch (e) {

            tableContentWrapper.innerHTML = `<p class="error-message">Error al cargar la tabla ${linkText}: ${e.message}</p>`;
        }
    }

    setupBackButtonListener() {
        const backButton = document.getElementById('back-to-dashboard-btn');
        if (backButton && this.backToDashboardCallback) {
            backButton.addEventListener('click', () => {
                this.backToDashboardCallback();
            });
        }
    }

    setupCreateAndBulkButtonListeners(tableName) {
        const createButton = document.getElementById('add-new-record-btn');
        if (createButton) {
            createButton.addEventListener('click', () => {
                this.showForm(tableName, 'create');
            });
        }

        const bulkUploadButton = document.getElementById('bulk-upload-btn-trigger');
        if (bulkUploadButton) {
            bulkUploadButton.addEventListener('click', () => {
                this.showBulkUploadForm();
            });
        }
    }

    renderCurrentPage() {
        const tableName = this.currentTable;
        const linkText = this.currentLinkText;
        const config = REPORT_CONFIG[tableName];

        if (!config || !this.fullData) return;

        const filteredData = this.filterData();

        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;

        const dataSlice = filteredData.slice(startIndex, endIndex);

        const tableWrapper = this.displayElement.querySelector('#table-content-wrapper');
        const isTableDrawn = tableWrapper && tableWrapper.querySelector('.data-table');

        if (!isTableDrawn || dataSlice.length === 0 && (this.currentSearchTerm || this.currentCategoryId)) {

            this.renderTable(tableName, linkText, dataSlice, true, config.headers, totalRecords, totalPages);
            this.enableCrudListeners(tableName);
        } else {
            this._updateTableBodyOnly(dataSlice, true, startIndex);
        }
    }

    _renderBooleanSwitchWithLabel(id, fieldName, value, label) {
        const isChecked = value === true || value === 'true';
        const checkedAttribute = isChecked ? 'checked' : '';

        return `
            <div class="switch-item">
                <span class="data-switch-label">${label}</span>
                <label class="switch" title="${label}">
                    <input 
                        type="checkbox" 
                        class="data-switch-toggle"
                        data-id="${id}"
                        data-field="${fieldName}"
                        ${checkedAttribute}
                    >
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }


    _getFileNameFromUrl(url) {
        if (!url) return 'Sin Imagen';
        try {

            const match = url.match(/\/([^/?#]+)(?:\?.*)?$/);
            if (match && match[1]) {
                const cleanName = decodeURIComponent(match[1]).split('?')[0];


                return cleanName.length > 30 ? cleanName.substring(0, 30) + '...' : cleanName;
            }

            return url.substring(0, 30) + '...';

        } catch (e) {

            return url.substring(0, 30) + '... (URL inválida)';
        }
    }

    renderRow(row, tableName, isCrudTable, indexOffset) {
        const config = REPORT_CONFIG[tableName];
        const rowId = row[config.id_key];
        const rowNumber = indexOffset + 1;

        const categoriaNombre = row.c ? row.c.nombre : 'N/A';
        const isInactive = row['visible'] === false;
        const rowClass = isInactive ? 'inactive-record' : '';
        const deleteTitle = isInactive ? 'Registro Eliminado/Inactivo' : 'Eliminar';

        const mostrarPrecio = row.mostrar_precio === true;
        const habilitarWhatsApp = row.habilitar_whatsapp === true;
        const habilitarFormulario = row.habilitar_formulario === true;


        const imageInfo = this._getFileNameFromUrl(row.imagen_url);

        let rowCells = `
            <td class="product-cell">
                <div class="product-info-wrapper">
                    <div class="product-image">
                        ${row.imagen_url ? `<img src="${row.imagen_url}" alt="Imagen" title="Archivo: ${imageInfo}">` : 'Sin Imagen'}
                    </div>
                    <div class="product-details">
                        <span class="product-name">${(row.nombre ?? '').length > 20 ? (row.nombre ?? '').substring(0, 20) + '...' : row.nombre ?? ''}</span>
                        
                        <span class="product-description">${(row.descripcion ?? '').substring(0, 50)}...</span>
                    </div>
                </div>
            </td>
            <td>Bs. ${parseFloat(row.precio ?? 0).toFixed(2)}</td>
            <td>${row.stock ?? 0}</td>
            <td><span class="category-badge">${categoriaNombre}</span></td> 
            
            <td class="switch-controls-wrapper"> 
                <div class="individual-switches-container">
                    ${this._renderBooleanSwitchWithLabel(rowId, 'mostrar_precio', mostrarPrecio, 'Precio')}
                    ${this._renderBooleanSwitchWithLabel(rowId, 'habilitar_whatsapp', habilitarWhatsApp, 'WhatsApp')}
                    ${this._renderBooleanSwitchWithLabel(rowId, 'habilitar_formulario', habilitarFormulario, 'Form. Contacto')}
                </div>
            </td>
        `;

        return `
            <tr data-id="${rowId}" class="${rowClass}">
                <td>${rowNumber}</td> ${rowCells}
                ${isCrudTable ? `
                    <td class="action-column">
                        <button class="btn-action btn-edit" data-id="${rowId}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-action btn-delete" data-id="${rowId}" title="${deleteTitle}" ${isInactive ? 'disabled' : ''}>
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                ` : ''}
            </tr>
        `;
    }

    renderTable(tableName, linkText, dataSlice, isCrudTable, headers, totalRecords, totalPages) {
        const recordText = 'registros visibles';
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        const recordCountSpan = this.displayElement.querySelector('.record-count');
        if (recordCountSpan) {
            recordCountSpan.textContent = `Total: ${totalRecords} ${recordText} (${dataSlice.length} en esta página)`;
        }

        if (!dataSlice || dataSlice.length === 0) {
            tableContentWrapper.innerHTML = `<p class="info-message">No se encontraron ${recordText} en la tabla ${tableName}.</p>`;
            return;
        }

        const globalControlsRow = tableName === 'producto' ? this._renderGlobalControlsRow() : '';

        let headerHTML = '';

        if (tableName === 'producto') {
            headerHTML = `
                <tr>
                    <th>N°</th>
                    <th>PRODUCTO</th>
                    <th>PRECIO UNIT.</th>
                    <th>STOCK</th>
                    <th>CATEGORÍA</th>
                    <th>OPCIONES</th> 
                    ${isCrudTable ? '<th class="action-column">ACCIONES</th>' : ''}
                </tr>
            `;
        } else {
            headerHTML = `
                <tr>
                    <th>N°</th> ${headers
                    .filter(header => {
                        const upperHeader = header.toUpperCase().trim().replace('.', '');
                        return upperHeader !== 'N°' && upperHeader !== '#' && upperHeader !== 'NÚMERO'
                    })
                    .map(header => `<th>${header.toUpperCase()}</th>`).join('')
                }
                    ${isCrudTable ? '<th>ACCIONES</th>' : ''}
                </tr>
            `;
        }

        let tableHTML = `
            <div class="table-responsive">
            <table class="data-table">
                <thead>
                    ${headerHTML}
                </thead>
                <tbody>
                    ${globalControlsRow} ${dataSlice.map((row, index) => this.renderRow(row, tableName, isCrudTable, (this.currentPage - 1) * this.itemsPerPage + index)).join('')}
                </tbody>
            </table>
            </div>
            ${this._renderPaginationControls(totalPages)}
        `;

        tableContentWrapper.innerHTML = tableHTML;
    }

    _renderSearchBoxContent() {
        const searchInstructions = 'Busca por Nombre o Categoría';
        return `
            <div class="search-box">
                <div class="input-group">
                    <input type="text" id="table-search-input" placeholder="${searchInstructions}" class="input-text-search" value="${this.currentSearchTerm}">

                </div>
            </div>
        `;
    }

    async _renderCategoryFilter() {
        if (!this.categoryService) return '';

        let categoryOptions = '<option value="all">Todas las Categorías</option>';
        const selectedId = String(this.currentCategoryId);

        try {
            const categories = await this.categoryService.fetchData();

            categories.forEach(cat => {
                const isSelected = String(cat.id) === selectedId;
                categoryOptions += `<option value="${cat.id}" ${isSelected ? 'selected' : ''}>${cat.nombre}</option>`;
            });

        } catch (e) {

            return `
                <div class="form-group filter-select-error">
                    <label>Categoría:</label>
                    <select class="input-select" disabled>
                        <option>Error al cargar categorías</option>
                    </select>
                </div>
            `;
        }

        return `
            <div class="form-group filter-select-category">
                <label for="category-filter-select">Categoría:</label>
                <select id="category-filter-select" class="input-select">
                    ${categoryOptions}
                </select>
            </div>
        `;
    }

    setupSearchAndFilterListeners() {
        const searchContainer = document.getElementById(SEARCH_FILTER_CONTAINER_ID);
        if (!searchContainer) return;

        const searchInput = searchContainer.querySelector('#table-search-input');
        const categorySelect = searchContainer.querySelector('#category-filter-select');

        if (searchInput) {
            searchInput.oninput = () => {
                this.currentSearchTerm = searchInput.value;

                clearTimeout(this.searchTimeout);

                this.searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.renderCurrentPage();
                }, 300);
            };
        }

        if (categorySelect) {
            categorySelect.onchange = () => {
                this.currentCategoryId = categorySelect.value;

                this.currentPage = 1;
                this.renderCurrentPage();
            };
        }
    }

    setupGlobalControlsListeners(tableName) {
        if (tableName === 'producto') {
            this.displayElement.querySelectorAll('.global-switch-toggle').forEach(input => {
                input.removeEventListener('change', this.globalToggleHandler);

                if (!this.globalToggleHandler) {
                    this.globalToggleHandler = (e) => this.handleGlobalToggle(e.currentTarget);
                }

                input.addEventListener('change', this.globalToggleHandler);
            });
        }
    }

    enableCrudListeners(tableName) {

        this.displayElement.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.showForm(tableName, 'edit', id);
            });
        });

        this.displayElement.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const rowData = this.fullData.find(d => String(d[REPORT_CONFIG[tableName].id_key]) === id);

                const isVisible = rowData?.visible !== false;

                if (!isVisible) return;

                if (confirm(`¿Está seguro de que desea eliminar este producto?`)) {
                    this.toggleVisibility(id, isVisible);
                }
            });
        });

        if (tableName === 'producto') {
            this.setupSwitchToggleListeners();
            this.setupGlobalControlsListeners(tableName);
        }

        this.setupPaginationListeners();
    }

    async handleGlobalToggle(inputElement) {
        const service = SERVICE_MAP[this.currentTable];
        if (!service) {
            alert('Error: Servicio de producto no disponible.');
            return;
        }

        const fieldName = inputElement.getAttribute('data-field');
        const newValue = inputElement.checked;

        const filteredProducts = this.filterData();
        const idKey = REPORT_CONFIG[this.currentTable].id_key;
        const productIdsToUpdate = filteredProducts.map(p => p[idKey]);

        if (productIdsToUpdate.length === 0) {
            alert('No hay productos visibles que coincidan con el filtro de búsqueda para actualizar.');
            inputElement.checked = !newValue;
            return;
        }

        const confirmationText = `¿Está seguro de que desea establecer '${fieldName}' en ${newValue ? 'ACTIVADO (ON)' : 'DESACTIVADO (OFF)'} para los ${productIdsToUpdate.length} productos actualmente visibles (según el filtro)?`;

        if (!confirm(confirmationText)) {
            inputElement.checked = !newValue;
            return;
        }

        inputElement.disabled = true;
        const parentLabel = inputElement.closest('.switch');
        if (parentLabel) parentLabel.classList.add('loading');

        try {
            await service.bulkUpdateByIds(productIdsToUpdate, fieldName, newValue);

            this.fullData.forEach(record => {
                const recordId = record[idKey];
                if (productIdsToUpdate.includes(recordId)) {
                    record[fieldName] = newValue;
                }
            });

            alert(`✅ El campo '${fieldName}' ha sido actualizado a ${newValue ? 'ON' : 'OFF'} para los ${productIdsToUpdate.length} productos filtrados.`);

            inputElement.checked = newValue;

            this.renderCurrentPage();

        } catch (error) {

            alert(`❌ Error al actualizar globalmente: ${error.message}. Se revertirá el interruptor.`);
            inputElement.checked = !newValue;
        } finally {
            inputElement.disabled = false;
            if (parentLabel) parentLabel.classList.remove('loading');
        }
    }

    setupSwitchToggleListeners() {
        this.displayElement.querySelectorAll('.data-switch-toggle').forEach(switchInput => {
            switchInput.addEventListener('change', async (e) => {
                const input = e.target;
                const id = input.getAttribute('data-id');
                const fieldName = input.getAttribute('data-field');
                const newValue = input.checked;

                await this.updateProductFieldFromSwitch(id, fieldName, newValue, input);
            });
        });
    }

    async updateProductFieldFromSwitch(id, fieldName, newValue, inputElement) {
        const service = SERVICE_MAP[this.currentTable];
        const originalValue = !newValue;

        inputElement.disabled = true;
        const parentLabel = inputElement.closest('.switch');
        if (parentLabel) parentLabel.classList.add('loading');

        try {
            const dataToUpdate = { [fieldName]: newValue };
            await service.updateField(id, dataToUpdate);

            const record = this.fullData.find(d => String(d[REPORT_CONFIG[this.currentTable].id_key]) === id);
            if (record) {
                record[fieldName] = newValue;
            }

            this.renderCurrentPage();

        } catch (error) {

            alert(`Error al actualizar el campo: ${error.message}. Se revertirá el interruptor.`);
            inputElement.checked = originalValue;
        } finally {
            inputElement.disabled = false;
            if (parentLabel) parentLabel.classList.remove('loading');
        }
    }


    async showForm(tableName, action, id = null) {
        const configForm = CRUD_FIELDS_CONFIG[tableName];
        const service = SERVICE_MAP[tableName];

        if (!configForm || !service) {
            alert(`Error: Configuración o Servicio no encontrado para la tabla ${tableName}.`);
            return;
        }

        const titleText = action === 'create' ? 'Nuevo Producto' : 'Editar Producto';

        this.modalTitle.textContent = titleText;
        this.modalBody.innerHTML = this.loadingHTML;
        this.modal.classList.add('active');

        let formData = {};
        if (action === 'edit' && id) {
            try {
                formData = await service.getById(id);
            } catch (e) {
                this.modalBody.innerHTML = `<p class="error-message">Error al cargar datos del ID ${id}. ${e.message}</p>`;
                return;
            }
        }

        let categoryOptions = [];

        const categoryField = configForm.find(f => f.name === 'id_categoria' && f.type === 'select');
        if (categoryField) {
            const categoryService = SERVICE_MAP['categoria'];
            if (categoryService) {
                try {
                    categoryOptions = await categoryService.fetchData();
                } catch (e) {

                }
            }
        }

        const fieldsLeft = ['nombre', 'descripcion', 'id_categoria'];
        const fieldsRight = ['precio', 'stock', 'file_upload'];
        let formFieldsLeftHTML = '';
        let formFieldsRightHTML = '';
        let otherFieldsHTML = '';

        const processField = (field) => {
            let currentValue = formData[field.name] ?? '';
            const requiredAttr = field.required ? 'required' : '';
            const stepAttr = field.step ? `step="${field.step}"` : '';
            const numberClass = field.type === 'number' ? ' input-number' : '';
            const placeholderText = field.placeholder || `Ingrese ${field.label.toLowerCase().replace(/\s\(id\)/g, '')}`;
            const disabledAttrBase = field.disabled ? 'disabled' : '';

            if (field.type === 'checkbox') {
                const isChecked = formData[field.name] === true || currentValue === 'on' || (action === 'create' && field.default === true && currentValue === '');
                const checkedAttr = isChecked ? 'checked' : '';

                return `
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="${field.name}" name="${field.name}" class="input-checkbox" ${checkedAttr} ${disabledAttrBase}>
                        <label for="${field.name}">${field.label}</label>
                    </div>
                `;
            }

            if (field.name === 'file_upload') {
                const currentImage = formData.imagen_url || '';

                const imagePreviewHTML = (action === 'edit' && currentImage) ? `
                    <div class="image-preview-wrapper">
                        <label style="font-weight: 600; color: #555; font-size: 0.9em; margin-top: 15px; display: block;">Imagen Actual</label>
                        <div class="image-current-info" id="current-image-info-${id}" style="display: flex; align-items: center; gap: 10px; border: 1px solid #ddd; padding: 5px; border-radius: 5px; justify-content: space-between;">
                            <div class="image-thumbnail" style="flex-shrink: 0;">
                                <img src="${currentImage}" alt="Imagen Actual" style="max-width: 50px; max-height: 50px; object-fit: contain;">
                            </div>
                            <span class="image-filename" style="flex-grow: 1; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this._getFileNameFromUrl(currentImage)}</span>
                            <button type="button" class="btn-action btn-delete-details delete-image-btn" data-id="${id}" title="Eliminar Imagen Actual" style="flex-shrink: 0; margin: 0; padding: 5px;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                ` : '';

                return `
                    <div class="form-group upload-image-container">
                        <label for="${field.name}">Subir Imagen (Max 2MB):</label>
                        <div class="file-upload-area">
                            <input type="file" class="input-file" id="${field.name}" name="${field.name}" accept="image/png, image/jpeg, image/gif" ${action === 'create' && field.required ? requiredAttr : ''}>
                            <div class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Subir un archivo o arrastrar y soltar</p>
                                <p class="file-info">PNG, JPG, GIF hasta 2MB</p>
                            </div>
                        </div>
                        ${imagePreviewHTML}
                    </div>
                `;
            }

            if (field.type === 'select') {
                let optionsHTML = `<option value="">-- Seleccionar ${field.label} --</option>`;
                const selectedValue = formData[field.name];

                optionsHTML += categoryOptions.map(option => {
                    const isSelected = String(option.id) === String(selectedValue);
                    return `<option value="${option.id}" ${isSelected ? 'selected' : ''}>${option.id ? option.nombre : option.text}</option>`;
                }).join('');

                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}:</label>
                        <select id="${field.name}" name="${field.name}" class="input-select" ${requiredAttr} ${disabledAttrBase}>
                            ${optionsHTML}
                        </select>
                    </div>
                `;
            }

            if (field.type === 'textarea') {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}:</label>
                        <textarea class="input-textarea" id="${field.name}" name="${field.name}" ${requiredAttr} placeholder="${placeholderText}" ${disabledAttrBase}>${currentValue}</textarea>
                    </div>
                `;
            }

            if (field.type === 'hidden') {
                return `<input type="hidden" id="${field.name}" name="${field.name}" value="${currentValue}">`;
            }


            let maxLengthAttr = '';
            if (field.name === 'nombre') {
                maxLengthAttr = 'maxlength="20"';
            }

            return `
                <div class="form-group">
                    <label for="${field.name}">${field.label}:</label>
                    <input type="${field.type}" class="input-text${numberClass}" id="${field.name}" name="${field.name}" value="${currentValue}" ${requiredAttr} ${stepAttr} placeholder="${placeholderText}" ${disabledAttrBase} ${maxLengthAttr}>
                </div>
            `;
        };

        configForm.forEach(field => {
            let fieldHTML = processField(field);

            if (field.type === 'hidden') {
                otherFieldsHTML += fieldHTML;
                return;
            }

            if (fieldsLeft.includes(field.name)) {
                formFieldsLeftHTML += fieldHTML;
            } else if (fieldsRight.includes(field.name)) {
                formFieldsRightHTML += fieldHTML;
            } else {
                otherFieldsHTML += fieldHTML;
            }
        });

        const formHTML = `
            <form id="crud-form" class="modal-grid-form" enctype="multipart/form-data">
                ${otherFieldsHTML}
                <div class="form-column column-left">
                    ${formFieldsLeftHTML}
                </div>
                <div class="form-column column-right">
                    ${formFieldsRightHTML}
                </div>
                <div class="form-footer grid-footer">
                    <button type="button" class="btn-cancel-modal" id="form-cancel-btn">Cancelar</button>
                    <button type="submit" class="btn-primary-modal">
                        <i class="fas fa-save"></i> ${action === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        `;

        this.modalBody.innerHTML = formHTML;

        document.getElementById('crud-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(tableName, action, id);
        });

        document.getElementById('form-cancel-btn').addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        if (action === 'edit' && id) {
            const deleteImageBtn = this.modalBody.querySelector('.delete-image-btn');
            if (deleteImageBtn) {
                deleteImageBtn.addEventListener('click', (e) => {
                    const productId = e.currentTarget.getAttribute('data-id');
                    this.deleteProductImage(productId);
                });
            }
        }
    }

    async deleteProductImage(id) {
        const service = SERVICE_MAP['producto'];
        const productData = this.fullData.find(d => String(d[REPORT_CONFIG['producto'].id_key]) === id);
        const fileName = this._getFileNameFromUrl(productData?.imagen_url) || 'la imagen actual';

        if (!service || !service.deleteImage) {
            alert('Error: La función de eliminación de imagen no está disponible en ProductoService.');
            return;
        }

        const confirmationText = `¿Está seguro de que desea eliminar permanentemente la imagen '${fileName}' de la base de datos? Esta acción es irreversible.`;

        if (!confirm(confirmationText)) {
            return;
        }

        const deleteButton = this.modalBody.querySelector('.delete-image-btn');
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteButton.classList.add('loading');
        }

        try {
            await service.deleteImage(id);

            const imageInfoWrapper = document.getElementById(`current-image-info-${id}`);
            if (imageInfoWrapper) {
                const previewWrapper = imageInfoWrapper.closest('.image-preview-wrapper');
                if (previewWrapper) {
                    previewWrapper.remove();
                }
            }

            const record = this.fullData.find(d => String(d[REPORT_CONFIG['producto'].id_key]) === id);
            if (record) {
                record.imagen_url = '';
            }

            alert('✅ Imagen eliminada con éxito. Para que el cambio sea definitivo, recuerde presionar "Guardar Cambios".');

        } catch (error) {

            alert(`❌ Error al eliminar la imagen: ${error.message}`);
        } finally {
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.classList.remove('loading');
            }
        }
    }




    showBulkUploadForm() {
        this.modalTitle.textContent = 'Carga Masiva de Productos (CSV/Excel)';
        this.modalBody.innerHTML = `
            <form id="bulk-upload-form">
                <p class="info-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Asegúrese de que su archivo CSV incluye las columnas necesarias. Puede usar <strong>'id_categoria'</strong> (ID numérico) o <strong>'nombre_categoria'</strong> (nombre exacto) para la categoría.
                </p>
                <div class="form-group upload-image-container">
                    <label for="bulk-file">Archivo de Carga (.csv, .xlsx):</label>
                    <div class="file-upload-area">
                        <input type="file" class="input-file" id="bulk-file" name="bulk-file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" required>
                        <div class="upload-placeholder">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Subir un archivo o arrastrar y soltar</p>
                            <p class="file-info">CSV, XLSX hasta 5MB</p>
                        </div>
                    </div>
                </div>
                <div class="form-footer">
                    <button type="button" class="btn-cancel-modal" id="bulk-cancel-btn">Cancelar</button>
                    <button type="submit" class="btn-primary-modal" id="bulk-upload-btn">
                        <i class="fas fa-file-import"></i> Procesar Archivo
                    </button>
                </div>
            </form>
        `;
        this.modal.classList.add('active');

        document.getElementById('bulk-cancel-btn').addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        document.getElementById('bulk-upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulk-file');
            if (fileInput.files.length > 0) {
                this.handleBulkUploadSubmit(fileInput.files[0]);
            } else {
                alert('Debe seleccionar un archivo.');
            }
        });
    }



    async handleBulkUploadSubmit(file) {


        const submitButton = document.getElementById('bulk-upload-btn');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Leyendo archivo...';

        const productService = SERVICE_MAP['producto'];

        if (typeof Papa === 'undefined') {
            alert("❌ Error: La librería PapaParse (para CSV) no está cargada. No se puede procesar el archivo.");
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fas fa-file-import"></i> Procesar Archivo';
            return;
        }

        let parsedData = [];

        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parseando archivo...';

            parsedData = await new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {


                        const validData = results.data.filter(row => row && row.nombre && String(row.nombre).trim() !== '');
                        resolve(validData);
                    },
                    error: (err) => reject(err)
                });
            });

            if (parsedData.length === 0) {
                throw new Error("El archivo no contiene datos válidos o está vacío.");
            }

        } catch (parseError) {

            alert(`❌ Error al leer el archivo: ${parseError.message}`);
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-file-import"></i> Procesar Archivo';
            return;
        }

        const categoryMap = await this._getCategoryNameMap();
        if (Object.keys(categoryMap).length === 0) {
            alert('❌ No se pudo cargar el mapa de categorías. Verifique la conexión.');
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fas fa-file-import"></i> Procesar Archivo';
            return;
        }

        let productsToInsert = [];
        let failedRecords = [];

        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando y Mapeando...';

            for (const record of parsedData) {
                let categoryId = null;


                if (record.id_categoria && parseInt(record.id_categoria) > 0) {
                    categoryId = parseInt(record.id_categoria);
                }

                else if (record.nombre_categoria) {
                    const categoryName = this._normalizeString(record.nombre_categoria);
                    categoryId = categoryMap[categoryName];
                }

                if (categoryId) {
                    const productDataToSave = {
                        ...record,
                        id_categoria: categoryId,

                        precio: parseFloat(record.precio) || 0,
                        stock: parseInt(record.stock) || 0,

                        visible: record.visible !== undefined ? (String(record.visible).toLowerCase() === 'true' || record.visible === 1) : true,
                        mostrar_precio: record.mostrar_precio !== undefined ? (String(record.mostrar_precio).toLowerCase() === 'true' || record.mostrar_precio === 1) : true,
                        habilitar_whatsapp: record.habilitar_whatsapp !== undefined ? (String(record.habilitar_whatsapp).toLowerCase() === 'true' || record.habilitar_whatsapp === 1) : false,
                        habilitar_formulario: record.habilitar_formulario !== undefined ? (String(record.habilitar_formulario).toLowerCase() === 'true' || record.habilitar_formulario === 1) : false,
                        imagen_url: record.imagen_url || ''
                    };

                    delete productDataToSave.nombre_categoria;
                    productsToInsert.push(productDataToSave);

                } else {
                    failedRecords.push({
                        ...record,
                        error: `No se encontró 'id_categoria' válido ni 'nombre_categoria' coincidente.`
                    });
                }
            }

            let successfulUploads = 0;
            if (productsToInsert.length > 0) {
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Insertando datos masivamente...';


                await productService.bulkCreate(productsToInsert);

                successfulUploads = productsToInsert.length;
            }

            this.modal.classList.remove('active');
            alert(`✅ Proceso finalizado. Subidos con éxito: ${successfulUploads}. Fallidos: ${failedRecords.length}.`);

            if (failedRecords.length > 0) {

                alert(`⚠️ Hubo registros fallidos. Revise la consola (F12) para ver los detalles de los ${failedRecords.length} productos que no se pudieron cargar.`);
            }

            await this.loadTable();

        } catch (error) {

            alert(`❌ Error crítico en el procesamiento: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-file-import"></i> Procesar Archivo';
        }
    }





    async handleFormSubmit(tableName, action, id = null) {
        const form = document.getElementById('crud-form');
        const submitButton = form.querySelector('.btn-primary-modal');
        const service = SERVICE_MAP[tableName];
        const isEdit = action === 'edit';

        if (!service) {
            alert('Error: Servicio no encontrado para el envío del formulario.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const formData = new FormData(form);
        const data = {};
        let fileToUpload = null;

        for (const [key, value] of formData.entries()) {
            if (key === 'file_upload') {
                if (value && value.size > 0) {
                    fileToUpload = value;
                }
            } else if (form.elements[key].type === 'checkbox') {
            } else if (key === 'precio' || key === 'stock') {
                data[key] = parseFloat(value) || 0;
            } else {
                data[key] = value;
            }
        }

        CRUD_FIELDS_CONFIG[tableName]?.forEach(field => {
            if (field.type === 'checkbox') {
                data[field.name] = formData.has(field.name) && formData.get(field.name) === 'on';
            }
        });

        try {
            let result;

            if (fileToUpload) {
                result = await service.uploadAndSave(id, data, fileToUpload, isEdit);
            } else if (isEdit) {
                result = await service.update(id, data);
            } else {
                result = await service.create(data);
            }

            this.modal.classList.remove('active');
            alert(`✅ Producto ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            await this.loadTable();

        } catch (error) {

            alert(`❌ Error al guardar el registro: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Producto'}`;
        }
    }

    async toggleVisibility(id, isVisible) {
        const service = SERVICE_MAP[this.currentTable];
        if (!service) return;

        const confirmationText = isVisible
            ? "¿Está seguro de que desea ELIMINAR/INACTIVAR este registro (ocultarlo al público)?"
            : "¿Está seguro de que desea REACTIVAR este registro (mostrarlo al público)?";

        if (confirm(confirmationText)) {
            try {
                await service.updateField(id, { visible: !isVisible });
                alert(`Registro ${!isVisible ? 'reactivado' : 'eliminado/inactivado'} con éxito.`);
                await this.loadTable();
            } catch (error) {

                alert("Error al actualizar la visibilidad del registro.");
            }
        }
    }


    setupPaginationListeners() {
        this.displayElement.querySelectorAll('.page-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.getAttribute('data-page'));
                if (!isNaN(page) && page >= 1) {
                    this.goToPage(page);
                }
            });
        });
    }

    goToPage(page) {
        const totalRecords = this.filterData().length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentPage();
            this.displayElement.querySelector('.data-table')?.scrollIntoView({ behavior: 'smooth' });
        }
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
                <button class="page-btn" id="first-page-btn" data-page="1" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
                <button class="page-btn" id="prev-page-btn" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                ${pagesHtml}
                <button class="page-btn" id="next-page-btn" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
                <button class="page-btn" id="last-page-btn" data-page="${totalPages}" ${this.currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>
            </div>
        `;
    }
}