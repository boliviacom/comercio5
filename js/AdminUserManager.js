import { REPORT_CONFIG, CRUD_FIELDS_CONFIG } from './config/tableConfigs.js';
import { UsuarioService } from './services/UsuarioService.js';

const SERVICE_MAP = {
    'usuario': UsuarioService,
};

const TABLES_ALLOWING_CREATE = ['usuario'];
const SEARCH_FILTER_CONTAINER_ID = 'search-filter-controls-wrapper';

export class AdminUserManager {

    constructor(displayElementId, modalId = 'crud-modal', backToDashboardCallback = null) {
        this.displayElement = document.getElementById(displayElementId);
        this.modal = document.getElementById(modalId);
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.currentTable = null; 

        this.backToDashboardCallback = backToDashboardCallback; 

        this.sessionUserId = localStorage.getItem("usuarioId");

        this.fullData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentLinkText = null; 
        this.currentSearchTerm = '';
        this.currentRoleFilter = 'todos';

        this.loadingHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Cargando datos...</div>';

        this.searchTimeout = null;

        this.setupModalListeners();
    }

    init() {
        this.showTableSelection();
    }

    showTableSelection() {
        this.displayElement.innerHTML = `
            <div class="admin-main-content">
                <div class="panel-header-wrapper">
                    <h2>Administración de Datos</h2>
                    <p>Seleccione la tabla que desea gestionar.</p>
                </div>
                <div class="table-cards-grid" id="table-selection-grid">
                    <p class="info-message">El contenido de las tarjetas de tabla debe ser renderizado en el HTML principal y enlazar a la función 'goToTable'.</p>
                </div>
            </div>
        `;
        this.currentTable = null;
        this.currentLinkText = null;
        this.currentSearchTerm = '';
        this.currentRoleFilter = 'todos';
        this.currentPage = 1;
    }

    goToTable(tableName, linkText) {
        if (!tableName || !linkText) return;
        this.currentTable = tableName;
        this.currentLinkText = linkText;
        this.currentSearchTerm = '';
        this.currentRoleFilter = 'todos';
        this.currentPage = 1;
        this.loadTable();
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
        this.displayElement.querySelector('#back-to-panel-btn')?.addEventListener('click', () => {
            if (this.backToDashboardCallback) {
                this.backToDashboardCallback(); 
            } else {
                this.showTableSelection();
            }
        });
    }

