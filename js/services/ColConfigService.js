// js/services/ColConfigService.js

import { supabase } from '../supabaseClient.js';

const TABLE_NAME = 'configuracion_columnas';

export class ColConfigService {

    static async getConfig(tableName, roleId, userId = null) {
        let config = null;

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

        if (!config && roleId) {
            const { data: roleData, error: roleError } = await supabase
                .from(TABLE_NAME)
                .select('id, columnas_visibles')
                .eq('tabla_nombre', tableName)
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