import { supabase } from '../supabaseClient.js';

const TABLE_NAME = 'orden_detalle';

export const OrdenDetalleService = {

    async fetchData() {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`id,id_orden,cantidad,precio_unitario,visible,p:producto!id_producto(nombre)`) 
            .order('id_orden', { ascending: true })
            .order('id', { ascending: true });

        if (error) {
            console.error('[Supabase Error - fetchData]', error);
            throw new Error(`Error al obtener todos los detalles de orden: ${error.message}`);
        }
        return data;
    },

    async fetchByOrdenId(ordenId) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, p:producto!id_producto(nombre)')
            .eq('id_orden', ordenId)
            .eq('visible', true)
            .order('id', { ascending: true });

        if (error) {
            console.error('[Supabase Error - fetchByOrdenId]', error);
            throw new Error(`Error al obtener los detalles de la orden ${ordenId}: ${error.message}`);
        }
        return data;
    },

    async create(formData) {
        const record = {
            id_orden: parseInt(formData.get('id_orden')),
            id_producto: parseInt(formData.get('id_producto')),
            cantidad: parseInt(formData.get('cantidad')),
            precio_unitario: parseFloat(formData.get('precio_unitario')),
            visible: true,
        };

        if (record.cantidad <= 0 || !record.id_producto || record.precio_unitario <= 0 || !record.id_orden) {
            throw new Error("Datos de detalle incompletos o inválidos (cantidad, precio unitario o ID de orden debe ser positivo).");
        }

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([record])
            .select()
            .single();

        if (error) {
            console.error('[Supabase Error - create]', error);
            throw new Error(`Error al crear el detalle de la orden: ${error.message}`);
        }

        return data;
    },

    async update(detalleId, formData) {
        const record = {
            id_producto: parseInt(formData.get('id_producto')),
            cantidad: parseInt(formData.get('cantidad')),
            precio_unitario: parseFloat(formData.get('precio_unitario')),
        };

        if (record.cantidad <= 0 || record.precio_unitario <= 0) {
            throw new Error("Cantidad o precio unitario debe ser positivo.");
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(record)
            .eq('id', detalleId);

        if (error) {
            console.error('[Supabase Error - update]', error);
            throw new Error(`Error al actualizar el detalle ID ${detalleId}: ${error.message}`);
        }
    },

    async toggleVisibility(detalleId, visible) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ visible: visible })
            .eq('id', detalleId);

        if (error) {
            console.error('[Supabase Error - toggleVisibility]', error);
            throw new Error(`Error al actualizar la visibilidad del detalle ID ${detalleId}: ${error.message}`);
        }
    },
};