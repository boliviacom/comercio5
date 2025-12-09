import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'direccion';
const ID_KEY = 'id_direccion';

const FULL_SELECT = `
    ${ID_KEY},
    id_usuario,
    calle_avenida,
    numero_casa_edificio,
    referencia_adicional,
    visible,
    id_zona,
    z:zona!id_zona(
        id_localidad,
        l:localidad!id_localidad(
            id_municipio,
            m:municipio!id_municipio(
                id_departamento
            )
        )
    )
`.replace(/\s/g, '');

/**
 * Función de utilidad para limpiar el payload: convierte todas las cadenas vacías,
 * o la representación de la cadena "null", a null.
 * Esto es crucial para campos opcionales (nullable) en la base de datos,
 * y para prevenir errores de tipo en las IDs (bigint/uuid) cuando son enviadas como "".
 * @param {Object} rawPayload - Objeto con los datos del formulario.
 * @returns {Object} Payload limpio.
 */
const cleanPayload = (rawPayload) => {
    const cleaned = {};
    for (const [key, value] of Object.entries(rawPayload)) {
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        
        // CORRECCIÓN: Convierte "" y la cadena "null" a null
        if (typeof trimmedValue === 'string' && (trimmedValue === '' || trimmedValue.toLowerCase() === 'null')) {
            cleaned[key] = null;
        } else {
            cleaned[key] = trimmedValue;
        }
    }
    return cleaned;
};


export const DireccionService = {

    async fetchData(params) {
        const validParams = params && typeof params === 'object' ? params : {};
        const { select, order } = validParams;

        const selectQuery = typeof select === 'string' && select.length > 0 ? select : '*';

        const orderString = typeof order === 'string' ? order : null;
        const orderParts = orderString ? orderString.split('.') : ['id_direccion', 'asc'];
        const column = orderParts[0];
        const ascending = orderParts[1] !== 'desc';

        let query = supabase
            .from(TABLE_NAME)
            .select(selectQuery);

        query = query.order(column, { ascending: ascending });

        const { data, error } = await query;

        if (error) {
            console.error('[Supabase Error - fetchData]', error);
            throw new Error(`Error al cargar datos de ${TABLE_NAME}: ${error.message}`);
        }

        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(FULL_SELECT)
            .eq(ID_KEY, id)
            .single();

        if (error) {
            console.error('[Supabase Error - getById]', error);
            throw new Error(`Error al obtener ${TABLE_NAME} ID ${id}: ${error.message}`);
        }
        return data;
    },

    async create(formData) {
        const rawPayload = Object.fromEntries(formData.entries());
        const payload = cleanPayload(rawPayload); // <-- Usa la versión mejorada

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([payload])
            .select();

        if (error) {
            console.error('[Supabase Error - create]', error);
            throw new Error(`Error al crear dirección: ${error.message}`);
        }
        return data[0];
    },

    async update(id, formData) {
        const rawPayload = Object.fromEntries(formData.entries());
        const payload = cleanPayload(rawPayload); // <-- Usa la versión mejorada

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(payload)
            .eq(ID_KEY, id);

        if (error) {
            console.error('[Supabase Error - update]', error);
            throw new Error(`Error al actualizar dirección ID ${id}: ${error.message}`);
        }
        return data;
    },

    async getSelectOptions() {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id_direccion, calle_avenida, numero_casa_edificio')
            .order('calle_avenida', { ascending: true });

        if (error) {
            console.error('[Supabase Error - getSelectOptions]', error);
            throw new Error(`Error al cargar opciones de dirección: ${error.message}`);
        }

        return data.map(item => ({
            value: item.id_direccion,
            text: `${item.calle_avenida} N°${item.numero_casa_edificio}`
        }));
    },

    async createOrGetId(payload) {
        const cleanPayloadData = cleanPayload(payload);
        const { id_zona, calle_avenida, numero_casa_edificio, referencia_adicional, id_usuario } = cleanPayloadData;

        if (!id_zona || !calle_avenida) { // Removí numero_casa_edificio de la validación porque es nullable.
            throw new Error("Datos de dirección incompletos.");
        }

        try {
            let query = supabase
                .from(TABLE_NAME)
                .select(ID_KEY)
                .eq('id_zona', id_zona)
                .ilike('calle_avenida', calle_avenida)
                // Usamos "is null" si numero_casa_edificio es null, o el valor si existe.
                // Si la columna numero_casa_edificio es NULLABLE, esto es más robusto:
                // .filter('numero_casa_edificio', 'eq', numero_casa_edificio);
                
                // Lo mantendré como ilike para no cambiar demasiado el comportamiento original.
                .ilike('numero_casa_edificio', numero_casa_edificio)
                .maybeSingle();

            const { data: existingData, error: searchError } = await query;

            if (searchError && searchError.code !== 'PGRST116' && searchError.details !== 'The result contains 0 rows') {
                throw searchError;
            }

            if (existingData) {
                return existingData[ID_KEY];
            }

            const insertPayload = {
                id_zona,
                calle_avenida,
                numero_casa_edificio,
                referencia_adicional,
                id_usuario
            };

            const { data: newData, error: insertError } = await supabase
                .from(TABLE_NAME)
                .insert([insertPayload])
                .select(ID_KEY)
                .single();

            if (insertError) throw insertError;

            return newData[ID_KEY];

        } catch (error) {
            console.error('[DireccionService Error - createOrGetId]', error);
            throw new Error(`Error en la gestión de la dirección: ${error.message || error.details}`);
        }
    }
};