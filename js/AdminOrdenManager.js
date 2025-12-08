import { REPORT_CONFIG, CRUD_FIELDS_CONFIG } from './config/tableConfigs.js';
import { OrdenService } from './services/OrdenService.js';
import { UsuarioService } from './services/UsuarioService.js';
import { DireccionService } from './services/DireccionService.js';
import { ZonaService } from './services/ZonaService.js';
import { LocalidadService } from './services/LocalidadService.js';
import { MunicipioService } from './services/MunicipioService.js';
import { DepartamentoService } from './services/DepartamentoService.js';

const SEARCH_FILTER_CONTAINER_ID = 'search-filter-controls-wrapper';

const SERVICE_MAP = {
    'orden': OrdenService,
    'UsuarioService': UsuarioService,
    'DireccionService': DireccionService,
    'ZonaService': ZonaService,
    'LocalidadService': LocalidadService,
    'MunicipioService': MunicipioService,
    'DepartamentoService': DepartamentoService,
};

const TABLES_ALLOWING_CREATE = ['orden'];

export class AdminOrdenManager {

    constructor(displayElementId, modalId = 'crud-modal') {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.currentTable = 'orden';

        this.fullData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentLinkText = 'Órdenes';

        this.currentSearchTerm = '';
        this.searchTimeout = null;
        this.ciValidationTimeout = null;

        this.loadingHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando datos...</div>';

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

    setupSearchAndFilterListeners() {
        const searchContainer = document.getElementById(SEARCH_FILTER_CONTAINER_ID);
        if (!searchContainer) return;

        const searchInput = searchContainer.querySelector('#table-search-input');

        if (searchInput) {
            searchInput.oninput = () => {
                const newTerm = searchInput.value;

                clearTimeout(this.searchTimeout);

                this.searchTimeout = setTimeout(() => {
                    this.currentSearchTerm = newTerm;
                    this.currentPage = 1;
                    this.renderCurrentPage();
                }, 300);
            };
        }
    }

    enableCrudListeners(tableName) {
        const allowCreate = TABLES_ALLOWING_CREATE.includes(tableName);

        if (allowCreate) {
            this.displayElement.querySelector('.btn-create')?.addEventListener('click', () => {
                this.showForm(tableName, 'create');
            });
        }

        this.displayElement.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.showForm(tableName, 'edit', id);
            });
        });

        this.displayElement.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;

                if (confirm(`¿Está seguro de eliminar esta orden?`)) {
                    this.toggleVisibility(id, false);
                }
            });
        });

        this.setupPaginationListeners();
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
        const filteredData = this.filterData();
        const totalPages = Math.ceil(filteredData.length / this.itemsPerPage);

        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentPage();
            this.displayElement.querySelector('.data-table')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async toggleVisibility(id, isVisible) {

        if (isVisible === true) {
            return;
        }

        const tableName = this.currentTable;
        const service = SERVICE_MAP[tableName];
        if (!service || !service.update) {
            return;
        }

        const updatePayload = new FormData();
        updatePayload.append('visible', 'false');


        try {
            const result = await service.update(id, updatePayload);
            alert(`Registro eliminado con éxito!`);
            this.loadTable();
        } catch (e) {
            alert(`Error al eliminar el registro: ${e.message}`);
        }
    }

    filterData() {
        const term = this.currentSearchTerm.toLowerCase().trim();
        const data = this.fullData;

        if (!term) {
            const result = data.filter(row => row.visible !== false);
            return result;
        }

        const filteredData = data.filter(row => {
            if (row.visible === false) return false;

            const u = row.u;
            const clienteCompleto = `${u?.primer_nombre || ''} ${u?.segundo_nombre || ''} ${u?.apellido_paterno || ''} ${u?.apellido_materno || ''}`.trim().toLowerCase();

            const ordenId = String(row.id || '').toLowerCase();
            const total = String(row.total || '').toLowerCase();
            const estado = (row.estado || '').toLowerCase();
            const fecha = (row.fecha || '').toLowerCase();

            return clienteCompleto.includes(term) ||
                ordenId.includes(term) ||
                total.includes(term) ||
                estado.includes(term) ||
                fecha.includes(term);
        });

        return filteredData;
    }

    _updateTableBodyOnly(dataSlice, isCrudTable, indexOffset) {
        const tableBody = this.displayElement.querySelector('.data-table tbody');
        const paginationControls = this.displayElement.querySelector('.pagination-controls');
        const recordCountSpan = this.displayElement.querySelector('.record-count-wrapper .record-count');

        const tableName = this.currentTable;
        const filteredData = this.filterData();
        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        if (recordCountSpan) {
            recordCountSpan.textContent = `Total: ${totalRecords} registros visibles (${dataSlice.length} en esta página)`;
        }

        if (tableBody) {
            tableBody.innerHTML = dataSlice.map((row, index) =>
                this.renderRow(row, tableName, isCrudTable, indexOffset + index)
            ).join('');
        }

        if (paginationControls) {
            paginationControls.outerHTML = this._renderPaginationControls(totalPages);
        }

        this.enableCrudListeners(tableName);
    }

    async loadTable() {
        const tableName = this.currentTable;
        const linkText = this.currentLinkText;

        this.displayElement.innerHTML = `
            <div class="header-controls-wrapper">
                <h2>Gestión de la Tabla: ${linkText}</h2>
                <div class="action-buttons">
                    <button class="btn-primary btn-create" data-table="${tableName}"><i class="fas fa-plus"></i> Crear Nuevo</button>
                </div>
                <span class="record-count-wrapper">
                    <span class="record-count">Cargando...</span>
                </span>
            </div>
            
            ${this._renderSearchAndFilterBox(tableName)}
            
            <div id="table-content-wrapper">
                ${this.loadingHTML}
            </div>
        `;

        const service = SERVICE_MAP[tableName];
        const config = REPORT_CONFIG[tableName];
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        if (!config || !service) {
            tableContentWrapper.innerHTML = `<p class="error-message">Configuración o Servicio no encontrado para la tabla: ${tableName}</p>`;
            return;
        }

        try {
            const params = {
                select: config.select,
                order: 'id.asc',
            };

            const data = await service.fetchData(params);

            this.fullData = data;
            this.currentPage = 1;
            this.currentSearchTerm = '';

            this.setupSearchAndFilterListeners();
            this.renderCurrentPage();

        } catch (e) {
            tableContentWrapper.innerHTML = `<p class="error-message">Error al cargar la tabla ${linkText}: ${e.message}</p>`;
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

        if (!isTableDrawn || (dataSlice.length === 0 && this.currentSearchTerm)) {
            this.renderTable(tableName, linkText, dataSlice, true, totalRecords, totalPages);
            this.enableCrudListeners(tableName);
        } else {
            this._updateTableBodyOnly(dataSlice, true, startIndex);
        }
    }

    getDisplayHeaders() {
        return REPORT_CONFIG[this.currentTable].headers;
    }

    renderTable(tableName, linkText, dataSlice, isCrudTable, totalRecords, totalPages) {
        const recordText = 'órdenes visibles';
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        const recordCountSpan = this.displayElement.querySelector('.record-count-wrapper .record-count');
        if (recordCountSpan) {
            recordCountSpan.textContent = `Total: ${totalRecords} ${recordText} (${dataSlice.length} en esta página)`;
        }

        if (!dataSlice || dataSlice.length === 0) {
            tableContentWrapper.innerHTML = `<p class="info-message">No se encontraron ${recordText} que coincidan con la búsqueda.</p>`;
            this.displayElement.querySelectorAll('.pagination-controls').forEach(e => e.remove());
            return;
        }

        const contentHeaders = this.getDisplayHeaders();

        let tableHTML = `
            <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        ${contentHeaders.map(header => `<th>${header.toUpperCase()}</th>`).join('')}
                        ${isCrudTable ? '<th>ACCIONES</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${dataSlice.map((row, index) => this.renderRow(row, tableName, isCrudTable, (this.currentPage - 1) * this.itemsPerPage + index)).join('')}
                </tbody>
            </table>
            </div>
            ${this._renderPaginationControls(totalPages)}
        `;

        tableContentWrapper.innerHTML = tableHTML;
    }

    _renderSearchAndFilterBox(tableName) {
        const searchInstructions = 'Buscar por N° de orden, cliente, total, o estado...';
        return `
            <div id="${SEARCH_FILTER_CONTAINER_ID}" class="filter-controls-container">
                <div class="search-box full-width">
                    <div class="input-group">
                        <input type="text" id="table-search-input" placeholder="${searchInstructions}" class="input-text-search" value="${this.currentSearchTerm}">
                        <i class="fas fa-search search-icon"></i>
                    </div>
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
                <button class="page-btn" id="first-page-btn" data-page="1" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
                <button class="page-btn" id="prev-page-btn" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                ${pagesHtml}
                <button class="page-btn" id="next-page-btn" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
                <button class="page-btn" id="last-page-btn" data-page="${totalPages}" ${this.currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>
            </div>
        `;
    }

    renderRow(row, tableName, isCrudTable, index) {
        const config = REPORT_CONFIG[tableName];
        const rowId = row[config.id_key];

        const isInactive = !row['visible'];
        const deleteDisabled = isInactive;
        const deleteTitle = isInactive ? 'Registro Eliminado' : 'Eliminar';

        const finalFields = [
            'id',
            'cliente_nombre',
            'fecha',
            'total',
            'metodo_pago',
            'direccion_completa',
            'estado',
        ];

        let rowCells = finalFields.map(fieldName => {
            let cellValue = '';

            switch (fieldName) {
                case 'id':
                    cellValue = row.id;
                    break;
                case 'cliente_nombre':
                    const u = row.u;
                    cellValue = `${u?.primer_nombre || ''} ${u?.segundo_nombre || ''} ${u?.apellido_paterno || ''} ${u?.apellido_materno || ''}`.trim();
                    break;
                case 'fecha':
                    cellValue = row.fecha ? new Date(row.fecha).toLocaleDateString('es-ES', {
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    }) : 'N/A';
                    break;
                case 'total':
                    cellValue = `Bs ${parseFloat(row.total || 0).toFixed(2)}`;
                    break;
                case 'metodo_pago':
                    cellValue = (row[fieldName] || '').toUpperCase();
                    break;
                case 'estado':
                    cellValue = (row[fieldName] || 'N/D').toUpperCase();
                    break;
                case 'direccion_completa':
                    const d = row.d;
                    if (d) {
                        const calle = d.calle_avenida || '';
                        const numero = d.numero_casa_edificio || 'S/N';
                        const ref = d.referencia_adicional ? `(Ref: ${d.referencia_adicional})` : '';

                        const zona = d.z?.nombre || 'Zona Desconocida';
                        const localidad = d.l?.nombre || 'Localidad Desconocida';
                        const municipio = d.l?.m?.nombre || 'Municipio Desconocido';
                        const depto = d.l?.m?.dpt?.nombre || 'Departamento Desconocido';

                        cellValue = `
                            ${calle}, ${numero} ${ref}<br>
                            <small class="text-muted">
                                <strong>Zona</strong>: ${zona}<br>
                            </small>
                        `;
                    } else {
                        cellValue = 'Dirección no disponible';
                    }
                    break;
            }

            return `<td>${cellValue}</td>`;
        }).join('');

        const rowClass = isInactive ? 'inactive-record' : '';

        return `
            <tr data-id="${rowId}" class="${rowClass}">
                ${rowCells} ${isCrudTable ? `
                    <td>
                        <button class="btn-action btn-edit" data-id="${rowId}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-action btn-delete" data-id="${rowId}" title="${deleteTitle}" ${deleteDisabled ? 'disabled' : ''}>
                             <i class="fas fa-trash-alt"></i>
                           </button>
                    </td>
                ` : ''}
            </tr>
        `;
    }

    async _fetchAddressHierarchy(id_direccion) {
        const service = DireccionService;
        if (!service || !service.getFullHierarchyById) {
            return {};
        }
        try {
            return await service.getFullHierarchyById(id_direccion);
        } catch (e) {
            return {};
        }
    }

    async _loadSelectOptions(serviceName, dependencyValue = null, selectedValue = null) {
        const service = SERVICE_MAP[serviceName];
        if (!service || !service.getSelectOptions) return '';

        try {
            const optionsData = await service.getSelectOptions(dependencyValue);

            let optionsHTML = '';

            if (optionsData && Array.isArray(optionsData)) {
                optionsHTML += optionsData.map(option => {
                    const value = option.value ?? option.id ?? option.id_direccion;
                    const text = option.text ?? option.nombre ?? option.texto_display;

                    const isSelected = String(value) === String(selectedValue);
                    return `<option value="${value}" ${isSelected ? 'selected' : ''}>${text}</option>`;
                }).join('');
            }
            return optionsHTML;

        } catch (e) {
            return '<option value="" disabled>Error al cargar</option>';
        }
    }

    _setupCascadeListeners(action) {
        const form = document.getElementById('crud-form');
        const selects = form.querySelectorAll('select[data-dependency]');

        selects.forEach(dependentSelect => {
            const dependencyName = dependentSelect.dataset.dependency;

            if (!dependencyName) return;

            const dependencySelect = form.querySelector(`#${dependencyName}`);

            if (dependencySelect) {
                const optionsService = dependentSelect.dataset.optionsService;

                const handler = async (e) => {
                    const parentValue = e.target.value;
                    const dependentId = dependentSelect.id;

                    const valueToKeep = (action === 'edit' && dependentSelect.value) ? dependentSelect.value : null;


                    dependentSelect.innerHTML = '<option value="">Cargando...</option>';
                    dependentSelect.classList.add('disabled-cascade');
                    dependentSelect.disabled = true;

                    if (parentValue) {
                        const newOptions = await this._loadSelectOptions(optionsService, parentValue, valueToKeep);

                        const label = dependentSelect.previousElementSibling.textContent.replace(':', '');
                        dependentSelect.innerHTML = `<option value="">-- Seleccionar ${label} --</option>` + newOptions;
                        dependentSelect.classList.remove('disabled-cascade');
                        dependentSelect.disabled = false;
                    } else {
                        const dependencyLabel = dependencySelect.previousElementSibling?.textContent.replace(':', '').replace(' (Propietario)', '').replace(' del Cliente', '').toUpperCase() || dependencyName.replace('_form', '').replace('id_', '').toUpperCase();

                        dependentSelect.innerHTML = `<option value="">-- Seleccionar primero ${dependencyLabel} --</option>`;
                        dependentSelect.classList.add('disabled-cascade');
                        dependentSelect.disabled = true;
                    }

                    const nextDependent = form.querySelector(`select[data-dependency="${dependentId}"]`);
                    if (nextDependent) {
                        setTimeout(() => nextDependent.dispatchEvent(new Event('change')), 0);
                    }
                };

                dependencySelect.removeEventListener('change', handler);
                dependencySelect.addEventListener('change', handler);
            }
        });

        if (action === 'edit') {
            const form = document.getElementById('crud-form');
            const cascadeSelects = [
                form.querySelector('#id_departamento_form'),
            ].filter(select => select && select.value);

            cascadeSelects.forEach((select) => {
                setTimeout(() => {
                    select.dispatchEvent(new Event('change'));
                }, 100);
            });
        }
    }


    async showForm(tableName, action, id = null) {
        const configForm = CRUD_FIELDS_CONFIG[tableName];

        if (!configForm || !SERVICE_MAP[tableName]) {
            alert(`Error: Configuración o Servicio no encontrado para la tabla ${tableName}.`);
            return;
        }

        const titleText = action === 'create' ? 'Nueva Orden' : 'Editar Orden';

        this.modalTitle.textContent = titleText;
        this.modalBody.innerHTML = this.loadingHTML;
        this.modal.classList.add('active');


        let formData = {};
        let initialCiValue = '';
        let direccionData = null;
        let addressHierarchy = {};

        if (action === 'edit' && id) {
            try {
                formData = await SERVICE_MAP[tableName].getById(id);

                initialCiValue = formData.ci_cliente || '';
                direccionData = formData.direccion_data;
                
                if (formData.id_direccion) {
                    addressHierarchy = formData.addressHierarchy || {}; 

                    if (direccionData) {
                        formData['calle_avenida'] = direccionData.calle_avenida;
                        formData['numero_casa_edificio'] = direccionData.numero_casa_edificio;
                        formData['referencia_adicional'] = direccionData.referencia_adicional;

                        formData['id_departamento_form'] = addressHierarchy.id_departamento;
                        formData['id_municipio_form'] = addressHierarchy.id_municipio;
                        formData['id_localidad_form'] = addressHierarchy.id_localidad;
                        formData['id_zona'] = addressHierarchy.id_zona;
                    }
                }

            } catch (e) {
                this.modalBody.innerHTML = `<p class="error-message">Error al cargar datos del registro. ${e.message}</p>`;
                return;
            }
        }

        let filteredConfigForm = configForm.filter(field =>
            !['visible', 'observaciones'].includes(field.name)
        );

        const directionFields = [
            { name: 'id_departamento_form', label: 'Departamento', type: 'select', required: true, options_service: 'DepartamentoService' },
            { name: 'id_municipio_form', label: 'Municipio', type: 'select', required: true, options_service: 'MunicipioService', dependency: 'id_departamento_form' },
            { name: 'id_localidad_form', label: 'Localidad', type: 'select', required: true, options_service: 'LocalidadService', dependency: 'id_municipio_form' },
            { name: 'id_zona', label: 'Zona', type: 'select', required: true, options_service: 'ZonaService', dependency: 'id_localidad_form' },
            { name: 'calle_avenida', label: 'Calle/Avenida', type: 'text', required: true, placeholder: 'Ej: Av. Brasil' },
            { name: 'numero_casa_edificio', label: 'Número Casa/Edificio', type: 'text', required: true, placeholder: 'Ej: 1234' },
            { name: 'referencia_adicional', label: 'Referencia Adicional', type: 'textarea', required: false, placeholder: 'Ej: Frente a la farmacia' },
        ];

        let finalFields = [];
        for (const field of filteredConfigForm) {
            if (field.name === 'id_direccion') {
                finalFields.push(...directionFields);
                finalFields.push({ name: 'id_direccion', type: 'hidden' });
            } else {
                finalFields.push(field);
            }
        }


        const fieldPromises = finalFields.map(async field => {
            let currentValue = formData[field.name] ?? '';
            let fieldConfig = { ...field };

            const requiredAttr = fieldConfig.required ? 'required' : '';
            const stepAttr = fieldConfig.step ? `step="${fieldConfig.step}"` : '';
            const numberClass = fieldConfig.type === 'number' ? ' input-number' : '';

            const placeholderText = fieldConfig.placeholder ||
                (fieldConfig.label ? `Ingrese ${fieldConfig.label.toLowerCase().replace(/\s\(id\)/g, '')}` : '');

            let disabledAttrBase = fieldConfig.disabled ? 'disabled' : '';

            if (fieldConfig.name === 'fecha') {
                if (action === 'create' || action === 'edit') {
                    disabledAttrBase = '';
                }

                if (action === 'create') {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    currentValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                } else if (currentValue) {
                    const date = new Date(currentValue);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    currentValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            }

            if (fieldConfig.type === 'hidden') {
                return `<input type="hidden" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}">`;
            }

            if (fieldConfig.name === 'id_usuario' && fieldConfig.type === 'select') {
                const hiddenUserId = currentValue;

                const ciLabel = 'Cédula de Identidad (CI) del Cliente';
                const ciPlaceholder = 'Ingrese CI del cliente (ej: 1234567)';

                const ciValue = action === 'edit' ? initialCiValue : '';
                const requiredAttr = fieldConfig.required ? 'required' : '';

                return `
                    <div class="form-group ci-validation-wrapper">
                        <label for="ci_cliente">${ciLabel}:</label>
                        <input type="text" class="input-text" id="ci_cliente" name="ci_cliente" value="${ciValue}" ${requiredAttr} placeholder="${ciPlaceholder}">
                        <div id="ci-validation-message" class="validation-message"></div>
                        
                        <input type="hidden" id="id_usuario" name="id_usuario" value="${hiddenUserId}">
                    </div>
                `;
            }

            if (fieldConfig.type === 'select') {

                if (fieldConfig.dependency || fieldConfig.name.endsWith('_form') || fieldConfig.name === 'id_zona') {

                    let dependencyValue = null;
                    let selectedValue = currentValue;
                    let initialOptionsHTML = '';

                    if (action === 'edit' && addressHierarchy) {
                        if (fieldConfig.name === 'id_departamento_form') {
                            selectedValue = addressHierarchy.id_departamento;
                        } else if (fieldConfig.name === 'id_municipio_form') {
                            selectedValue = addressHierarchy.id_municipio;
                            dependencyValue = addressHierarchy.id_departamento;
                        } else if (fieldConfig.name === 'id_localidad_form') {
                            selectedValue = addressHierarchy.id_localidad;
                            dependencyValue = addressHierarchy.id_municipio;
                        } else if (fieldConfig.name === 'id_zona') {
                            selectedValue = addressHierarchy.id_zona;
                            dependencyValue = addressHierarchy.id_localidad;
                        }
                    }

                    const isFirstLevel = fieldConfig.name === 'id_departamento_form';
                    const loadInitial = isFirstLevel || (action === 'edit' && dependencyValue !== null);

                    if (fieldConfig.options_service && loadInitial) {
                        initialOptionsHTML = await this._loadSelectOptions(
                            fieldConfig.options_service,
                            dependencyValue,
                            selectedValue
                        );
                    } else if (fieldConfig.dependency) {
                        const dependencyNameDisplay = fieldConfig.dependency.replace('_form', '').replace('id_', '').toUpperCase();

                        initialOptionsHTML = `<option value="">-- Seleccionar primero ${dependencyNameDisplay} --</option>`;
                    }

                    const isRequired = fieldConfig.required ? 'required' : '';
                    const disabledClass = !isFirstLevel && dependencyValue === null && action !== 'edit' ? 'disabled-cascade' : '';
                    const disabledAttr = disabledClass ? 'disabled' : '';

                    return `
                        <div class="form-group cascade-select-wrapper">
                            <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                            <select id="${fieldConfig.name}" name="${fieldConfig.name}" 
                                class="input-select ${disabledClass}" 
                                data-dependency="${fieldConfig.dependency || ''}"
                                data-options-service="${fieldConfig.options_service || ''}"
                                ${isRequired} 
                                ${fieldConfig.disabled || disabledAttr}
                            >
                                <option value="">-- Seleccionar ${fieldConfig.label} --</option>
                                ${initialOptionsHTML}
                            </select>
                        </div>
                    `;
                }

                let optionsData = [];
                let optionsHTML = '';
                const selectedValue = currentValue;

                try {
                    if (fieldConfig.is_enum) {
                        optionsData = fieldConfig.options.map(val => ({ value: val, text: val.charAt(0).toUpperCase() + val.slice(1) }));
                    } else if (fieldConfig.options_service) {
                        const selectService = SERVICE_MAP[fieldConfig.options_service];
                        if (selectService && selectService.getSelectOptions) {
                            optionsData = await selectService.getSelectOptions();
                        } else if (selectService && selectService.fetchData) {
                            optionsData = await selectService.fetchData();
                        }
                    }
                } catch (e) {
                }

                optionsHTML = `<option value="">-- Seleccionar ${fieldConfig.label} --</option>`;

                optionsHTML += optionsData.map(option => {
                    const value = option.value ?? option.id;
                    const text = option.text ?? option.nombre;

                    const isSelected = String(value).toLowerCase().trim() === String(selectedValue).toLowerCase().trim();

                    return `<option value="${value}" ${isSelected ? 'selected' : ''}>${text}</option>`;
                }).join('');

                return `
                    <div class="form-group">
                        <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                        <select id="${fieldConfig.name}" name="${fieldConfig.name}" class="input-select" ${requiredAttr} ${disabledAttrBase}>
                            ${optionsHTML}
                        </select>
                    </div>
                `;
            }

            else if (fieldConfig.type === 'textarea') {
                return `
                        <div class="form-group">
                            <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                            <textarea class="input-textarea" id="${fieldConfig.name}" name="${fieldConfig.name}" placeholder="${placeholderText}" ${requiredAttr} ${disabledAttrBase}>${currentValue}</textarea>
                        </div>
                    `;
            }

            else {
                return `
                    <div class="form-group">
                        <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                        <input type="${fieldConfig.type}" class="input-text${numberClass}" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}" ${requiredAttr} ${stepAttr} placeholder="${placeholderText}" ${disabledAttrBase}>
                    </div>
                `;
            }
        });

        const formFieldsHTML = await Promise.all(fieldPromises).then(results => results.join(''));

        const totalValue = action === 'edit' ? `Bs ${parseFloat(formData['total'] || 0).toFixed(2)}` : '0.00';
        const totalDisplay = action === 'edit' ? `
            <div class="form-group">
                <label>Total de la Orden:</label>
                <input type="text" class="input-text input-number" value="${totalValue}" disabled>
                <small class="info-message">El total se calcula automáticamente con los ítems de la orden (no editable aquí).</small>
            </div>
        ` : '';

        const hiddenTotal = `<input type="hidden" name="total" value="${formData['total'] || '0.00'}">`;


        const formHTML = `
            <form id="crud-form">
                ${totalDisplay}
                ${hiddenTotal}
                ${formFieldsHTML}
                <div class="form-footer">
                    <button type="submit" class="btn-primary-modal">
                        <i class="fas fa-save"></i> ${action === 'create' ? 'Crear' : 'Guardar Cambios'}
                    </button>
                    <button type="button" class="btn-cancel-modal" id="form-cancel-btn">Cancelar</button>
                </div>
            </form>
        `;

        this.modalBody.innerHTML = formHTML;

        const ciInput = document.getElementById('ci_cliente');
        const idUsuarioInput = document.getElementById('id_usuario');
        const ciMessage = document.getElementById('ci-validation-message');


        if (ciInput && idUsuarioInput) {

            if (action === 'edit' && ciInput.value.length > 0) {
                ciMessage.textContent = '✅ CI cargado. Usuario encontrado (Para cambiar el cliente, ingrese un nuevo CI).';
                ciMessage.style.color = '#28a745';
            } else {
                idUsuarioInput.value = '';
            }

            ciInput.addEventListener('input', () => {
                clearTimeout(this.ciValidationTimeout);
                const ci = ciInput.value.trim();

                if (ci.length === 0) {
                    ciMessage.textContent = '';
                    idUsuarioInput.value = '';
                    return;
                }

                if (ci.length < 5) {
                    ciMessage.textContent = 'Ingrese al menos 5 dígitos para buscar.';
                    ciMessage.style.color = '#ffc107';
                    idUsuarioInput.value = '';
                    return;
                }

                this.ciValidationTimeout = setTimeout(async () => {
                    ciMessage.textContent = 'Buscando CI...';
                    ciMessage.style.color = '#ffc107';

                    try {
                        const userId = await SERVICE_MAP['UsuarioService'].getIdByCi(ci);

                        if (userId) {
                            ciMessage.textContent = '✅ CI válido. Usuario encontrado.';
                            ciMessage.style.color = '#28a745';
                            idUsuarioInput.value = userId;
                        } else {
                            ciMessage.textContent = '❌ CI no encontrado en la base de datos.';
                            ciMessage.style.color = '#dc3545';
                            idUsuarioInput.value = '';
                        }
                    } catch (e) {
                        ciMessage.textContent = `Error al buscar: ${e.message}`;
                        ciMessage.style.color = '#dc3545';
                        idUsuarioInput.value = '';
                    }
                }, 500);
            });
        }

        this._setupCascadeListeners(action);

        document.getElementById('crud-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(tableName, action, id);
        });

        document.getElementById('form-cancel-btn').addEventListener('click', () => {
            this.modal.classList.remove('active');
        });
    }

    async handleFormSubmit(tableName, action, id = null) {
        const form = document.getElementById('crud-form');
        const formData = new FormData(form);
        const service = SERVICE_MAP[tableName];

        if (!service) return;


        const id_usuario = formData.get('id_usuario')?.trim();
        const ci_cliente = formData.get('ci_cliente')?.trim();
        const metodo_pago = formData.get('metodo_pago')?.trim();
        const estado = formData.get('estado')?.trim();

        const id_zona = formData.get('id_zona')?.trim();
        const calle_avenida = formData.get('calle_avenida')?.trim();
        const numero_casa_edificio = formData.get('numero_casa_edificio')?.trim();

        if (!ci_cliente || !metodo_pago || !estado) {
            alert("Los campos obligatorios (CI del Cliente, Método de Pago y Estado) deben ser completados.");
            return;
        }
        if (!id_usuario) {
            alert("El CI ingresado no corresponde a un cliente existente. Por favor, valide el CI.");
            return;
        }

        if (!id_zona || !calle_avenida || !numero_casa_edificio) {
            alert("Debe completar todos los campos de la dirección (Zona, Calle/Av, Número de Casa/Edificio).");
            return;
        }

        formData.delete('ci_cliente');
        formData.delete('id_departamento_form');
        formData.delete('id_municipio_form');

        if (action === 'edit') {
            const idDireccionAnterior = formData.get('id_direccion');
            if (idDireccionAnterior) {
            }
        }

        if (action === 'create') {
            formData.delete('id');
        }

        const finalPayload = {};
        for (let pair of formData.entries()) {
            finalPayload[pair[0]] = pair[1];
        }


        try {
            if (action === 'create') {
                await service.create(formData);
                alert(`Registro creado con éxito!`);
            } else {
                await service.update(id, formData);
                alert(`Registro actualizado con éxito!`);
            }

            this.modal.classList.remove('active');
            this.loadTable();
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        }
    }
}