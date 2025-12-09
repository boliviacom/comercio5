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
        
        // Propiedades para gestionar el formulario por pasos
        this.currentStep = 1;
        this.maxSteps = 3;
        this.stepData = {}; 
        this.isFormSubmitting = false;

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

    // --- Métodos de Listado y Tabla (Omitidos por brevedad) ---

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

        const tableName = this.currentTable;
        const filteredData = this.filterData();
        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);

        const countSpan = this.displayElement.querySelector('.header-with-nav .table-actions .record-count');
        if (countSpan) {
            countSpan.textContent = `Total: ${totalRecords} registros visibles (${dataSlice.length} en esta página)`;
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
            <div class="header-with-nav">
                <button class="btn-secondary-action" id="back-to-panel-btn"><i class="fas fa-arrow-left"></i> Volver al Panel</button>
                <div class="table-actions">
                    <h2>Gestión de la Tabla: ${linkText}</h2>
                    <button class="btn-primary btn-create" data-table="${tableName}"><i class="fas fa-plus"></i> Crear Nuevo</button>
                    <span class="record-count">Cargando...</span>
                </div>
            </div>
            
            ${this._renderSearchAndFilterBox(tableName)}
            
            <div id="table-content-wrapper">
                ${this.loadingHTML}
            </div>
        `;

        const service = SERVICE_MAP[tableName];
        const config = REPORT_CONFIG[tableName];
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        document.getElementById('back-to-panel-btn')?.addEventListener('click', () => {
            console.log('Volver al panel principal...');
        });

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

        const recordCountSpan = this.displayElement.querySelector('.header-with-nav .table-actions .record-count');
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
                        const localidad = d.z?.l?.nombre || 'Localidad Desconocida';

                        cellValue = `
                            ${calle}, ${numero} ${ref}<br>
                            <small class="text-muted">
                                <strong>Zona</strong>: ${zona}<br>
                                <strong>Localidad</strong>: ${localidad}
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
                ${rowCells} 
                ${isCrudTable ? `
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
    
    // -------------------------------------------------------------------------
    // --- Métodos de Formulario por Pasos (Modificados) -----------------------
    // -------------------------------------------------------------------------

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

    _setupCascadeListeners() {
        const form = document.getElementById('step-form-body');
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
                    const selectedValue = this.stepData[dependentId] || null;
                    
                    dependentSelect.innerHTML = '<option value="">Cargando...</option>';
                    dependentSelect.classList.add('disabled-cascade');
                    dependentSelect.disabled = true;

                    if (parentValue) {
                        const newOptions = await this._loadSelectOptions(optionsService, parentValue, selectedValue);

                        const label = dependentSelect.previousElementSibling.textContent.replace(':', '');
                        dependentSelect.innerHTML = `<option value="">-- Seleccionar ${label} --</option>` + newOptions;
                        dependentSelect.classList.remove('disabled-cascade');
                        dependentSelect.disabled = false;
                    } else {
                        const dependencyLabel = dependencySelect.previousElementSibling?.textContent.replace(':', '').replace(' del Cliente', '').toUpperCase() || dependencyName.replace('_form', '').replace('id_', '').toUpperCase();

                        dependentSelect.innerHTML = `<option value="">-- Seleccionar primero ${dependencyLabel} --</option>`;
                        dependentSelect.classList.add('disabled-cascade');
                        dependentSelect.disabled = true;
                    }

                    const nextDependent = form.querySelector(`select[data-dependency="${dependentId}"]`);
                    if (nextDependent) {
                        setTimeout(() => nextDependent.dispatchEvent(new Event('change')), 0);
                    }
                    
                    // Asegurar que el valor del select recién cargado se guarde en stepData
                    this.stepData[dependentId] = dependentSelect.value;
                };

                dependencySelect.removeEventListener('change', handler);
                dependencySelect.addEventListener('change', handler);
            }
        });
        
        // **IMPORTANTE para el MODO EDICIÓN:**
        if (this.currentStep === 2 && this.stepData.crud_action === 'edit') {
            const selectsToTrigger = [
                form.querySelector('#id_departamento_form'),
                form.querySelector('#id_municipio_form'),
                form.querySelector('#id_localidad_form'),
            ];

            selectsToTrigger.forEach((select) => {
                if(select && select.value) {
                    setTimeout(() => {
                        select.dispatchEvent(new Event('change'));
                    }, 10);
                }
            });
        }
    }

    _getStepConfig() {
        // Mejorar la información del cliente para el paso 3
        let clienteInfo = 'CI no validado';
        if (this.stepData.cliente_nombre && this.stepData.ci_cliente) {
            clienteInfo = `${this.stepData.cliente_nombre} (CI: ${this.stepData.ci_cliente})`;
        } else if (this.stepData.ci_cliente) {
             clienteInfo = `CI: ${this.stepData.ci_cliente}`;
        }
        
        const totalValue = this.stepData.total ? `Bs ${parseFloat(this.stepData.total).toFixed(2)}` : '0.00';

        // Campos de Dirección
        const directionFields = [
            { name: 'id_departamento_form', label: 'Departamento', type: 'select', required: true, options_service: 'DepartamentoService' },
            { name: 'id_municipio_form', label: 'Municipio', type: 'select', required: true, options_service: 'MunicipioService', dependency: 'id_departamento_form' },
            { name: 'id_localidad_form', label: 'Localidad', type: 'select', required: true, options_service: 'LocalidadService', dependency: 'id_municipio_form' },
            { name: 'id_zona', label: 'Zona', type: 'select', required: true, options_service: 'ZonaService', dependency: 'id_localidad_form' },
            { name: 'calle_avenida', label: 'Calle/Avenida', type: 'text', required: true, placeholder: 'Ej: Av. Brasil' },
            { name: 'numero_casa_edificio', label: 'Número Casa/Edificio', type: 'text', required: true, placeholder: 'Ej: 1234' },
            { name: 'referencia_adicional', label: 'Referencia Adicional', type: 'textarea', required: false, placeholder: 'Ej: Frente a la farmacia' },
            { name: 'id_direccion', type: 'hidden' } // <-- Añadido aquí para ser recolectado
        ];
        
        // Campos de Orden (filtros para los que necesitamos)
        const orderFields = CRUD_FIELDS_CONFIG['orden'].filter(f => 
            ['estado', 'metodo_pago', 'fecha', 'total'].includes(f.name)
        );


        return {
            1: {
                title: 'Información del Cliente',
                heading: 'Datos del Cliente',
                fields: [
                    { name: 'ci_cliente', label: 'Cédula de Identidad (CI) del Cliente', type: 'text', required: true, placeholder: 'Ingrese la cédula de identidad', is_ci: true },
                    { name: 'id_usuario', type: 'hidden' },
                ],
            },
            2: {
                title: 'Dirección de Entrega',
                heading: 'Ubicación y Detalles',
                fields: directionFields,
            },
            3: {
                title: 'Detalles Finales',
                heading: 'Resumen de Orden',
                fields: [
                    ...orderFields.filter(f => f.name !== 'total'), // No mostrar el campo total editable
                    { name: 'order_total_display', label: 'Total de la Orden', type: 'display', value: totalValue, placeholder: '0.00' },
                    { name: 'cliente_info_display', label: 'Cliente', type: 'display', value: clienteInfo, placeholder: 'CI no validado' },
                    { name: 'total', type: 'hidden' } // <-- Añadir campo total oculto para el payload
                ],
            },
        };
    }

    _renderStepHeader() {
        const stepConfig = this._getStepConfig();
        const stepTitle = stepConfig[this.currentStep].title;
        const percent = Math.floor((this.currentStep / this.maxSteps) * 100);

        return `
            <div class="step-header">
                <p>Paso ${this.currentStep} de ${this.maxSteps}: <strong>${stepTitle}</strong></p>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percent}%;"></div>
                </div>
            </div>
            <div class="form-content-wrapper">
                <h3>${stepConfig[this.currentStep].heading}</h3>
                <form id="step-form-body">
                    <div class="grid-col-2">
        `;
    }

    _renderStepFooter(action) {
        const isLastStep = this.currentStep === this.maxSteps;
        const submitText = action === 'create' ? 'Finalizar y Crear Orden' : 'Guardar Cambios';

        let footerHTML = `
                    </div> </form> </div> <div class="form-footer step-footer">
        `;

        // Botón "Atrás"
        if (this.currentStep > 1) {
            footerHTML += `<button type="button" class="btn-secondary-modal" id="btn-prev-step">Atrás</button>`;
        } else {
            footerHTML += `<button type="button" class="btn-cancel-modal" id="form-cancel-btn">Cancelar</button>`;
        }

        // Botón "Siguiente" o "Guardar"
        const buttonText = isLastStep ? submitText : 'Siguiente';
        
        footerHTML += `<button type="button" class="btn-primary-modal" id="btn-next-step">
            <i class="fas fa-spinner fa-spin" style="display:none;"></i> 
            <span id="next-button-text">${buttonText}</span>
        </button>`;

        footerHTML += `</div>`;
        return footerHTML;
    }
    
    // Función para manejar el estado de carga del botón Siguiente/Guardar
    _toggleNextButtonLoading(isLoading, newText = null) {
        const button = document.getElementById('btn-next-step');
        if (!button) return;
        
        const spinner = button.querySelector('i.fa-spinner');
        const textSpan = button.querySelector('#next-button-text');
        
        if (isLoading) {
            button.disabled = true;
            spinner.style.display = 'inline-block';
            textSpan.style.display = 'none';
        } else {
            button.disabled = false;
            spinner.style.display = 'none';
            textSpan.style.display = 'inline-block';
            if (newText) {
                textSpan.textContent = newText;
            }
        }
    }

    async _renderStepContent(action) {
        const stepConfig = this._getStepConfig();
        const currentFields = stepConfig[this.currentStep].fields;
        
        let formHTML = '';

        const fieldPromises = currentFields.map(async field => {
            let fieldConfig = { ...field };
            // El valor viene de this.stepData, que se cargó en showForm o se actualizó en la navegación
            let currentValue = this.stepData[fieldConfig.name] ?? ''; 

            const requiredAttr = fieldConfig.required ? 'required' : '';
            const stepAttr = fieldConfig.step ? `step="${fieldConfig.step}"` : '';
            const numberClass = fieldConfig.type === 'number' ? ' input-number' : '';
            const placeholderText = fieldConfig.placeholder || '';
            const disabledAttrBase = fieldConfig.disabled ? 'disabled' : '';

            let generatedHTML = '';


            if (fieldConfig.type === 'hidden') {
                return `<input type="hidden" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}">`;
            } 
            
            if (fieldConfig.type === 'display') {
                return `
                    <div class="form-group">
                        <label>${fieldConfig.label}:</label>
                        <input type="text" class="input-text" value="${fieldConfig.value}" disabled>
                    </div>
                `;
            }

            if (fieldConfig.name === 'fecha') {
                // **AJUSTE DE FECHA PARA EDICIÓN**
                if (currentValue) {
                    const date = new Date(currentValue);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    currentValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                } else if (action === 'create') {
                     // Solo establece la fecha actual si es CREACIÓN y no hay valor
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    currentValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
                
                 generatedHTML = `
                    <div class="form-group">
                        <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                        <input type="datetime-local" class="input-text${numberClass}" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}" ${requiredAttr} ${stepAttr} ${disabledAttrBase}>
                    </div>
                `;
            }
            
            else if (fieldConfig.is_ci) {
                const idUsuario = this.stepData.id_usuario || '';
                
                generatedHTML = `
                    <div class="form-group grid-col-2 ci-validation-wrapper">
                        <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                        <input type="text" class="input-text" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}" ${requiredAttr} placeholder="${placeholderText}">
                        <div id="ci-validation-message" class="validation-message"></div>
                        <input type="hidden" id="id_usuario" name="id_usuario" value="${idUsuario}">
                    </div>
                `;
            }

            else if (fieldConfig.type === 'select') {
                let optionsHTML = '';
                const selectedValue = currentValue;
                
                if (fieldConfig.options_service) {
                    let dependencyValue = fieldConfig.dependency ? this.stepData[fieldConfig.dependency] : null;

                    const isFirstLevel = !fieldConfig.dependency;
                    const loadInitial = isFirstLevel || dependencyValue; 
                    
                    if (fieldConfig.options_service && loadInitial) {
                        optionsHTML = await this._loadSelectOptions(
                            fieldConfig.options_service,
                            dependencyValue,
                            selectedValue
                        );
                    } else if (fieldConfig.dependency && !loadInitial) {
                        const dependencyLabel = fieldConfig.dependency.replace('_form', '').replace('id_', '').toUpperCase();
                        optionsHTML = `<option value="">-- Seleccionar primero ${dependencyLabel} --</option>`;
                    }

                    const isRequired = fieldConfig.required ? 'required' : '';
                    // Usar el valor de this.stepData para determinar si deshabilitar si no hay dependencia cargada
                    const disabledClass = !isFirstLevel && !dependencyValue ? 'disabled-cascade' : '';
                    const disabledAttr = disabledClass ? 'disabled' : '';

                    generatedHTML = `
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
                                ${optionsHTML}
                            </select>
                        </div>
                    `;
                    
                } else { // Enums
                    let optionsData = fieldConfig.options.map(val => ({ value: val, text: val.charAt(0).toUpperCase() + val.slice(1) }));
                    
                    optionsHTML = `<option value="">-- Seleccionar ${fieldConfig.label} --</option>`;

                    optionsHTML += optionsData.map(option => {
                        const isSelected = String(option.value).toLowerCase().trim() === String(selectedValue).toLowerCase().trim();
                        return `<option value="${option.value}" ${isSelected ? 'selected' : ''}>${option.text}</option>`;
                    }).join('');
                    
                    generatedHTML = `
                        <div class="form-group">
                            <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                            <select id="${fieldConfig.name}" name="${fieldConfig.name}" class="input-select" ${requiredAttr} ${disabledAttrBase}>
                                ${optionsHTML}
                            </select>
                        </div>
                    `;
                }

            }

            else if (fieldConfig.type === 'textarea') {
                generatedHTML = `
                        <div class="form-group grid-col-2">
                            <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                            <textarea class="input-textarea" id="${fieldConfig.name}" name="${fieldConfig.name}" placeholder="${placeholderText}" ${requiredAttr} ${disabledAttrBase}>${currentValue}</textarea>
                        </div>
                    `;
            }

            else {
                generatedHTML = `
                    <div class="form-group">
                        <label for="${fieldConfig.name}">${fieldConfig.label}:</label>
                        <input type="${fieldConfig.type}" class="input-text${numberClass}" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}" ${requiredAttr} ${stepAttr} placeholder="${placeholderText}" ${disabledAttrBase}>
                    </div>
                `;
            }

            return generatedHTML;
        });

        formHTML = await Promise.all(fieldPromises).then(results => results.join(''));
        
        return this._renderStepHeader() + formHTML + this._renderStepFooter(action);
    }
    
    async _handleStepFormNavigation(action, id) {
        const form = document.getElementById('step-form-body');
        const formData = new FormData(form);
        const currentStepConfig = this._getStepConfig()[this.currentStep];
        
        // 1. Recolectar datos del paso actual (SIEMPRE se hace primero para preservar los cambios)
        for (const field of currentStepConfig.fields) {
            const value = formData.get(field.name)?.trim() || '';
            this.stepData[field.name] = value;
        }
        
        // **CORRECCIÓN DE NAVEGACIÓN:** Si es 'prev', saltar validación y retroceder.
        if (action === 'prev') {
            this.currentStep--;
            this.refreshForm(this.currentTable, this.stepData.crud_action, this.stepData.crud_id);
            return;
        }

        // --- Lógica de Validación y Avance (action === 'next' o Submit) ---
        
        // 2. Validación de campos obligatorios
        let isValid = true;
        let missingField = '';
        for (const field of currentStepConfig.fields) {
            // Se valida el valor de this.stepData que fue actualizado arriba
            if (field.required && !this.stepData[field.name] && field.type !== 'hidden' && !field.name.endsWith('_display')) {
                isValid = false;
                missingField = field.label || field.name;
                break;
            }
        }

        if (!isValid) {
            alert(`Por favor, complete el campo obligatorio: ${missingField}.`);
            return; 
        }
        
        // 3. Lógica de validación específica del paso 1 (CI)
        if (this.currentStep === 1) {
            const idUsuario = this.stepData.id_usuario;
            const ci = this.stepData.ci_cliente;
            
            if (!ci || !idUsuario) {
                alert('Debe ingresar y validar un CI que corresponda a un cliente existente. Utilice el campo CI y espere el mensaje de confirmación verde.');
                return;
            }
        }

        // 4. Avance
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.refreshForm(this.currentTable, this.stepData.crud_action, this.stepData.crud_id);
        } else {
            // Último paso: Enviar el formulario final
            this.handleStepFormSubmit();
        }
    }

    _setupStepListeners(action, id) {
        const nextButton = document.getElementById('btn-next-step');
        const prevButton = document.getElementById('btn-prev-step');
        const cancelButton = document.getElementById('form-cancel-btn');

        if (nextButton) {
            // Asegurar que el botón está en estado normal al cargar el paso
            const isLastStep = this.currentStep === this.maxSteps;
            const text = action === 'create' ? 'Finalizar y Crear Orden' : 'Guardar Cambios';
            this._toggleNextButtonLoading(this.isFormSubmitting && isLastStep, isLastStep ? text : 'Siguiente');
            
            nextButton.addEventListener('click', () => this._handleStepFormNavigation('next', id));
        }
        if (prevButton) {
            prevButton.addEventListener('click', () => this._handleStepFormNavigation('prev', id));
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.modal.classList.remove('active'));
        }
        
        if (this.currentStep === 1) {
            this._setupCiValidationListener(action);
        }
        
        if (this.currentStep === 2) {
            this._setupCascadeListeners();
        }
        
        // Listener para recolectar datos a medida que se cambian
        document.getElementById('step-form-body')?.addEventListener('change', (e) => {
             this.stepData[e.target.id] = e.target.value;
        });
        document.getElementById('step-form-body')?.addEventListener('input', (e) => {
             this.stepData[e.target.id] = e.target.value;
        });
    }

    _setupCiValidationListener(action) {
        const ciInput = document.getElementById('ci_cliente');
        const idUsuarioInput = document.getElementById('id_usuario');
        const ciMessage = document.getElementById('ci-validation-message');

        if (!ciInput || !idUsuarioInput || !ciMessage) return;
        
        // **MEJORA MODO EDICIÓN:** Cargar estado inicial y mensaje de éxito si ya hay cliente
        if (this.stepData.id_usuario && this.stepData.cliente_nombre) {
            ciMessage.textContent = `✅ Cliente cargado: ${this.stepData.cliente_nombre}`;
            ciMessage.style.color = '#28a745'; 
            idUsuarioInput.value = this.stepData.id_usuario;
        } else {
            idUsuarioInput.value = '';
        }

        const runValidation = async (ci) => {
            this._toggleNextButtonLoading(true, 'Validando CI...');

            ciMessage.textContent = 'Buscando CI...';
            ciMessage.style.color = '#ffc107';
            idUsuarioInput.value = '';

            try {
                const userId = await SERVICE_MAP['UsuarioService'].getIdByCi(ci);

                if (userId) {
                    const userData = await SERVICE_MAP['UsuarioService'].getById(userId);
                    const clienteNombre = `${userData.primer_nombre || ''} ${userData.apellido_paterno || ''}`.trim();
                    
                    ciMessage.textContent = `✅ CI válido. Cliente: ${clienteNombre}`;
                    ciMessage.style.color = '#28a745';
                    idUsuarioInput.value = userId;
                    this.stepData.id_usuario = userId;
                    this.stepData.cliente_nombre = clienteNombre;
                } else {
                    ciMessage.textContent = '❌ CI no encontrado en la base de datos.';
                    ciMessage.style.color = '#dc3545';
                    this.stepData.id_usuario = '';
                    this.stepData.cliente_nombre = '';
                }
            } catch (e) {
                ciMessage.textContent = `Error al buscar: ${e.message}`;
                ciMessage.style.color = '#dc3545';
                this.stepData.id_usuario = '';
                this.stepData.cliente_nombre = '';
            } finally {
                 this._toggleNextButtonLoading(false);
            }
        };

        ciInput.addEventListener('input', () => {
            clearTimeout(this.ciValidationTimeout);
            const ci = ciInput.value.trim();
            this.stepData.ci_cliente = ci;

            if (ci.length === 0) {
                ciMessage.textContent = '';
                idUsuarioInput.value = '';
                this.stepData.id_usuario = '';
                this.stepData.cliente_nombre = ''; // Resetear nombre también
                this._toggleNextButtonLoading(false);
                return;
            }

            if (ci.length < 5) {
                ciMessage.textContent = 'Ingrese al menos 5 dígitos para buscar.';
                ciMessage.style.color = '#ffc107';
                idUsuarioInput.value = '';
                this.stepData.id_usuario = '';
                this.stepData.cliente_nombre = '';
                this._toggleNextButtonLoading(false);
                return;
            }

            this.ciValidationTimeout = setTimeout(() => runValidation(ci), 500);
        });
        
        // Si hay un CI inicial y es nuevo o edición, ejecutar la validación al cargar si aún no hay ID de usuario.
        if (this.stepData.ci_cliente && !this.stepData.id_usuario) {
            runValidation(this.stepData.ci_cliente);
        }
    }

    async refreshForm(tableName, action, id) {
        this.modalBody.innerHTML = this.loadingHTML;
        const contentHTML = await this._renderStepContent(action);
        this.modalBody.innerHTML = contentHTML;
        this._setupStepListeners(action, id);
    }
    
    async showForm(tableName, action, id = null) {
        this.currentTable = tableName;
        this.modalTitle.textContent = action === 'create' ? 'Nueva Orden' : 'Editar Orden';
        this.modal.classList.add('active');
        
        // Resetear estado del formulario por pasos
        this.currentStep = 1;
        this.isFormSubmitting = false;
        
        // Inicialización robusta de stepData
        this.stepData = {
            crud_action: action,
            crud_id: id,
            // Cliente
            id_usuario: null,
            ci_cliente: '',
            cliente_nombre: '', 
            // Orden
            metodo_pago: 'EFECTIVO',
            estado: 'PENDIENTE',
            total: '0.00',
            fecha: null,
            // Dirección
            id_direccion: null,
            id_departamento_form: '', 
            id_municipio_form: '', 
            id_localidad_form: '', 
            id_zona: '',
            calle_avenida: '', 
            numero_casa_edificio: '', 
            referencia_adicional: '',
        };

        if (action === 'edit' && id) {
            try {
                const formData = await SERVICE_MAP[tableName].getById(id);
                
                // Cargar datos de la orden
                this.stepData.total = formData.total || '0.00';
                this.stepData.metodo_pago = formData.metodo_pago || 'EFECTIVO';
                this.stepData.estado = formData.estado || 'PENDIENTE';
                this.stepData.fecha = formData.fecha;
                
                // Cargar datos del cliente
                this.stepData.id_usuario = formData.id_usuario;
                this.stepData.ci_cliente = formData.u?.ci || '';
                this.stepData.cliente_nombre = `${formData.u?.primer_nombre || ''} ${formData.u?.apellido_paterno || ''}`.trim();
                
                // **CORRECCIÓN DE CARGA DE DATOS DE DIRECCIÓN**
                this.stepData.id_direccion = formData.id_direccion;
                if (formData.direccion_data) {
                    const d = formData.direccion_data;
                    this.stepData.calle_avenida = d.calle_avenida || '';
                    this.stepData.numero_casa_edificio = d.numero_casa_edificio || '';
                    this.stepData.referencia_adicional = d.referencia_adicional || '';
                }
                
                // Cargar ID's de jerarquía de dirección (CRUCIAL para selects anidados)
                if (formData.addressHierarchy) {
                    const h = formData.addressHierarchy;
                    this.stepData.id_departamento_form = h.id_departamento || '';
                    this.stepData.id_municipio_form = h.id_municipio || '';
                    this.stepData.id_localidad_form = h.id_localidad || '';
                    this.stepData.id_zona = h.id_zona || '';
                } else if (formData.direccion_data && formData.direccion_data.id_zona) {
                    // Cargar zona directamente si no se usó addressHierarchy (fallback)
                    this.stepData.id_zona = formData.direccion_data.id_zona;
                    
                    // FALLBACK: Si solo tenemos la zona, intentamos cargar los IDs superiores desde LocalidadService
                    if(formData.direccion_data.z?.id_localidad) {
                        this.stepData.id_localidad_form = formData.direccion_data.z.id_localidad;
                        if(formData.direccion_data.z.l?.id_municipio) {
                            this.stepData.id_municipio_form = formData.direccion_data.z.l.id_municipio;
                            if(formData.direccion_data.z.l.m?.id_departamento) {
                                this.stepData.id_departamento_form = formData.direccion_data.z.l.m.id_departamento;
                            }
                        }
                    }
                }
                // FIN CORRECCIÓN CARGA DE DATOS DE DIRECCIÓN

            } catch (e) {
                this.modalBody.innerHTML = `<p class="error-message">Error al cargar datos del registro. ${e.message}</p>`;
                return;
            }
        }
        
        this.refreshForm(tableName, action, id);
    }

    /**
     * Reemplaza la lógica de guardar Dirección y Orden por separado (que fallaba) 
     * con la lógica unificada del archivo anterior.
     * Envía todos los datos de Orden y Dirección en un solo FormData al OrdenService.
     */
    async handleStepFormSubmit() {
        if (this.isFormSubmitting) return;

        this.isFormSubmitting = true;
        const prevText = this.stepData.crud_action === 'create' ? 'Finalizar y Crear Orden' : 'Guardar Cambios';
        this._toggleNextButtonLoading(true, 'Guardando...'); // Iniciar spinner

        const service = SERVICE_MAP[this.currentTable];
        const action = this.stepData.crud_action;
        const id = this.stepData.crud_id;
        
        // --- VALIDACIÓN FINAL Y EXTRACCIÓN DE DATOS ---
        const finalIdUsuario = String(this.stepData.id_usuario || '').trim();
        const finalIdZona = String(this.stepData.id_zona || '').trim();
        const finalCalle = String(this.stepData.calle_avenida || '').trim();
        const finalMetodoPago = String(this.stepData.metodo_pago || '').trim();
        const finalEstado = String(this.stepData.estado || '').trim();
        const finalNumero = String(this.stepData.numero_casa_edificio || '').trim();


        if (!finalIdUsuario) {
            this.isFormSubmitting = false;
            this._toggleNextButtonLoading(false, prevText);
            alert("Error: El ID de Cliente es nulo. Por favor, valide el CI en el Paso 1.");
            return;
        }

        if (!finalMetodoPago || !finalEstado) {
            this.isFormSubmitting = false;
            this._toggleNextButtonLoading(false, prevText);
            alert("Error: Faltan datos obligatorios de la Orden (Método de Pago o Estado).");
            return;
        }

        if (!finalIdZona || !finalCalle || !finalNumero) {
            this.isFormSubmitting = false;
            this._toggleNextButtonLoading(false, prevText);
            alert("Error: La Dirección está incompleta. Faltan Zona, Calle/Avenida o Número de Casa/Edificio.");
            return;
        }
        // --- FIN VALIDACIÓN ---


        // 1. Crear el Payload Unificado
        const ordenPayload = new FormData();
        
        // A. Datos de la ORDEN (Campos principales)
        ordenPayload.append('id_usuario', finalIdUsuario);
        ordenPayload.append('metodo_pago', finalMetodoPago);
        ordenPayload.append('estado', finalEstado);
        
        // 🔑 CORRECCIÓN DEL ERROR 'invalid input syntax for type timestamp with time zone: ""'
        // Solo adjuntar 'fecha' si tiene un valor, para evitar enviar la cadena vacía ("") a la DB.
        if (this.stepData.fecha) {
            ordenPayload.append('fecha', this.stepData.fecha);
        }
        
        ordenPayload.append('total', this.stepData.total);
        
        // B. Datos de la DIRECCIÓN (El servicio de Orden los procesará)
        ordenPayload.append('id_direccion', this.stepData.id_direccion); // Puede ser null/undefined si es nueva
        ordenPayload.append('id_zona', finalIdZona);
        ordenPayload.append('calle_avenida', finalCalle);
        ordenPayload.append('numero_casa_edificio', finalNumero);
        ordenPayload.append('referencia_adicional', this.stepData.referencia_adicional);
        
        
        // **LOG DE DEPURACIÓN FINAL DE PAYLOAD**
        const payloadDebug = {};
        for (const [key, value] of ordenPayload.entries()) {
            payloadDebug[key] = value;
        }
        console.log("[SUBMIT] Payload UNIFICADO enviado a OrdenService:", payloadDebug);
        // ------------------------------------------

        try {
            if (action === 'create') {
                console.log("[SUBMIT] Llamando a OrdenService.create con payload unificado.");
                await service.create(ordenPayload);
                alert(`Orden creada con éxito!`);
            } else {
                console.log("[SUBMIT] Llamando a OrdenService.update con payload unificado. ID:", id);
                await service.update(id, ordenPayload);
                alert(`Orden actualizada con éxito!`);
            }

            this.modal.classList.remove('active');
            this.loadTable();
        } catch (error) {
            this.isFormSubmitting = false;
            this._toggleNextButtonLoading(false, prevText);
            console.error("[SUBMIT ERROR] Error en OrdenService:", error);
            alert(`Error al guardar la Orden: ${error.message}. Por favor, revise la consola para más detalles.`);
        } finally {
             this.isFormSubmitting = false;
        }
    }
}