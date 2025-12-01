import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'municipio';
const ID_KEY = 'id_municipio';
const CONFIG = REPORT_CONFIG[TABLE_NAME] || { id_key: ID_KEY, select: 'id_municipio, nombre, id_departamento, visible, departamento!inner(nombre)' };

export const MunicipioService = {
    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order(ID_KEY, { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener datos de municipio:', error);
            throw new Error(`Error en el servicio de Municipio: ${error.message}`);
        }
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select('*')
            .eq(ID_KEY, id)
            .single();

        if (error) {
            console.error('Error al obtener municipio por ID:', error);
            throw new Error(`Municipio ID ${id} no encontrado: ${error.message}`);
        }
        return data;
    },

    async create(payload) {
        const { nombre, id_departamento } = payload;
        const visible = true;

        const { error } = await supabase.from(TABLE_NAME)
            .insert([{ nombre, id_departamento, visible }]);

        if (error) {
            console.error('Error al crear municipio:', error);

            if (error.code === '23505') {
                throw new Error(`Ya existe un municipio con el nombre "${nombre}" en el departamento seleccionado.`);
            }

            throw new Error(`No se pudo crear el municipio: ${error.message}`);
        }
    },

    async update(id, payload) {
        const { nombre, id_departamento } = payload;

        const updateData = {
            nombre: nombre,
            id_departamento: id_departamento
        };

        const { error } = await supabase.from(TABLE_NAME)
            .update(updateData)
            .eq(ID_KEY, id);

        if (error) {
            console.error('Error al actualizar municipio:', error);

            if (error.code === '23505') {
                throw new Error(`Ya existe otro municipio con el nombre "${nombre}" en el departamento seleccionado.`);
            }

            throw new Error(`No se pudo actualizar el municipio ID ${id}: ${error.message}`);
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
            throw new Error(`Error al cambiar la visibilidad del municipio ID ${id}: ${error.message}`);
        }
        return newVisibleState;
    },

    async getSelectOptions(departamentoId = null) {
        let query = supabase.from(TABLE_NAME)
            .select(`${ID_KEY}, nombre`)
            .eq('visible', true)
            .order(ID_KEY, { ascending: true });

        if (departamentoId) {
            query = query.eq('id_departamento', departamentoId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error en ${TABLE_NAME}.getSelectOptions:`, error);
            throw new Error(`Error al cargar los municipios: ${error.message}`);
        }

        return data.map(item => ({
            value: item[ID_KEY],
            text: item.nombre
        }));
    },
};