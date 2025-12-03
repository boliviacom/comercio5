import { REPORT_CONFIG } from './config/tableConfigs.js';
import { ColConfigService } from './services/ColConfigService.js';
import { RolesService } from './services/RolesService.js';
import { UsersService } from './services/UsersService.js';

export class ColumnVisibilityManager {
    constructor() {
        this.currentUserId = null;
        this.currentRoleId = ''; // Iniciar con rol vacío (opción nula)
        this.currentUserName = '';

        this.availableRoles = [];
        this.availableUsers = [];
        this.availableColumns = this.getColumnsForTable('producto');

        this.currentConfigId = null;
        this.debouncedSearch = this._debounce(this._handleUserSearch, 300);
    }

    getColumnsForTable(tableName) {
        const config = REPORT_CONFIG[tableName];
        if (!config || !config.fields || !config.headers) {
            return [];
        }
        return config.fields.map((fieldId, index) => ({
            id: fieldId,
            label: config.headers[index],
            defaultVisible: true
        }));
    }

    _debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    async _handleUserSearch(searchTerm) {
        const roleSelect = document.getElementById('role-select');
        const roleId = roleSelect.value;
        const resultsList = document.getElementById('user-search-results');

        if (!searchTerm || searchTerm.length < 1) {
            resultsList.innerHTML = '';
            return;
        }

        resultsList.innerHTML = '<li class="loading-result"><i class="fas fa-spinner fa-spin"></i> Buscando CI...</li>';

        // Pasamos roleId que puede ser '' (nulo) para buscar en todos los roles
        const users = await UsersService.searchUsers(searchTerm, roleId);

        if (users.length === 0) {
            resultsList.innerHTML = '<li class="no-result">No se encontraron usuarios con ese CI.</li>';
            return;
        }

        resultsList.innerHTML = users.map(user => `
            <li class="user-result-item" data-user-id="${user.id}" data-user-name="${user.name}">
                <span class="ci-badge">${user.ci}</span> ${user.name}
            </li>
        `).join('');

        resultsList.querySelectorAll('.user-result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentUserId = item.getAttribute('data-user-id');
                this.currentUserName = item.getAttribute('data-user-name');
                document.getElementById('user-search-input').value = this.currentUserName;
                resultsList.innerHTML = '';
                this.loadAndRefreshConfig();
            });
        });
    }

    _renderColumnSwitches(visibleColumnIds) {
        return this.availableColumns.map(col => {
            const isChecked = visibleColumnIds.includes(col.id) ? 'checked' : '';

            const formattedLabel = col.label
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return `
                <div class="column-switch-item">
                    <span class="column-label">${formattedLabel}</span>
                    <label class="switch">
                        <input type="checkbox" class="column-toggle" data-column-id="${col.id}" ${isChecked}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        }).join('');
    }

    async renderPanel(tableName) {
        // Reiniciar el estado de selección al abrir el modal
        this.currentUserId = null;
        this.currentUserName = '';
        this.currentRoleId = '';

        this.availableColumns = this.getColumnsForTable(tableName);
        if (this.availableColumns.length === 0) {
            return `<div class="error-message">Configuración de tabla no encontrada o incompleta para: ${tableName}.</div>`;
        }

        this.availableRoles = await RolesService.getAllRoles();

        // Cargar las columnas por defecto (roleId y userId son nulos/vacíos)
        const initialConfig = await this.loadConfigFromDB(tableName, this.currentRoleId, this.currentUserId);
        const initialVisibleIds = initialConfig.columnas_visibles;
        this.currentConfigId = initialConfig.id;

        // Opción nula para el rol
        const defaultRoleOption = '<option value="" selected>-- Seleccione un Rol --</option>';
        const roleOptionsHTML = this.availableRoles.map(role =>
            `<option value="${role.id}" ${role.id === this.currentRoleId ? 'selected' : ''}>${role.name}</option>`
        ).join('');

        const fullRoleOptionsHTML = defaultRoleOption + roleOptionsHTML;

        const initialColumnSwitchesHTML = this._renderColumnSwitches(initialVisibleIds);

        // El estado inicial es "Columas por defecto"
        const initialInfoText = 'Configuración por Defecto (Global)';

        const formattedTableName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' ');

        const userSearchHTML = `
            <div class="user-search-container">
                <input type="text" id="user-search-input" class="form-control-input" placeholder="Buscar por Cédula de Identidad (CI)..." value="${this.currentUserName || ''}">
                <button type="button" id="clear-user-btn" class="btn-clear-search" style="${this.currentUserId ? '' : 'display:none;'}"><i class="fas fa-times"></i></button>
                <ul id="user-search-results" class="user-search-results"></ul>
            </div>
        `;

        return `
            <div id="column-visibility-manager-container" class="config-modal-body">
                <div class="config-header">
                    <h2 class="config-title">Gestión de Visibilidad de Columnas: ${formattedTableName}</h2>
                    <p class="config-instruction">Primero seleccione un rol o utilice el buscador CI para anular la configuración por defecto.</p>
                </div>

                <div class="config-content-wrapper">
                    <div class="config-controls-side">
                        <h3 class="config-section-title">Configuración de Roles y Usuarios</h3>

                        <div class="control-group">
                            <label class="control-label">Aplicar a Rol:</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user-shield"></i></span>
                                <select id="role-select" class="form-control-select">
                                    ${fullRoleOptionsHTML}
                                </select>
                            </div>
                        </div>

                        <div class="control-group">
                            <label class="control-label">Anulación por Usuario (Buscador CI):</label>
                            <div class="input-group-search">
                                ${userSearchHTML}
                            </div>
                        </div>

                        <div class="role-info-box" id="info-box-status">
                            <strong>Configuración Activa:</strong> <span id="selected-role-name">${initialInfoText}</span>
                            <p>La configuración de usuario anula a la configuración de rol.</p>
                        </div>
                    </div>

                    <div class="column-list-side">
                        <div class="column-list-header">
                            <h3 class="config-section-title">Columnas de la Tabla de ${formattedTableName}</h3>
                            <a href="#" id="select-all-columns" class="select-all-link">Seleccionar todas</a>
                        </div>

                        <div id="column-switches-list" class="column-switches-list">
                            ${initialColumnSwitchesHTML}
                        </div>
                    </div>
                </div>

                <div class="config-footer">
                    <button type="button" class="btn-cancel" id="cancel-config-btn">Cancelar</button>
                    <button type="button" class="btn-save-changes" id="save-config-btn" disabled>Guardar Cambios</button>
                </div>
            </div>
        `;
    }

    async loadConfigFromDB(tableName, roleId, userId = null) {
        // Convertir la opción vacía '' a null para el servicio
        const effectiveRoleId = roleId === '' ? null : roleId;

        // 1. Intentar cargar por USUARIO (anulación)
        if (userId) {
            const configResult = await ColConfigService.getConfig(tableName, null, userId);
            if (configResult) return configResult;
        }

        // 2. Intentar cargar por ROL (solo si hay un rol seleccionado)
        if (effectiveRoleId) {
            const configResult = await ColConfigService.getConfig(tableName, effectiveRoleId, null);
            if (configResult) return configResult;
        }

        // 3. Devolver configuración por defecto si no se encuentra ninguna
        const defaultColumns = this.getColumnsForTable(tableName).map(c => c.id);
        return {
            id: null,
            columnas_visibles: defaultColumns
        };
    }

    async loadAndRefreshConfig(tableName) {
        const roleSelect = document.getElementById('role-select');
        const userSearchInput = document.getElementById('user-search-input');
        const selectedRoleNameSpan = document.getElementById('selected-role-name');
        const clearUserBtn = document.getElementById('clear-user-btn');
        const saveButton = document.getElementById('save-config-btn');

        const roleId = roleSelect.value;
        const effectiveUserId = this.currentUserId;

        if (clearUserBtn) {
            clearUserBtn.style.display = effectiveUserId ? '' : 'none';
        }

        let infoText = 'Configuración por Defecto (Global)';
        let canSave = false;
        let effectiveTargetRoleId = roleId === '' ? null : roleId;

        if (effectiveUserId) {
            infoText = `Anulación de Usuario: <strong>${this.currentUserName}</strong>`;
            userSearchInput.value = this.currentUserName;
            canSave = true;
            // Si hay usuario seleccionado, deseleccionamos el rol para evitar conflictos visuales
            roleSelect.value = '';
        } else if (effectiveTargetRoleId) {
            const roleName = roleSelect.options[roleSelect.selectedIndex].text;
            infoText = `Configuración por Rol: <strong>${roleName}</strong>`;
            userSearchInput.value = '';
            canSave = true;
        } else {
            // No hay ni usuario ni rol seleccionados.
            userSearchInput.value = '';
            canSave = false;
        }

        selectedRoleNameSpan.innerHTML = infoText;
        saveButton.disabled = !canSave;

        // Cargar configuración
        const config = await this.loadConfigFromDB(tableName, roleId, effectiveUserId);
        this.currentConfigId = config.id;
        this.currentRoleId = effectiveUserId ? null : roleId;
        this.currentUserId = effectiveUserId;
        this.updateSwitches(config.columnas_visibles);
    };

    async initializePanelListeners(tableName) {
        const roleSelect = document.getElementById('role-select');
        const userSearchInput = document.getElementById('user-search-input');
        const clearUserBtn = document.getElementById('clear-user-btn');
        const selectAllLink = document.getElementById('select-all-columns');
        const columnSwitchesList = document.getElementById('column-switches-list');
        const saveButton = document.getElementById('save-config-btn');
        const cancelButton = document.getElementById('cancel-config-btn');
        const modal = document.getElementById('crud-modal');

        this.loadAndRefreshConfig = this.loadAndRefreshConfig.bind(this, tableName);

        userSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            this.debouncedSearch(searchTerm);

            // Si el usuario comienza a escribir, limpiamos la selección previa para el override
            if (this.currentUserId !== null) {
                this.currentUserId = null;
                this.currentUserName = '';
                this.loadAndRefreshConfig();
            }
        });

        roleSelect.addEventListener('change', () => {
            // Al cambiar el rol, limpiamos la selección de usuario
            this.currentUserId = null;
            this.currentUserName = '';
            this.loadAndRefreshConfig();
        });

        if (clearUserBtn) {
            clearUserBtn.addEventListener('click', () => {
                userSearchInput.value = '';
                this.currentUserId = null;
                this.currentUserName = '';
                document.getElementById('user-search-results').innerHTML = '';
                this.loadAndRefreshConfig();
            });
        }

        this.loadAndRefreshConfig();

        if (selectAllLink && columnSwitchesList) {
            selectAllLink.addEventListener('click', (e) => {
                e.preventDefault();
                const allSwitches = columnSwitchesList.querySelectorAll('.column-toggle');
                const isAllChecked = Array.from(allSwitches).every(s => s.checked);

                allSwitches.forEach(s => s.checked = !isAllChecked);
                selectAllLink.textContent = !isAllChecked ? 'Deseleccionar todas' : 'Seleccionar todas';
            });
        }

        if (saveButton && modal) {
            saveButton.addEventListener('click', async () => {
                if (saveButton.disabled) return;

                const selectedColumns = Array.from(columnSwitchesList.querySelectorAll('.column-toggle'))
                    .filter(s => s.checked)
                    .map(s => s.getAttribute('data-column-id'));

                const isUserOverride = this.currentUserId !== null;

                let targetRoleId = null;
                let targetUserId = null;
                let existingId = null;
                let targetName = '';
                let targetType = '';

                if (isUserOverride) {
                    targetUserId = this.currentUserId;
                    targetName = this.currentUserName;
                    targetType = 'usuario';
                    // Al guardar por usuario, el rol_id debe ser nulo en la BD.
                    const existingConfig = await ColConfigService.getConfig(tableName, null, targetUserId);
                    existingId = existingConfig ? existingConfig.id : null;
                } else {
                    targetRoleId = roleSelect.value;
                    targetName = roleSelect.options[roleSelect.selectedIndex].text;
                    targetType = 'rol';
                    // Al guardar por rol, el usuario_id debe ser nulo en la BD.
                    const existingConfig = await ColConfigService.getConfig(tableName, targetRoleId, null);
                    existingId = existingConfig ? existingConfig.id : null;
                }

                const success = await ColConfigService.saveConfig(
                    tableName,
                    targetRoleId,
                    targetUserId,
                    selectedColumns,
                    existingId
                );

                if (success) {
                    alert(`Configuración para el ${targetType} '${targetName}' guardada con éxito.`);
                } else {
                    alert(`Error al guardar la configuración para el ${targetType} '${targetName}'.`);
                }

                modal.classList.remove('active');
                document.getElementById('modal-body').innerHTML = '';
            });
        }

        if (cancelButton && modal) {
            cancelButton.addEventListener('click', () => {
                modal.classList.remove('active');
                document.getElementById('modal-body').innerHTML = '';
            });
        }
    }

    updateSwitches(visibleIds) {
        const columnSwitchesList = document.getElementById('column-switches-list');
        if (columnSwitchesList) {
            columnSwitchesList.innerHTML = this._renderColumnSwitches(visibleIds);
            const selectAllLink = document.getElementById('select-all-columns');
            if (selectAllLink) {
                const allSwitches = columnSwitchesList.querySelectorAll('.column-toggle');
                const isAllChecked = Array.from(allSwitches).every(s => s.checked);
                selectAllLink.textContent = isAllChecked ? 'Deseleccionar todas' : 'Seleccionar todas';
            }
        }
    }
}