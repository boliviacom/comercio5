import { supabase } from '../supabaseClient.js';

const TABLE_NAME = 'configuracion_columnas';

export class ColConfigService {

    /**
     * Obtiene la configuración de columnas, dando prioridad a la anulación por usuario.
     * @param {string} tableName - Nombre de la tabla.
     * @param {string|null} roleId - ID del rol (puede ser nulo si no hay rol seleccionado, pero se usa para fallback).
     * @param {string|null} userId - ID del usuario para anular la configuración de rol.
     * @returns {Promise<object|null>} Configuración encontrada o null.
     */
    static async getConfig(tableName, roleId, userId = null) {
        let config = null;

        // 1. Intentar buscar por USUARIO (Override)
        if (userId) {
            const { data: userData, error: userError } = await supabase
                .from(TABLE_NAME)
                .select('id, columnas_visibles')
                .eq('tabla_nombre', tableName)
                .eq('usuario_id', userId)
                .maybeSingle();

            if (userError) {
                console.error('Error fetching user config:', userError);
            }
            if (userData) {
                config = userData;
            }
        }

        // 2. Intentar buscar por ROL (solo si no se encontró anulación de usuario y roleId no es nulo)
        if (!config && roleId) {
            const { data: roleData, error: roleError } = await supabase
                .from(TABLE_NAME)
                .select('id, columnas_visibles')
                .eq('tabla_nombre', tableName)
                .eq('rol_id', roleId)
                .is('usuario_id', null) // Aseguramos que sea configuración de rol base
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
     * @param {string|null} roleId - ID del rol (null si es anulación por usuario).
     * @param {string|null} userId - ID del usuario (null si es configuración de rol).
     * @param {Array<string>} columnsArray - Array de IDs de columnas visibles.
     * @param {string|null} existingId - ID de la fila existente, si se está actualizando.
     * @returns {Promise<boolean>} Éxito o fracaso de la operación.
     */
    static async saveConfig(tableName, roleId, userId, columnsArray, existingId = null) {
        const dataToSave = {
            tabla_nombre: tableName,
            rol_id: roleId,
            usuario_id: userId,
            columnas_visibles: columnsArray,
        };

        let result;

        if (existingId) {
            result = await supabase
                .from(TABLE_NAME)
                .update(dataToSave)
                .eq('id', existingId)
                .select();
        } else {
            result = await supabase
                .from(TABLE_NAME)
                .insert([dataToSave])
                .select();
        }

        if (result.error) {
            console.error('Error saving column configuration:', result.error);
            return false;
        }

        return true;
    }
}