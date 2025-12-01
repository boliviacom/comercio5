// js/services/ColConfigService.js

// Supón que tu cliente Supabase se exporta desde este path
import { supabase } from '../supabaseClient.js';

const TABLE_NAME = 'configuracion_columnas';

export class ColConfigService {

    /**
     * Obtiene la configuración de columnas para una tabla y un rol específicos.
     * @param {string} tableName - El nombre de la tabla (ej: 'producto').
     * @param {string} roleId - El ID del rol (ej: 'admin').
     * @param {string|null} userId - Opcional. ID del usuario para anular el rol.
     * @returns {Promise<Array<string>|null>} Un array de IDs de columnas visibles o null si no se encuentra.
     */
    static async getConfig(tableName, roleId, userId = null) {
        let query = supabase
            .from(TABLE_NAME)
            .select('id, columnas_visibles')
            .eq('tabla_nombre', tableName)
            .limit(1);

        let config = null;

        // 1. Intentar buscar por USUARIO (Override)
        if (userId) {
            const { data: userData, error: userError } = await query
                .eq('usuario_id', userId)
                .maybeSingle();

            if (userError) {
                console.error('Error fetching user config:', userError);
            }
            if (userData) {
                config = userData;
            }
        }

        // 2. Si no hay override de usuario, buscar por ROL
        if (!config && roleId) {
            const { data: roleData, error: roleError } = await query
                .eq('rol_id', roleId)
                .is('usuario_id', null)
                .maybeSingle();

            if (roleError) {
                console.error('Error fetching role config:', roleError);
            }
            if (roleData) {
                config = roleData;
            }
        }

        return config ? { id: config.id, columnas_visibles: config.columnas_visibles } : null;
    }

    /**
     * Guarda o actualiza la configuración de columnas.
     * @param {string} tableName - Nombre de la tabla.
     * @param {string} roleId - ID del rol.
     * @param {Array<string>} columnsArray - Array de IDs de columnas visibles.
     * @param {string|null} existingId - ID de la fila existente, si se está actualizando.
     * @returns {Promise<boolean>} Éxito o fracaso de la operación.
     */
    static async saveConfig(tableName, roleId, columnsArray, existingId = null) {
        const dataToSave = {
            tabla_nombre: tableName,
            rol_id: roleId,
            usuario_id: null, // Asumimos que siempre guardamos la configuración de rol, no de usuario individual aquí
            columnas_visibles: columnsArray,
        };

        let result;

        if (existingId) {
            // Actualizar fila existente
            result = await supabase
                .from(TABLE_NAME)
                .update(dataToSave)
                .eq('id', existingId);
        } else {
            // Insertar nueva fila
            result = await supabase
                .from(TABLE_NAME)
                .insert([dataToSave]);
        }

        if (result.error) {
            console.error('Error saving column configuration:', result.error);
            return false;
        }

        return true;
    }
}