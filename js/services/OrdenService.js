import { supabase } from '../supabaseClient.js';
import { DireccionService } from './DireccionService.js';

const TABLE_NAME = 'orden';

function normalizeEnum(value) {
    if (typeof value === 'string') {
        return value.trim().toLowerCase();
    }
    return value;
}

export const OrdenService = {

    async fetchData(params) {
        const validParams = params && typeof params === 'object' ? params : {};
        const { select, order } = validParams;

        const FULL_TABLE_SELECT = `*,
            u:usuario!id_usuario(ci),
            d:direccion!id_direccion(
                calle_avenida,
                numero_casa_edificio,
                referencia_adicional,
                z:zona!id_zona(
                    nombre,
                    l:localidad!id_localidad(
                        nombre,
                        m:municipio!id_municipio(
                            nombre,
                            dpt:departamento!id_departamento(
                                nombre
                            )
                        )
                    )
                )
            )
        `;
        
        const selectQuery = typeof select === 'string' && select.length > 0 && select !== '*' ? select : FULL_TABLE_SELECT;

        const orderString = typeof order === 'string' ? order : null;
        const orderParts = orderString ? orderString.split('.') : ['id', 'asc'];
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
            .select(`*,
                u:usuario!id_usuario(ci),
                d:direccion!id_direccion(
                    calle_avenida,
                    numero_casa_edificio,
                    referencia_adicional,
                    z:zona!id_zona(
                        id_zona, 
                        nombre,
                        l:localidad!id_localidad(
                            id_localidad,
                            nombre,
                            m:municipio!id_municipio(
                                id_municipio,
                                nombre,
                                dpt:departamento!id_departamento(
                                    id_departamento, 
                                    nombre
                                )
                            )
                        )
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('[Supabase Error - getById]', error);
            throw new Error(`Error al obtener ${TABLE_NAME} ID ${id}: ${error.message}`);
        }

        if (data) {
            if (data.u) {
                data.ci_cliente = data.u.ci;
                delete data.u;
            }
            
            if (data.d) {
                const zona = data.d.z;
                const localidad = zona?.l;
                const municipio = localidad?.m;
                const departamento = municipio?.dpt; 
                
                data.direccion_data = {
                    calle_avenida: data.d.calle_avenida,
                    numero_casa_edificio: data.d.numero_casa_edificio,
                    referencia_adicional: data.d.referencia_adicional,
                    zona_nombre: zona?.nombre,
                    localidad_nombre: localidad?.nombre
                };
                
                data.addressHierarchy = {
                    id_departamento: departamento?.id_departamento,
                    id_municipio: municipio?.id_municipio,
                    id_localidad: localidad?.id_localidad,
                    id_zona: zona?.id_zona,
                };
                
                delete data.d;
            }
        }
        return data;
    },

    async create(formData) {
        const payload = Object.fromEntries(formData.entries());

        const direccion_data = {
            id_localidad: payload.id_localidad_form,
            id_zona: payload.id_zona,
            calle_avenida: payload.calle_avenida,
            numero_casa_edificio: payload.numero_casa_edificio,
            referencia_adicional: payload.referencia_adicional || '',
            id_usuario: payload.id_usuario,
        };
        const id_direccion_final = await DireccionService.createOrGetId(direccion_data);
        payload.id_direccion = id_direccion_final;

        if (payload.total === '' || payload.total === null || payload.total === undefined) {
            payload.total = '0.00';
        }

        if (payload.estado) {
            payload.estado = normalizeEnum(payload.estado);
        }
        if (payload.metodo_pago) {
            payload.metodo_pago = normalizeEnum(payload.metodo_pago);
        }

        payload.visible = true;

        delete payload.ci_cliente;
        delete payload.id_departamento_form;
        delete payload.id_municipio_form;
        delete payload.id_localidad_form;
        delete payload.id_zona;
        delete payload.calle_avenida;
        delete payload.numero_casa_edificio;
        delete payload.referencia_adicional;

        const { data: newOrder, error } = await supabase
            .from(TABLE_NAME)
            .insert(payload)
            .select();

        if (error) {
            console.error('[Supabase Error - create]', error);
            throw new Error(`Error al crear orden: ${error.message}`);
        }
        return newOrder[0];
    },

    async update(id, formData) {

        const payload = Object.fromEntries(formData.entries());
        const keys = Object.keys(payload);

        const isSoftDelete = keys.length === 1 && keys[0] === 'visible';

        if (payload.estado) {
            payload.estado = normalizeEnum(payload.estado);
        }
        if (payload.metodo_pago) {
            payload.metodo_pago = normalizeEnum(payload.metodo_pago);
        }

        if (!isSoftDelete) {

            if (payload.total === '' || payload.total === null || payload.total === undefined) {
                payload.total = '0.00';
            }

            const direccion_data = {
                id_localidad: payload.id_localidad_form,
                id_zona: payload.id_zona,
                calle_avenida: payload.calle_avenida,
                numero_casa_edificio: payload.numero_casa_edificio,
                referencia_adicional: payload.referencia_adicional || '',
                id_usuario: payload.id_usuario,
            };
            const id_direccion_final = await DireccionService.createOrGetId(direccion_data);
            payload.id_direccion = id_direccion_final;

            delete payload.id_departamento_form;
            delete payload.id_municipio_form;
            delete payload.id_localidad_form;
            delete payload.id_zona;
            delete payload.calle_avenida;
            delete payload.numero_casa_edificio;
            delete payload.referencia_adicional;
            delete payload.ci_cliente;
            delete payload.id;
        }

        const { data: updatedOrder, error } = await supabase
            .from(TABLE_NAME)
            .update(payload)
            .eq('id', id)
            .select();

        if (error) {
            console.error('[Supabase Error - update]', error);
            throw new Error(`Error al actualizar orden ID ${id}: ${error.message}`);
        }
        return updatedOrder;
    },

    async updateTotal(id, newTotal) {
        const payload = {
            total: parseFloat(newTotal)
        };

        const { data: updatedOrder, error } = await supabase
            .from(TABLE_NAME)
            .update(payload)
            .eq('id', id)
            .select();

        if (error) {
            console.error('[Supabase Error - updateTotal]', error);
            throw new Error(`Error al actualizar el total de la orden ID ${id}: ${error.message}`);
        }
        return updatedOrder;
    },

    async toggleVisibility(id, newVisibility) {
        const payload = {
            visible: newVisibility,
        };

        const { data: updatedOrder, error } = await supabase
            .from(TABLE_NAME)
            .update(payload)
            .eq('id', id)
            .select();

        if (error) {
            console.error('[Supabase Error - toggleVisibility]', error);
            throw new Error(`Error al actualizar la visibilidad de la orden ID ${id}: ${error.message}`);
        }
        return updatedOrder;
    },
};