    setupSearchAndFilterListeners() {
        const searchContainer = document.getElementById(SEARCH_FILTER_CONTAINER_ID);
        if (!searchContainer) return;

        const searchInput = searchContainer.querySelector('#table-search-input');
        const roleFilterSelect = searchContainer.querySelector('#table-role-filter');

        if (searchInput) {
            searchInput.value = this.currentSearchTerm;

            searchInput.oninput = () => {
                const newSearchTerm = searchInput.value;

                clearTimeout(this.searchTimeout);

                this.currentSearchTerm = newSearchTerm;

                this.searchTimeout = setTimeout(() => {

                    if (roleFilterSelect) {
                        this.currentRoleFilter = 'todos';
                        roleFilterSelect.value = 'todos';
                    }

                    this.currentPage = 1;
                    this.renderCurrentPage();
                }, 300);
            };
        }

        if (roleFilterSelect) {
            roleFilterSelect.value = this.currentRoleFilter;
            roleFilterSelect.onchange = () => {
                this.currentRoleFilter = roleFilterSelect.value;

                if (searchInput) {
                    clearTimeout(this.searchTimeout);
                    this.currentSearchTerm = '';
                    searchInput.value = '';
                }

                this.currentPage = 1;
                this.renderCurrentPage();
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

                if (id === this.sessionUserId) {
                    alert('Restricción de seguridad: No puede eliminar su propia cuenta de sesión.');
                    return;
                }

                if (confirm(`¿Está seguro de eliminar?`)) {
                    this.toggleVisibility(id, false);
                }
            });
        });

        this.setupPaginationListeners();
    }

    setupPaginationListeners() {
        this.displayElement.querySelectorAll('.btn-pagination').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                this.goToPage(page);
            });
        });

        this.displayElement.querySelectorAll('.btn-pagination-nav').forEach(button => {
            button.addEventListener('click', (e) => {
                const nav = e.currentTarget.dataset.nav;
                const newPage = nav === 'prev' ? this.currentPage - 1 : this.currentPage + 1;
                this.goToPage(newPage);
            });
        });
    }

    goToPage(page) {
        const filteredData = this.filterData();
        const totalPages = Math.ceil(filteredData.length / this.itemsPerPage);

        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentPage();
        }
    }

    async toggleVisibility(id, isVisible) {
        if (isVisible === true) return;

        const tableName = this.currentTable;
        const service = SERVICE_MAP[tableName];
        if (!service || !service.update) return;

        if (!isVisible && id === this.sessionUserId) {
            alert('Restricción de seguridad: No se permite inhabilitar la cuenta de la sesión actual.');
            return;
        }

        try {
            const updatePayload = {
                visible: false
            };

            await service.update(id, updatePayload);

            alert(`Registro eliminado correctamente. Recargando tabla...`);

            this.loadTable();
        } catch (e) {
            alert(`Error al guardar el estado del registro: ${e.message}`);
        }
    }

    filterData() {
        let data = this.fullData;
        const term = this.currentSearchTerm.toLowerCase().trim();
        const role = this.currentRoleFilter;
        const tableName = this.currentTable;

        if (role !== 'todos' && tableName === 'usuario') {
            data = data.filter(row => row.rol && row.rol.toLowerCase() === role);
        }

        if (term) {
            if (tableName === 'usuario') {
                return data.filter(row => {
                    const nombreCompleto = `${row.primer_nombre || ''} ${row.segundo_nombre || ''} ${row.apellido_paterno || ''} ${row.apellido_materno || ''}`.toLowerCase();
                    const ci = String(row.ci || '').toLowerCase();

                    return nombreCompleto.includes(term) || ci.includes(term);
                });
            }
        }

        return data;
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

        if (!tableName) { 
            this.showTableSelection();
            return;
        }

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
            const data = await service.fetchData();
            this.fullData = data;
            this.currentPage = 1;
            this.currentSearchTerm = '';
            this.currentRoleFilter = 'todos';

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

        if (!isTableDrawn || dataSlice.length === 0 && this.currentSearchTerm) {
            this.renderTable(tableName, linkText, dataSlice, true, this.getFixedHeaders(), totalRecords, totalPages);
            this.enableCrudListeners(tableName);
        } else {
            this._updateTableBodyOnly(dataSlice, true, startIndex);
        }
    }

    getFixedHeaders() {
        if (this.currentTable === 'usuario') {
            return [
                'N°',
                'CI',
                'NOMBRES',
                'APELLIDOS',
                'ROL',
                'CORREO ELECTRÓNICO',
                'CONTRASEÑA',
            ];
        }
        return [];
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

        let tableHTML = `
                <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header.toUpperCase()}</th>`).join('')}
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
        if (tableName !== 'usuario') return '';

        const searchInstructions = 'Busca por Nombre, Apellido o C.I.';

        const roles = [
            { value: 'todos', text: 'Todos los Roles' },
            { value: 'cliente', text: 'Cliente' },
            { value: 'empleado', text: 'Empleado' },
            { value: 'administrador', text: 'Administrador' },
            { value: 'owner', text: 'Owner' }
        ];

        const roleOptionsHTML = roles.map(role => {
            const isSelected = role.value === this.currentRoleFilter;
            return `<option value="${role.value}" ${isSelected ? 'selected' : ''}>${role.text}</option>`;
        }).join('');

        return `
            <div id="${SEARCH_FILTER_CONTAINER_ID}" class="filter-controls-container">
                <div class="search-box">
                    <div class="input-group">
                        <input type="text" id="table-search-input" placeholder="${searchInstructions}" class="input-text-search" value="${this.currentSearchTerm}">
                    </div>
                </div>
                <div class="role-filter-box">
                    <label for="table-role-filter">Filtrar por Rol:</label>
                    <select id="table-role-filter" class="input-select-filter">
                        ${roleOptionsHTML}
                    </select>
                </div>
            </div>
        `;
    }

    _renderPaginationControls(totalPages) {
        if (totalPages <= 1) return '';
        let buttonsHTML = '';
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            buttonsHTML += `<button class="btn-pagination ${activeClass}" data-page="${i}">${i}</button>`;
        }

        return `
            <div class="pagination-controls">
                <button class="btn-pagination-nav" data-nav="prev" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>
                ${buttonsHTML}
                <button class="btn-pagination-nav" data-nav="next" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente &raquo;</button>
                <span class="page-info">Página ${this.currentPage} de ${totalPages}</span>
            </div>
        `;
    }

    renderRow(row, tableName, isCrudTable, index) {
        const config = REPORT_CONFIG[tableName];
        const rowId = row[config.id_key];

        const rowNumber = index + 1;

        const finalFields = [
            'ci',
            'nombre_completo',
            'apellido_completo',
            'rol',
            'correo_electronico',
            'contrasena_display',
        ];

        const isSelf = rowId === this.sessionUserId;
        const isInactive = !row['visible'];
        const userRole = row['rol'] ? row['rol'].toLowerCase() : 'desconocido';

        const deleteDisabled = isSelf || isInactive;
        const deleteTitle = isSelf ? 'No puedes inhabilitar tu propia cuenta' : (isInactive ? 'Registro Inhabilitado' : 'Inhabilitar (Soft Delete)');


        let rowCells = finalFields.map(fieldName => {
            let cellValue;

            if (fieldName === 'nombre_completo') {
                const primer = row.primer_nombre || '';
                const segundo = row.segundo_nombre || '';
                cellValue = `${primer} ${segundo}`.trim();
            } else if (fieldName === 'apellido_completo') {
                const paterno = row.apellido_paterno || '';
                const materno = row.apellido_materno || '';
                cellValue = `${paterno} ${materno}`.trim();
            } else if (fieldName === 'contrasena_display') {
                cellValue = '********';
            } else {
                cellValue = row[fieldName] ?? '';
            }

            return `<td>${cellValue}</td>`;
        }).join('');

        const roleClass = `role-${userRole}`;
        const rowClass = `${isInactive ? 'inactive-record' : ''} ${roleClass}`;

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

    _renderFormFieldHTML(fieldConfig, formData, action, availableRoles) {
        let currentValue = formData[fieldConfig.name] ?? '';
        let fieldConfigCopy = { ...fieldConfig };

        if (fieldConfigCopy.name === 'contrasena') {
            if (action === 'edit') {
                currentValue = ''; 
            }
        }

        const requiredAttr = fieldConfigCopy.required ? 'required' : '';
        const stepAttr = fieldConfigCopy.step ? `step="${fieldConfigCopy.step}"` : '';
        const numberClass = fieldConfigCopy.type === 'number' ? ' input-number' : '';
        const placeholderText = fieldConfigCopy.placeholder || `Ingrese ${fieldConfigCopy.label.toLowerCase().replace(/\s\(id\)/g, '')}`;
        const disabledAttrBase = fieldConfigCopy.disabled ? 'disabled' : '';

        let finalRequiredAttr = requiredAttr;
        if (fieldConfigCopy.name === 'contrasena' && action === 'edit' && requiredAttr) {
            finalRequiredAttr = ''; 
        }

        const passwordHelp = ''; 

        if (fieldConfigCopy.type === 'hidden' || fieldConfigCopy.name === 'usuario_id') {
            return `<input type="hidden" id="${fieldConfigCopy.name}" name="${fieldConfigCopy.name}" value="${currentValue}">`;
        }

        if (fieldConfigCopy.type === 'select' || fieldConfigCopy.name === 'rol') {
            let options = [];
            if (fieldConfigCopy.name === 'rol') {
                options = availableRoles;
            } else if (fieldConfigCopy.options) {
                options = fieldConfigCopy.options;
            }

            let optionsHTML = `<option value="">-- Seleccionar ${fieldConfigCopy.label} --</option>`;
            const selectedValue = formData[fieldConfigCopy.name] || currentValue;
            const finalDisabledAttr = '';

            optionsHTML += options.map(option => {
                const isSelected = String(option.value) === String(selectedValue);
                return `<option value="${option.value}" ${isSelected ? 'selected' : ''}>${option.text}</option>`;
            }).join('');

            return `
                <div class="form-group">
                    <label for="${fieldConfigCopy.name}">${fieldConfigCopy.label}:</label>
                    <select id="${fieldConfigCopy.name}" name="${fieldConfigCopy.name}" class="input-select" ${requiredAttr} ${finalDisabledAttr}>
                        ${optionsHTML}
                    </select>
                </div>
            `;
        }
        else if (fieldConfigCopy.name === 'contrasena') {
            return `
                <div class="form-group">
                    <label for="${fieldConfigCopy.name}" class="label">${fieldConfigCopy.label}:</label>
                    <div style="position: relative;">
                        <input type="password" id="${fieldConfigCopy.name}" name="${fieldConfigCopy.name}" class="input-text" value="${currentValue}" ${finalRequiredAttr} placeholder="${placeholderText}">
                        <span class="password-toggle-icon" data-target-id="${fieldConfigCopy.name}"
                            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #4a5568; z-index: 10;">
                            
                            <i class="fas fa-eye-slash"></i>
                            
                        </span>
                    </div>
                    ${passwordHelp}
                </div>
            `;
        }
        else {
            return `
                <div class="form-group">
                    <label for="${fieldConfigCopy.name}">${fieldConfigCopy.label}:</label>
                    <input type="${fieldConfigCopy.type}" class="input-text${numberClass}" id="${fieldConfigCopy.name}" name="${fieldConfigCopy.name}" value="${currentValue}" ${finalRequiredAttr} ${stepAttr} placeholder="${placeholderText}" ${disabledAttrBase}>
                    ${passwordHelp}
                </div>
            `;
        }
    }


    async showForm(tableName, action, id = null) {
        const configForm = CRUD_FIELDS_CONFIG[tableName];
        const service = SERVICE_MAP[tableName];

        if (!configForm || !service) {
            alert(`Error: Configuración o Servicio no encontrado para la tabla ${tableName}.`);
            return;
        }

        const titleText = action === 'create' ? 'Nuevo Usuario' : 'Editar Usuario';

        this.modalTitle.textContent = titleText;
        this.modalBody.innerHTML = this.loadingHTML;

        let formData = {};

        if (action === 'edit' && id) {
            try {
                formData = await service.getById(id);
            } catch (e) {
                this.modalBody.innerHTML = `<p class="error-message">Error al cargar datos del ID ${id}. ${e.message}</p>`;
                return;
            }
        }

        const filteredConfigForm = configForm.filter(field => field.name !== 'visible');

        const availableRoles = [
            { value: 'cliente', text: 'Cliente' },
            { value: 'empleado', text: 'Empleado' },
            { value: 'administrador', text: 'Administrador' },
            { value: 'owner', text: 'Owner' }
        ];

        const renderedFields = {};
        filteredConfigForm.forEach(field => {
            renderedFields[field.name] = this._renderFormFieldHTML(field, formData, action, availableRoles);
        });

        const formHTML = `
            <form id="crud-form">
                
                <h3><i class="fas fa-user-circle"></i> Datos Personales</h3>
                <div class="form-grid grid-col-2">
                    ${renderedFields.primer_nombre || ''}
                    ${renderedFields.segundo_nombre || ''}
                </div>
                <div class="form-grid grid-col-2">
                    ${renderedFields.apellido_paterno || ''}
                    ${renderedFields.apellido_materno || ''}
                </div>
                
                <h3 class="mt-4"><i class="fas fa-id-card"></i> Contacto y Rol</h3>
                <div class="form-grid grid-col-3">
                    ${renderedFields.ci || ''}
                    ${renderedFields.celular || ''}
                    ${renderedFields.rol || ''}
                </div>
                
                <h3 class="mt-4"><i class="fas fa-lock"></i> Credenciales</h3>
                <div class="form-grid grid-col-2">
                    ${renderedFields.correo_electronico || ''}
                    ${renderedFields.contrasena || ''}
                </div>

                ${renderedFields.usuario_id || ''} 

                <div class="form-footer">
                    <button type="button" class="btn-cancel-modal" id="form-cancel-btn">Cancelar</button>
                    <button type="submit" class="btn-primary-modal">
                        <i class="fas fa-save"></i> ${action === 'create' ? 'Crear' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        `;

        this.modalBody.innerHTML = formHTML;

        this.modal.classList.add('active');

        this.setupPasswordToggleListeners();

        document.getElementById('crud-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(tableName, action, id);
        });

        document.getElementById('form-cancel-btn').addEventListener('click', () => {
            this.modal.classList.remove('active');
        });
    }

    setupPasswordToggleListeners() {
        this.modalBody.querySelectorAll('.password-toggle-icon').forEach(iconContainer => {
            iconContainer.addEventListener('click', (e) => {
                const targetId = iconContainer.dataset.targetId;
                const passwordInput = document.getElementById(targetId);
                const icon = iconContainer.querySelector('i');

                if (!passwordInput || !icon) return;

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        });
    }

    async handleFormSubmit(tableName, action, id = null) {
        const form = document.getElementById('crud-form');
        const formData = new FormData(form);
        const service = SERVICE_MAP[tableName];

        if (!service) return;

        const primer_nombre = formData.get('primer_nombre')?.trim();
        const segundo_nombre = formData.get('segundo_nombre')?.trim();
        const apellido_paterno = formData.get('apellido_paterno')?.trim();
        const apellido_materno = formData.get('apellido_materno')?.trim();
        const ci = formData.get('ci')?.trim();
        const celular = formData.get('celular')?.trim();
        const email = formData.get('correo_electronico')?.trim();
        const password = formData.get('contrasena')?.trim();

        let rol = formData.get('rol');

        const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
        const soloNumeros = /^[0-9]+$/;
        const correoUniversal = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordSegura = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!primer_nombre || !apellido_paterno || !apellido_materno || !ci || !celular || !email || !rol || (action === 'create' && !password)) {
            alert("Todos los campos obligatorios deben ser llenados.");
            return;
        }

        if (!soloLetras.test(primer_nombre)) {
            alert("El primer nombre solo puede contener letras."); return;
        }
        if (segundo_nombre && !soloLetras.test(segundo_nombre)) {
            alert("El segundo nombre solo puede contener letras."); return;
        }
        if (!soloLetras.test(apellido_paterno) || !soloLetras.test(apellido_materno)) {
            alert("Los apellidos solo pueden contener letras."); return;
        }

        if (!soloNumeros.test(ci) || ci.length !== 7) {
            alert("El C.I. debe contener exactamente 7 dígitos."); return;
        }
        if (!soloNumeros.test(celular) || celular.length !== 8) {
            alert("El celular debe contener exactamente 8 dígitos."); return;
        }

        if (!correoUniversal.test(email)) {
            alert("Debe ingresar un correo válido."); return;
        }

        if (action === 'create' && !passwordSegura.test(password)) {
            alert("La contraseña es insegura. Debe tener al menos 8 caracteres, incluir una mayúscula, un número y un carácter especial (@$!%*?&)."); return;
        }
        if (action === 'edit' && password && !passwordSegura.test(password)) {
            alert("Si intentas cambiar la contraseña, esta es insegura. Debe cumplir con el requisito de al menos 8 caracteres, mayúscula, número y carácter especial (@$!%*?&)."); return;
        }

        formData.delete('rol_hidden');

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