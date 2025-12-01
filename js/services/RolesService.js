// js/services/RolesService.js

import { supabase } from '../supabaseClient.js';

const ENUM_TYPE_NAME = 'user_rol';

export class RolesService {

    /**
     * Obtiene la lista de todos los roles disponibles consultando el tipo ENUM 'user_rol'.
     * @returns {Promise<Array<{id: string, name: string}>>}
     */
    static async getAllRoles() {
        const { data, error } = await supabase.rpc('get_enum_values', {
            enum_name: ENUM_TYPE_NAME
        });

        if (error) {
            console.error(`Error fetching ENUM values for ${ENUM_TYPE_NAME}:`, error);
            return [];
        }

        // 🔑 CORRECCIÓN: Normalizamos el array para extraer el string del rol.
        // El resultado de la RPC es un array de objetos como: [{ get_enum_values: 'admin' }, ...]

        const roleStrings = data.map(item => {
            // Buscamos la propiedad que contiene el string del rol (puede ser el nombre de la función RPC)
            const roleValue = item[ENUM_TYPE_NAME] || item.value || item.get_enum_values;
            return roleValue;
        }).filter(Boolean); // Filtramos cualquier valor nulo/indefinido

        // Mapear los strings del rol al formato {id, name}
        return roleStrings.map(roleValue => {
            // Aseguramos que sea un string antes de usar métodos de string
            if (typeof roleValue !== 'string') return null;

            // Formateo del nombre (Capitalización y reemplazo de guiones bajos)
            const formattedName = roleValue.charAt(0).toUpperCase() +
                roleValue.slice(1).replace(/_/g, ' ');

            return {
                id: roleValue,
                name: formattedName
            };
        }).filter(Boolean); // Filtramos cualquier entrada nula
    }
}