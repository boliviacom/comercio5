import { supabase } from '../supabaseClient.js';

const TABLE_NAME = 'usuario';

export class UsersService {

    /**
     * Busca usuarios por Cédula de Identidad (CI), opcionalmente filtrando por rol.
     * @param {string} searchTerm - El término de búsqueda (CI).
     * @param {string|null} roleId - El ID del rol para filtrar, o null/'' para buscar en todos los roles.
     * @returns {Promise<Array<object>>} Lista de usuarios encontrados.
     */
    static async searchUsers(searchTerm, roleId) {
        if (!searchTerm || searchTerm.length < 1) {
            return [];
        }

        const searchPattern = `%${searchTerm}%`;

        let query = supabase
            .from(TABLE_NAME)
            .select('id, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, rol, ci');

        // Solo aplicamos el filtro de rol si se ha seleccionado un roleId válido
        if (roleId && roleId !== '') {
            query = query.eq('rol', roleId);
        }

        // Filtramos por CI (ilike)
        query = query.ilike('ci', searchPattern);

        const { data, error } = await query
            .order('ci', { ascending: true })
            .limit(15);

        if (error) {
            console.error('Error searching users:', error);
            return [];
        }

        return data.map(user => ({
            id: user.id,
            name: `${user.primer_nombre} ${user.segundo_nombre || ''} ${user.apellido_paterno} ${user.apellido_materno || ''} (CI: ${user.ci}) [${user.rol}]`,
            rol: user.rol,
            ci: user.ci
        }));
    }

    static async getUserById(userId) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, rol, ci')
            .eq('id', userId)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            name: `${data.primer_nombre} ${data.segundo_nombre || ''} ${data.apellido_paterno} ${data.apellido_materno || ''} (CI: ${data.ci}) [${data.rol}]`,
            rol: data.rol,
            ci: data.ci
        };
    }

    // Mantenemos getAllUsers por si acaso
    static async getAllUsers() {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, primer_nombre, apellido_paterno, rol')
            .order('primer_nombre', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data.map(user => ({
            id: user.id,
            name: `${user.primer_nombre} ${user.apellido_paterno || ''} [${user.rol}]`,
            rol: user.rol
        }));
    }
}