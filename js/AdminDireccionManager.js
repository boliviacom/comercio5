import { REPORT_CONFIG, CRUD_FIELDS_CONFIG } from './config/tableConfigs.js';
import { DireccionService } from './services/DireccionService.js';
import { UsuarioService } from './services/UsuarioService.js';
import { ZonaService } from './services/ZonaService.js';
import { LocalidadService } from './services/LocalidadService.js';
import { MunicipioService } from './services/MunicipioService.js'; 
import { DepartamentoService } from './services/DepartamentoService.js'; 

const SEARCH_FILTER_CONTAINER_ID = 'search-filter-controls-wrapper'; 

const SERVICE_MAP = {
    'direccion': DireccionService,
    'UsuarioService': UsuarioService,
    'ZonaService': ZonaService,
    'LocalidadService': LocalidadService,
    'MunicipioService': MunicipioService, 
    'DepartamentoService': DepartamentoService, 
};

const TABLES_ALLOWING_CREATE = ['direccion'];

export class AdminDireccionManager {

    constructor(displayElementId, modalId = 'crud-modal', backToDashboardCallback = null) {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.currentTable = 'direccion';

        this.backToDashboardCallback = backToDashboardCallback;

        this.fullData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentLinkText = 'Direcciones';
        
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
    
    setupBackButtonListener() {
        // Usa el ID 'back-to-panel-btn' que solicitaste
        this.displayElement.querySelector('#back-to-panel-btn')?.addEventListener('click', () => {
            if (this.backToDashboardCallback) {
                this.backToDashboardCallback();
            } else {
                console.warn("No se proporcionó una función de callback para volver al panel.");
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

                if (confirm(`¿Está seguro de eliminar la dirección?`)) {
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
        if (isVisible === true) return;

        const tableName = this.currentTable;
        const service = SERVICE_MAP[tableName];
        if (!service || !service.update) return; 

        const updatePayload = new FormData();
        updatePayload.append('visible', 'false');

        try {
            await service.update(id, updatePayload); 
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
            
            const calle = (row.calle_avenida || '').toLowerCase();
            const numeroCasa = (row.numero_casa_edificio || '').toLowerCase();
            const zona = (row.z?.nombre || '').toLowerCase();
            const localidad = (row.z?.l?.nombre || '').toLowerCase(); 
            const referencia = (row.referencia_adicional || '').toLowerCase();

            return clienteCompleto.includes(term) ||
                calle.includes(term) ||
                numeroCasa.includes(term) ||
                zona.includes(term) ||
                localidad.includes(term) ||
                referencia.includes(term);
        });

        return filteredData;
    }

    _updateTableBodyOnly(dataSlice, isCrudTable, indexOffset) {
        const tableBody = this.displayElement.querySelector('.data-table tbody');
        const paginationControls = this.displayElement.querySelector('.pagination-controls');
        // CORRECCIÓN: Busca directamente por la clase 'record-count'
        const recordCountSpan = this.displayElement.querySelector('.record-count'); 
        
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
        
        const backButtonHTML = this.backToDashboardCallback 
            ? '<button class="btn-secondary-action" id="back-to-panel-btn"><i class="fas fa-arrow-left"></i> Volver al Panel</button>'
            : '';

        // --- CÓDIGO HTML SOLICITADO POR EL USUARIO ---
        this.displayElement.innerHTML = `
            <div class="header-with-nav">
                ${backButtonHTML}
                <div class="table-actions">
                    <h2>Gestión de la Tabla: ${linkText}</h2>
                    <button class="btn-primary-action btn-create" data-table="${tableName}"><i class="fas fa-plus"></i> Crear Nuevo</button>
                    <span class="record-count">Cargando...</span>
                </div>
            </div>
            
            ${this._renderSearchAndFilterBox(tableName)}
            
            <div id="table-content-wrapper">
                ${this.loadingHTML}
            </div>
        `;
        // ---------------------------------------------

        this.setupBackButtonListener();
        this.setupSearchAndFilterListeners();

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
                order: 'id_direccion.asc', 
            };

            const data = await service.fetchData(params); 
            
            this.fullData = data;
            this.currentPage = 1;
            this.currentSearchTerm = '';
            
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
        return [
            'CLIENTE', 
            'CALLE / AVENIDA', 
            'NÚMERO CASA/EDIFICIO', 
            'REFERENCIA ADICIONAL', 
            'ZONA',
        ];
    }
    
    renderTable(tableName, linkText, dataSlice, isCrudTable, totalRecords, totalPages) {
        const recordText = 'direcciones visibles';
        const tableContentWrapper = this.displayElement.querySelector('#table-content-wrapper');

        // CORRECCIÓN: Busca directamente por la clase 'record-count'
        const recordCountSpan = this.displayElement.querySelector('.record-count');
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
                        <th>N°</th> 
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
        const searchInstructions = 'Buscar por cliente, calle o zona';
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
        const rowNumber = index + 1;

        const isInactive = !row['visible'];
        const deleteDisabled = isInactive; 
        const deleteTitle = isInactive ? 'Registro Eliminado' : 'Eliminar';

        const finalFields = [
            'cliente_nombre',
            'calle_avenida',
            'numero_casa_edificio',
            'referencia_adicional',
            'zona_nombre',
        ];

        let rowCells = finalFields.map(fieldName => {
            let cellValue = '';
            
            switch (fieldName) {
                case 'cliente_nombre':
                    const u = row.u; 
                    cellValue = `${u?.primer_nombre || ''} ${u?.segundo_nombre || ''} ${u?.apellido_paterno || ''} ${u?.apellido_materno || ''}`.trim();
                    break;
                case 'zona_nombre':
                    cellValue = row.z?.nombre || 'N/A'; 
                    break;
                case 'calle_avenida':
                case 'numero_casa_edificio':
                case 'referencia_adicional':
                    cellValue = row[fieldName] ?? '';
                    break;
            }
            return `<td>${cellValue}</td>`;
        }).join('');

        const rowClass = isInactive ? 'inactive-record' : '';

        return `
            <tr data-id="${rowId}" class="${rowClass}">
                <td>${rowNumber}</td>
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

    async _fetchAddressHierarchy(id_direccion) {
        const service = DireccionService;
        try {
            const data = await service.getById(id_direccion); 
            
            const zonaData = data.z; 
            const localidadData = zonaData?.l; 
            const municipioData = localidadData?.m; 
            
            let id_zona = data.id_zona || null; 
            
            let id_localidad = zonaData?.id_localidad || null;

            let id_municipio = localidadData?.id_municipio || null;
            
            let id_departamento = municipioData?.id_departamento || null;

            if (!id_localidad && id_zona) {
                const zonaService = SERVICE_MAP['ZonaService'];
                const zonaDataResult = await zonaService.getById(id_zona);
                if (zonaDataResult?.id_localidad) {
                    id_localidad = zonaDataResult.id_localidad;
                }
            }

            if (id_localidad && (!id_municipio || !id_departamento)) { 
                
                const locService = SERVICE_MAP['LocalidadService'];
                const locData = await locService.getById(id_localidad); 
                
                if (locData) {
                    id_municipio = locData.id_municipio || locData.m?.id_municipio || null;
                    id_departamento = locData.m?.dep?.id_departamento || null; 
                }
            }
            
            const hierarchy = {
                id_departamento: id_departamento,
                id_municipio: id_municipio,
                id_localidad: id_localidad, 
                id_zona: id_zona,
            };
            return hierarchy;
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
                    
                    const valueToKeep = dependentSelect.dataset.initialValue || null; 
                    
                    if (valueToKeep) {
                        dependentSelect.removeAttribute('data-initial-value');
                    }

                    dependentSelect.innerHTML = '<option value="">Cargando...</option>';
                    dependentSelect.classList.add('disabled-cascade');
                    dependentSelect.disabled = true;
                    
                    const label = dependentSelect.previousElementSibling.textContent.replace(':', '');

                    if (parentValue) {
                        const newOptions = await this._loadSelectOptions(optionsService, parentValue, valueToKeep);
                        
                        const placeholder = (valueToKeep) ? '' : `<option value="">-- Seleccionar ${label} --</option>`;
                        
                        dependentSelect.innerHTML = placeholder + newOptions;
                        dependentSelect.classList.remove('disabled-cascade');
                        dependentSelect.disabled = false;
                        
                        let shouldTriggerNext = false;
                        
                        if (valueToKeep) {
                            dependentSelect.value = valueToKeep; 
                            
                            if (String(dependentSelect.value) === String(valueToKeep)) {
                                shouldTriggerNext = true;
                            }
                        } else if (dependentSelect.value) {
                            shouldTriggerNext = true;
                        }

                        const nextDependent = form.querySelector(`select[data-dependency="${dependentId}"]`);
                        
                        if (dependentId === 'id_municipio_form' && shouldTriggerNext) {
                            dependentSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            return;
                        }

                        if (nextDependent && shouldTriggerNext) {
                            setTimeout(() => {
                                dependentSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            }, 300);
                        } else if (nextDependent) {
                             setTimeout(() => dependentSelect.dispatchEvent(new Event('change', { bubbles: true })), 300);
                        }

                    } else {
                        const dependencyLabel = dependencySelect.previousElementSibling?.textContent.replace(':', '').toUpperCase() || dependencyName.replace('_form', '').replace('id_', '').toUpperCase();
                        dependentSelect.innerHTML = `<option value="">-- Seleccionar primero ${dependencyLabel} --</option>`;
                        dependentSelect.classList.add('disabled-cascade');
                        dependentSelect.disabled = true;
                        
                        const nextDependent = form.querySelector(`select[data-dependency="${dependentId}"]`);
                        if (nextDependent) {
                             setTimeout(() => dependentSelect.dispatchEvent(new Event('change', { bubbles: true })), 300);
                        }
                    }
                };
                
                dependencySelect.removeEventListener('change', handler);
                dependencySelect.addEventListener('change', handler);
            }
        });

        if (action === 'edit') {
            const form = document.getElementById('crud-form');
            const initialSelect = form.querySelector('#id_departamento_form');
            if (initialSelect && initialSelect.value) {
                setTimeout(() => {
                    initialSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }, 300);
            }
        }
    }


    async showForm(tableName, action, id = null) {
        const configForm = CRUD_FIELDS_CONFIG[tableName];
        if (!configForm || !SERVICE_MAP[tableName]) {
            alert(`Error: Configuración o Servicio no encontrado para la tabla ${tableName}.`);
            return;
        }

        const titleText = action === 'create' ? 'Nueva Dirección' : 'Editar Dirección';
        this.modalTitle.textContent = titleText;
        this.modalBody.innerHTML = this.loadingHTML;
        this.modal.classList.add('active');

        let formData = {};
        let initialCiValue = '';
        let addressHierarchy = {};

        if (action === 'edit' && id) {
            try {
                addressHierarchy = await this._fetchAddressHierarchy(id); 
                
                formData = await SERVICE_MAP[tableName].getById(id); 
                const userId = formData['id_usuario'] || addressHierarchy['id_usuario'];

                if (userId) {
                    const userData = await SERVICE_MAP['UsuarioService'].getById(userId);
                    initialCiValue = userData?.ci || ''; 
                }

                formData['id_departamento_form'] = addressHierarchy.id_departamento;
                formData['id_municipio_form'] = addressHierarchy.id_municipio;
                formData['id_localidad'] = addressHierarchy.id_localidad || formData['id_localidad']; 
                formData['id_zona'] = addressHierarchy.id_zona || formData['id_zona']; 

            } catch (e) {
                this.modalBody.innerHTML = `<p class="error-message">Error al cargar datos del ID ${id}. ${e.message}</p>`;
                return;
            }
        }

        let filteredConfigForm = configForm.filter(field => field.name !== 'visible');

        const DEPARTAMENTO_FIELD = { name: 'id_departamento_form', label: 'Departamento', type: 'select', required: true, options_service: 'DepartamentoService' };
        const MUNICIPIO_FIELD = { name: 'id_municipio_form', label: 'Municipio', type: 'select', required: true, options_service: 'MunicipioService', dependency: 'id_departamento_form' };

        let finalFields = [];
        let needsDepartmentAndMunicipio = true; 
        
        let localidadField = null;
        let zonaField = null;
        
        for (const field of filteredConfigForm) {
            
            if (field.name === 'id_localidad') {
                localidadField = { ...field };
                localidadField.dependency = 'id_municipio_form';
                localidadField.options_service = 'LocalidadService';
                localidadField.type = 'select';
                
                if (needsDepartmentAndMunicipio) {
                    finalFields.push(DEPARTAMENTO_FIELD);
                    finalFields.push(MUNICIPIO_FIELD);
                    needsDepartmentAndMunicipio = false;
                }
                finalFields.push(localidadField);
                continue; 
            }

            if (field.name === 'id_zona') {
                zonaField = { ...field };
                zonaField.dependency = 'id_localidad';
                zonaField.options_service = 'ZonaService';
                zonaField.type = 'select';
                continue; 
            }
            
            finalFields.push(field);
        }

        if (localidadField && zonaField) {
            const localidadIndex = finalFields.findIndex(f => f.name === 'id_localidad');
            if (localidadIndex !== -1) {
                finalFields.splice(localidadIndex + 1, 0, zonaField);
            }
        }
        
        if (needsDepartmentAndMunicipio && finalFields.some(f => f.name === 'id_localidad' || f.name === 'id_zona')) {
            finalFields.unshift(DEPARTAMENTO_FIELD);
            finalFields.unshift(MUNICIPIO_FIELD);
        }

        const fieldPromises = finalFields.map(async field => {
            let currentValue = formData[field.name] ?? '';
            let fieldConfig = { ...field };

            const requiredAttr = fieldConfig.required ? 'required' : '';
            const stepAttr = fieldConfig.step ? `step="${fieldConfig.step}"` : '';
            const numberClass = fieldConfig.type === 'number' ? ' input-number' : '';
            
            const cleanedLabel = fieldConfig.label.replace(/\s*\(Opcional\)/gi, '').trim(); 
            const placeholderText = fieldConfig.placeholder || `Ingrese ${cleanedLabel.toLowerCase().replace(/\s\(id\)/g, '')}`;

            let disabledAttrBase = fieldConfig.disabled ? 'disabled' : '';
            
            // LÓGICA DE LAYOUT GRID: Campos que deben ocupar todo el ancho
            let isFullSpan = false;
            if (fieldConfig.name === 'id_usuario' || fieldConfig.name === 'referencia_adicional' || fieldConfig.type === 'textarea') {
                isFullSpan = true;
            }
            const fullSpanClass = isFullSpan ? ' full-span' : '';
            

            if (fieldConfig.name === 'id_usuario') {
                const hiddenUserId = currentValue; 
                
                const ciLabel = 'Cédula de Identidad (CI) del Cliente';
                const ciPlaceholder = 'Ingrese CI del cliente (ej: 1234567)';
                
                const ciValue = action === 'edit' ? initialCiValue : ''; 
                const requiredAttr = fieldConfig.required ? 'required' : '';
                
                return `
                    <div class="form-group ci-validation-wrapper${fullSpanClass}"> 
                        <label for="ci_cliente">${ciLabel}:</label>
                        <input type="text" class="input-text" id="ci_cliente" name="ci_cliente" value="${ciValue}" ${requiredAttr} placeholder="${ciPlaceholder}">
                        <div id="ci-validation-message" class="validation-message"></div>
                        
                        <input type="hidden" id="id_usuario" name="id_usuario" value="${hiddenUserId}">
                    </div>
                `;
            }

            if (fieldConfig.type === 'hidden') {
                return `<input type="hidden" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}">`;
            }
            
            if (fieldConfig.type === 'select' && fieldConfig.options_service) {
                
                const initialValueAttr = action === 'edit' && currentValue ? `data-initial-value="${currentValue}"` : ''; 
                
                let selectOptions = '';
                
                if (!fieldConfig.dependency) {
                     selectOptions = await this._loadSelectOptions(fieldConfig.options_service, null, currentValue);
                } else if (action === 'edit' && currentValue) {
                     selectOptions = `<option value="${currentValue}" selected>Cargando valor inicial...</option>`;
                } else {
                    const dependencyLabel = fieldConfig.dependency.replace('_form', '').replace('id_', '').toUpperCase();
                    disabledAttrBase = 'disabled';
                    selectOptions = `<option value="">-- Seleccionar primero ${dependencyLabel} --</option>`;
                }

                const dependencyAttr = fieldConfig.dependency ? `data-dependency="${fieldConfig.dependency}"` : '';
                const serviceAttr = fieldConfig.options_service ? `data-options-service="${fieldConfig.options_service}"` : '';
                
                return `
                    <div class="form-group${fullSpanClass}">
                        <label for="${fieldConfig.name}">${cleanedLabel}:</label>
                        <select id="${fieldConfig.name}" name="${fieldConfig.name}" class="input-select ${disabledAttrBase ? 'disabled-cascade' : ''}" ${requiredAttr} ${disabledAttrBase} ${dependencyAttr} ${serviceAttr} ${initialValueAttr}>
                            <option value="">-- Seleccionar ${cleanedLabel} --</option>
                            ${selectOptions}
                        </select>
                    </div>
                `;

            } else if (fieldConfig.type === 'textarea') {
                return `
                    <div class="form-group${fullSpanClass}">
                        <label for="${fieldConfig.name}">${cleanedLabel}:</label>
                        <textarea class="input-textarea" id="${fieldConfig.name}" name="${fieldConfig.name}" placeholder="${placeholderText}" ${requiredAttr} ${disabledAttrBase}>${currentValue}</textarea>
                    </div>
                `;
            } else {
                const type = fieldConfig.type || 'text';
                return `
                    <div class="form-group${fullSpanClass}">
                        <label for="${fieldConfig.name}">${cleanedLabel}:</label>
                        <input type="${type}" class="input-text${numberClass}" id="${fieldConfig.name}" name="${fieldConfig.name}" value="${currentValue}" ${requiredAttr} ${stepAttr} placeholder="${placeholderText}" ${disabledAttrBase}>
                    </div>
                `;
            }
        });

