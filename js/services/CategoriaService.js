import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'categoria';
const CONFIG = REPORT_CONFIG[TABLE_NAME] || { id_key: 'id', select: '*' };

export const CategoriaService = {
    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order('id', { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener datos de categoría:', error);
            throw new Error(`Error en el servicio: ${error.message}`);
        }
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select('*')
            .eq(CONFIG.id_key, id)
            .single();

        if (error) {
            console.error('Error al obtener categoría por ID:', error);
            throw new Error(`Categoría ID ${id} no encontrada: ${error.message}`);
        }
        return data;
    },

    async create(payload) {
        const nombre = payload.nombre;
        const visible = payload.visible;

        const { error } = await supabase.from(TABLE_NAME)
            .insert([{ nombre, visible }]);

        if (error) {
            console.error('Error al crear categoría:', error);
            throw new Error(`No se pudo crear la categoría: ${error.message}`);
        }
    },

    async update(id, payload) {
        const nombre = payload.nombre;
        const visible = payload.visible;

        const { error } = await supabase.from(TABLE_NAME)
            .update({ nombre: nombre, visible: visible })
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error al actualizar categoría:', error);
            throw new Error(`No se pudo actualizar la categoría ID ${id}: ${error.message}`);
        }
    },

    async softDelete(id) {
        const current = await this.getById(id);
        const newVisibleState = !current.visible;

        const { error } = await supabase.from(TABLE_NAME)
            .update({ visible: newVisibleState })
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error al cambiar visibilidad:', error);
            throw new Error(`Error al cambiar la visibilidad de la categoría ID ${id}: ${error.message}`);
        }
        return newVisibleState;
    },

    async getSelectOptions() {
        const { data, error } = await supabase.from(TABLE_NAME)
            .select('id, nombre')
            .eq('visible', true)
            .order('id', { ascending: true });

        if (error) {
            console.error('Error en CategoriaService.getSelectOptions:', error);
            throw new Error(`Error al cargar las categorías: ${error.message}`);
        }

        return data.map(item => ({
            value: item.id,
            text: item.nombre
        }));
    },
};