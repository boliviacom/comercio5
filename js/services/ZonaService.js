import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'zona';
const ID_KEY = 'id_zona';
const CONFIG = REPORT_CONFIG[TABLE_NAME] || { id_key: ID_KEY, select: 'id_zona, nombre, id_localidad, visible, localidad!inner(nombre)' };

export const ZonaService = {
    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order(ID_KEY, { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener datos de zona:', error);
            throw new Error(`Error en el servicio de Zona: ${error.message}`);
        }
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select('*')
            .eq(ID_KEY, id)
            .single();

        if (error) {
            console.error('Error al obtener zona por ID:', error);
            throw new Error(`Zona ID ${id} no encontrada: ${error.message}`);
        }
        return data;
    },

    async create(payload) {
        const nombre = payload.nombre;
        const id_localidad = payload.id_localidad;
        const visible = true;

        const { error } = await supabase.from(TABLE_NAME)
            .insert([{ nombre, id_localidad, visible }]);

        if (error) {
            console.error('Error al crear zona:', error);
            throw new Error(`No se pudo crear la zona: ${error.message}`);
        }
    },

    async update(id, payload) {
        const nombre = payload.nombre;
        const id_localidad = payload.id_localidad;

        const updatePayload = {
            nombre: nombre,
            id_localidad: id_localidad
        };

        const { error } = await supabase.from(TABLE_NAME)
            .update(updatePayload)
            .eq(ID_KEY, id);

        if (error) {
            console.error('Error al actualizar zona:', error);
            throw new Error(`No se pudo actualizar la zona ID ${id}: ${error.message}`);
        }
    },

    async softDelete(id) {
        const { error } = await supabase.from(TABLE_NAME)
            .update({ visible: false })
            .eq(ID_KEY, id);

        if (error) {
            console.error('Error al eliminar zona:', error);
            throw new Error(`Error al eliminar la zona ID ${id}: ${error.message}`);
        }
        return false;
    },

    async getSelectOptions(localidadId = null) {
        let query = supabase.from(TABLE_NAME)
            .select(`${ID_KEY}, nombre`)
            .eq('visible', true)
            .order(ID_KEY, { ascending: true });

        if (localidadId) {
            query = query.eq('id_localidad', localidadId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error en ${TABLE_NAME}.getSelectOptions:`, error);
            throw new Error(`Error al cargar las zonas: ${error.message}`);
        }

        return data.map(item => ({
            value: item[ID_KEY],
            text: item.nombre
        }));
    },
};