        const formFieldsHTML = await Promise.all(fieldPromises).then(results => results.join(''));

        const formHTML = `
            <style>
                .form-grid-container {
                    /* Layout de rejilla adaptable: mínimo 300px por columna */
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .form-grid-container .full-span {
                    /* Hace que estos campos ocupen todo el ancho de la cuadrícula */
                    grid-column: 1 / -1; 
                }
            </style>
            <form id="crud-form" data-table="${tableName}" data-action="${action}" data-id="${id ?? ''}">
                <div class="form-grid-container">
                    ${formFieldsHTML}
                </div>
                <div class="form-footer">
                    <button type="submit" class="btn-primary-modal">
                        <i class="fas fa-save"></i> ${action === 'create' ? 'Crear' : 'Guardar Cambios'}
                    </button>
                    <button type="button" class="btn-cancel-modal" id="form-cancel-btn">Cancelar</button>
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
        
        this._setupCascadeListeners(action);
        
        this.setupCiValidationListener();
    }
    
    async setupCiValidationListener() {
        const ciInput = this.modalBody.querySelector('#ci_cliente');
        const userIdInput = this.modalBody.querySelector('#id_usuario');
        const ciMessage = document.getElementById('ci-validation-message');

        if (!ciInput || !userIdInput) return;

        const validateCi = async (ci) => {
            const ciValue = ci.trim();
            ciMessage.textContent = 'Buscando CI...';
            ciMessage.style.color = '#ffc107';

            if (ciValue.length < 5) { 
                ciMessage.textContent = 'Ingrese al menos 5 dígitos para buscar.';
                ciMessage.style.color = '#ffc107';
                userIdInput.value = '';
                return;
            }

            const userService = SERVICE_MAP['UsuarioService'];
            
            try {
                const userId = await userService.getIdByCi(ciValue);
                
                if (userId) {
                    ciMessage.textContent = '✅ CI válido. Usuario encontrado.';
                    ciMessage.style.color = '#28a745';
                    userIdInput.value = userId; 
                } else {
                    ciMessage.textContent = '❌ CI no encontrado en la base de datos.';
                    ciMessage.style.color = '#dc3545';
                    userIdInput.value = ''; 
                }
            } catch (e) {
                ciMessage.textContent = `Error al buscar: ${e.message}`;
                ciMessage.style.color = '#dc3545';
                userIdInput.value = '';
            }
        };

        ciInput.oninput = () => {
            clearTimeout(this.ciValidationTimeout);
            ciMessage.textContent = '';
            userIdInput.value = '';
            
            this.ciValidationTimeout = setTimeout(() => {
                validateCi(ciInput.value);
            }, 500);
        };
        
        if (ciInput.value && userIdInput.value) {
             validateCi(ciInput.value);
        } else if (ciInput.value) {
             ciInput.dispatchEvent(new Event('input'));
        }
    }


    async handleFormSubmit(tableName, action, id = null) {
        const form = document.getElementById('crud-form');
        const formData = new FormData(form);
        const service = SERVICE_MAP[tableName];

        if (!service) return;

        const ci_cliente = formData.get('ci_cliente')?.trim(); 
        const id_usuario = formData.get('id_usuario')?.trim(); 
        
        const id_zona = formData.get('id_zona')?.trim();
        const id_localidad = formData.get('id_localidad')?.trim();
        const id_municipio_form = formData.get('id_municipio_form')?.trim();
        const id_departamento_form = formData.get('id_departamento_form')?.trim();
        
        const calle_avenida = formData.get('calle_avenida')?.trim();
        
        if (!id_departamento_form || !id_municipio_form || !id_localidad || !id_zona) {
            alert("Debe completar todos los campos de ubicación geográfica (Departamento, Municipio, Localidad y Zona).");
            return;
        }

        if (!ci_cliente || !id_usuario || !calle_avenida) {
            alert("Los campos obligatorios (CI del Cliente, Calle/Avenida) deben ser completados.");
            return;
        }
        
        if (!id_usuario) {
            alert("El CI ingresado no corresponde a un cliente existente. Por favor, valide el CI antes de registrar la dirección.");
            return;
        }

        const numero_casa_edificio = formData.get('numero_casa_edificio')?.trim();
        if (!numero_casa_edificio || numero_casa_edificio === '') {
             formData.set('numero_casa_edificio', null);
        }

        formData.delete('id_departamento_form');
        formData.delete('id_municipio_form'); 
        formData.delete('ci_cliente'); 
        formData.delete('id_localidad');
        
        if (action === 'create') {
            formData.delete('id_direccion');
        }

        const payload = Object.fromEntries(formData.entries());
        
        const finalFormData = new FormData();
        for (const key in payload) {
            const value = payload[key] === null ? '' : payload[key];
            finalFormData.append(key, value);
        }

        try {
            if (action === 'create') {
                await service.create(payload); 
                alert(`Registro creado con éxito!`);
            } else {
                await service.update(id, finalFormData); 
                alert(`Registro actualizado con éxito!`);
            }

            this.modal.classList.remove('active');
            this.loadTable();
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        }
    }
}