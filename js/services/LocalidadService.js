import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'localidad';
const ID_KEY = 'id_localidad';
const CONFIG = REPORT_CONFIG[TABLE_NAME] || {
    id_key: ID_KEY,
    select: 'id_localidad, nombre, visible, municipio:id_municipio!inner(nombre)'
};

export const LocalidadService = {
    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order(ID_KEY, { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener datos de localidad:', error);
            throw new Error(`Error en el servicio de Localidad: ${error.message}`);
        }
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select(`*, municipio!inner(id_departamento)`)
            .eq(ID_KEY, id)
            .single();

        if (error) {
            console.error('Error al obtener localidad por ID:', error);
            throw new Error(`Localidad ID ${id} no encontrada: ${error.message}`);
        }

        return {
            ...data,
            id_departamento: data.municipio.id_departamento
        };
    },

    async create(payload) {
        const { error } = await supabase.from(TABLE_NAME)
            .insert([{ ...payload, visible: true }]);

        if (error) {
            console.error('Error al crear localidad:', error);
            if (error.code === '23505') {
                throw new Error(`Ya existe una localidad con el nombre "${payload.nombre}" en el municipio seleccionado.`);
            }
            throw new Error(`No se pudo crear la localidad: ${error.message}`);
        }
    },

    async update(id, payload) {
        const { error } = await supabase.from(TABLE_NAME)
            .update(payload)
            .eq(ID_KEY, id);

        if (error) {
            console.error('Error al actualizar localidad:', error);
            throw new Error(`No se pudo actualizar la localidad ID ${id}: ${error.message}`);
        }
    },

    async softDelete(id) {
        const current = await this.getById(id);
        const newVisibleState = !current.visible;

        const { error } = await supabase.from(TABLE_NAME)
            .update({ visible: newVisibleState })
            .eq(ID_KEY, id);

        if (error) {
            console.error('Error al cambiar visibilidad:', error);
            throw new Error(`Error al cambiar la visibilidad de la localidad ID ${id}: ${error.message}`);
        }
        return newVisibleState;
    },

    async getSelectOptions(municipioId = null) {
        let query = supabase.from(TABLE_NAME)
            .select(`${ID_KEY}, nombre`)
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (municipioId) {
            query = query.eq('id_municipio', municipioId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error en ${TABLE_NAME}.getSelectOptions:`, error);
            throw new Error(`Error al cargar las localidades: ${error.message}`);
        }

        return data.map(item => ({
            value: item[ID_KEY],
            text: item.nombre
        }));
    },
};