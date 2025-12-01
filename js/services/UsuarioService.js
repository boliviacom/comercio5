import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'usuario';
const CONFIG = REPORT_CONFIG[TABLE_NAME] || { id_key: 'id', select: 'id, primer_nombre' };

export const UsuarioService = {
    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order('primer_nombre', { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener datos de usuario:', error);
            throw new Error(`Error en el servicio de Usuario: ${error.message}`);
        }
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select('*')
            .eq(CONFIG.id_key, id)
            .single();

        if (error) {
            console.error('Error al obtener usuario por ID:', error);
            if (error.code === 'PGRST116') return null;
            throw new Error(`Usuario ID ${id} no encontrado: ${error.message}`);
        }
        return data;
    },

    async getCiById(uuid) {
        if (!uuid) return null;

        const { data, error } = await supabase.from(TABLE_NAME)
            .select('ci')
            .eq(CONFIG.id_key, uuid)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[UsuarioService - getCiById] Error fetching CI:', error);
            throw new Error(`Error al obtener CI: ${error.message}`);
        }

        return data ? data.ci : null;
    },

    async getIdByCi(ci) {
        if (!ci) return null;

        const { data, error } = await supabase.from(TABLE_NAME)
            .select(CONFIG.id_key)
            .eq('ci', ci.trim())
            .eq('visible', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error al buscar usuario por CI:', error);
            throw new Error(`Error en la base de datos al buscar CI: ${error.message}`);
        }

        return data ? data[CONFIG.id_key] : null;
    },

    async create(formData) {
        const email = formData.get('correo_electronico');
        const password = formData.get('contrasena');
        const rol = formData.get('rol') || 'cliente';

        const userMetadata = {
            ci: formData.get('ci'),
            primer_nombre: formData.get('primer_nombre'),
            segundo_nombre: formData.get('segundo_nombre'),
            apellido_paterno: formData.get('apellido_paterno'),
            apellido_materno: formData.get('apellido_materno'),
            celular: formData.get('celular'),
            rol: rol,
            contrasena: password,
            correo_electronico: email,
        };

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: userMetadata,
            }
        });

        if (authError) {
            console.error('Error de autenticación (signUp):', authError);
            throw new Error(`Fallo en el registro de autenticación: ${authError.message}`);
        }

        if (!authData.user) {
            throw new Error("El usuario se registró pero no se pudo obtener su ID. Revise la configuración de 'auto-confirm'.");
        }
    },

    async update(id, dataOrFormData) {
        let payload = {};
        let nuevaContrasena = null;
        let nuevoEmail = null;

        if (dataOrFormData instanceof FormData) {
            payload = {
                ci: dataOrFormData.get('ci'),
                primer_nombre: dataOrFormData.get('primer_nombre'),
                segundo_nombre: dataOrFormData.get('segundo_nombre'),
                apellido_paterno: dataOrFormData.get('apellido_paterno'),
                apellido_materno: dataOrFormData.get('apellido_materno'),
                celular: dataOrFormData.get('celular'),
                rol: dataOrFormData.get('rol'),
                visible: dataOrFormData.has('visible') ?
                    dataOrFormData.get('visible') === 'on' :
                    undefined,
            };

            nuevaContrasena = dataOrFormData.get('contrasena');
            nuevoEmail = dataOrFormData.get('correo_electronico');
            payload.correo_electronico = nuevoEmail;

        } else if (typeof dataOrFormData === 'object' && dataOrFormData !== null) {
            payload = dataOrFormData;
        } else {
            throw new Error("Formato de datos de actualización no soportado.");
        }

        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        if (nuevaContrasena) {
            const { error: authError } = await supabase.auth.admin.updateUserById(id, {
                password: nuevaContrasena,
            });
            if (authError) {
                console.error('Error al actualizar contraseña/auth:', authError);
                throw new Error(`No se pudo actualizar la contraseña en Auth: ${authError.message}`);
            }

            payload.contrasena = nuevaContrasena;
        }

        const { error } = await supabase.from(TABLE_NAME)
            .update(payload)
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error al actualizar perfil de usuario:', error);
            throw new Error(`No se pudo actualizar el usuario ID ${id}: ${error.message}`);
        }
    },
};