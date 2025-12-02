import { REPORT_CONFIG } from './config/tableConfigs.js';
import { ColConfigService } from './services/ColConfigService.js';
import { RolesService } from './services/RolesService.js';

export class ColumnVisibilityManager {
    constructor() {
        this.currentUserId = null;
        this.currentRoleId = 'admin'; //

        this.availableRoles = [];
        this.availableColumns = this.getColumnsForTable('producto'); //

        this.currentRoleConfigs = {};
        this.currentConfigId = null;
    }

    getColumnsForTable(tableName) {
        const config = REPORT_CONFIG[tableName]; //
        if (!config || !config.fields || !config.headers) { //
            return []; //
        }
        return config.fields.map((fieldId, index) => ({ //
            id: fieldId, //
            label: config.headers[index], //
            defaultVisible: true //
        }));
    }

    _renderColumnSwitches(visibleColumnIds) {
        return this.availableColumns.map(col => { //
            const isChecked = visibleColumnIds.includes(col.id) ? 'checked' : ''; //
            return `
                <div class="column-switch-item">
                    <span class="column-label">${col.label}</span>
                    <label class="switch">
                        <input type="checkbox" class="column-toggle" data-column-id="${col.id}" ${isChecked}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        }).join('');
    }

    async renderPanel(tableName) {
        this.availableColumns = this.getColumnsForTable(tableName); //
        if (this.availableColumns.length === 0) { //
            return `<div class="error-message">Configuración de tabla no encontrada o incompleta para: ${tableName}.</div>`;
        }

        this.availableRoles = await RolesService.getAllRoles(); //

        if (this.availableRoles.length === 0 && this.currentRoleId) { //
            this.availableRoles = [{ id: this.currentRoleId, name: this.currentRoleId.toUpperCase() }]; //
        } else if (this.availableRoles.length > 0) { //
            if (!this.availableRoles.some(r => r.id === this.currentRoleId)) { //
                this.currentRoleId = this.availableRoles[0].id; //
            }
        }

        const initialConfig = await this.loadConfigFromDB(tableName, this.currentRoleId, this.currentUserId); //
        const initialVisibleIds = initialConfig.columnas_visibles; //
        this.currentConfigId = initialConfig.id; //

        const roleOptionsHTML = this.availableRoles.map(role => //
            `<option value="${role.id}" ${role.id === this.currentRoleId ? 'selected' : ''}>${role.name}</option>`
        ).join('');

        const initialColumnSwitchesHTML = this._renderColumnSwitches(initialVisibleIds); //

        const currentRoleName = this.availableRoles.find(r => r.id === this.currentRoleId)?.name || 'N/A'; //

        // --- INICIO DE AJUSTE: Formato del Nombre de la Tabla para el Título ---
        const formattedTableName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' ');

        return `
            <div id="column-visibility-manager-container" class="config-modal-body">
                <div class="config-header">
                    <h2 class="config-title">Gestión de Visibilidad de Columnas: ${formattedTableName}</h2>
                    <p class="config-instruction">Seleccione un rol para configurar las columnas visibles en la tabla de ${formattedTableName}.</p>
                </div>

                <div class="config-content-wrapper">
                    <div class="config-controls-side">
                        <h3 class="config-section-title">Configuración de Roles y Usuarios</h3>

                        <div class="control-group">
                            <label class="control-label">Aplicar a Rol:</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user-shield"></i></span>
                                <select id="role-select" class="form-control-select">
                                    ${roleOptionsHTML}
                                </select>
                            </div>
                        </div>

                        <div class="control-group">
                            <label class="control-label">Anulación por Usuario (Opcional):</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user"></i></span>
                                <select id="user-select" class="form-control-select" disabled>
                                    <option value="">Seleccionar Usuario...</option>
                                </select>
                            </div>
                        </div>

                        <div class="role-info-box">
                            <strong>Rol seleccionado:</strong> <span id="selected-role-name">${currentRoleName}</span>
                            <p>Los cambios se aplicarán a todos los usuarios con este rol.</p>
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
                    <button type="button" class="btn-save-changes" id="save-config-btn">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        `;
    }

    async loadConfigFromDB(tableName, roleId, userId = null) {
        const configResult = await ColConfigService.getConfig(tableName, roleId, userId); //

        if (configResult) { //
            return configResult; //
        } else {
            const defaultColumns = this.getColumnsForTable(tableName).map(c => c.id); //
            return { //
                id: null, //
                columnas_visibles: defaultColumns //
            };
        }
    }

    async initializePanelListeners() {
        const roleSelect = document.getElementById('role-select'); //
        const selectedRoleNameSpan = document.getElementById('selected-role-name'); //
        const selectAllLink = document.getElementById('select-all-columns'); //
        const columnSwitchesList = document.getElementById('column-switches-list'); //
        const saveButton = document.getElementById('save-config-btn'); //
        const cancelButton = document.getElementById('cancel-config-btn'); //
        const modal = document.getElementById('crud-modal'); //

        const tableName = 'producto'; //

        if (roleSelect && selectedRoleNameSpan && columnSwitchesList) { //
            roleSelect.addEventListener('change', async (e) => { //
                const selectedRole = e.target.value; //
                const roleName = e.target.options[e.target.selectedIndex].text; //
                selectedRoleNameSpan.textContent = roleName; //

                const config = await this.loadConfigFromDB(tableName, selectedRole, null); //
                this.currentConfigId = config.id; //
                this.updateSwitches(config.columnas_visibles); //
            });
        } else {
            console.error("ColumnVisibilityManager: No se pudo encontrar el SELECT o SPAN del rol."); //
        }

        if (selectAllLink && columnSwitchesList) { //
            selectAllLink.addEventListener('click', (e) => { //
                e.preventDefault(); //
                columnSwitchesList.querySelectorAll('.column-toggle').forEach(switchInput => { //
                    switchInput.checked = true; //
                });
            });
        }

        if (saveButton && roleSelect && modal) { //
            saveButton.addEventListener('click', async () => { //
                const currentRole = roleSelect.value; //
                const selectedColumns = Array.from(columnSwitchesList.querySelectorAll('.column-toggle')) //
                    .filter(s => s.checked) //
                    .map(s => s.getAttribute('data-column-id')); //

                const success = await ColConfigService.saveConfig( //
                    tableName, //
                    currentRole, //
                    selectedColumns, //
                    this.currentConfigId //
                );

                if (success) { //
                    alert(`✅ Configuración para el rol '${currentRole}' guardada con éxito.`); //
                } else {
                    alert(`❌ Error al guardar la configuración para el rol '${currentRole}'.`); //
                }

                modal.classList.remove('active'); //
                document.getElementById('modal-body').innerHTML = ''; //
            });
        } else {
            console.error("ColumnVisibilityManager: No se pudo encontrar el botón de guardar o elementos relacionados."); //
        }

        if (cancelButton && modal) { //
            cancelButton.addEventListener('click', () => { //
                modal.classList.remove('active'); //
                document.getElementById('modal-body').innerHTML = ''; //
            });
        }
    }

    updateSwitches(visibleIds) {
        const columnSwitchesList = document.getElementById('column-switches-list'); //
        if (columnSwitchesList) { //
            columnSwitchesList.innerHTML = this._renderColumnSwitches(visibleIds); //
        }
    }
}