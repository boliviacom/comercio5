import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'producto';
const CONFIG = REPORT_CONFIG[TABLE_NAME];

async function uploadProductImage(file) {
    if (!file || typeof file.size === 'undefined' || file.size === 0) {
        return null;
    }

    const originalFileName = file.name || '';
    const fileExtension = originalFileName.split('.').pop();

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

async function deleteProductImageFile(imageUrl) {
    if (!imageUrl) {
        return true;
    }

    try {
        const parts = imageUrl.split('/');
        const fileNameWithBucket = parts.slice(parts.indexOf('productos') + 1).join('/');

        const filePath = fileNameWithBucket;

        const bucketIndex = imageUrl.indexOf('/productos/');
        if (bucketIndex === -1) {
            console.warn("No se encontró el bucket 'productos' en la URL. Saltando eliminación de archivo.");
            return true;
        }

        const pathInBucket = imageUrl.substring(bucketIndex + '/productos/'.length);

        const { error: deleteError } = await supabase.storage
            .from('productos')
            .remove([pathInBucket]);

        if (deleteError) {
            if (deleteError.statusCode !== '404') {
                console.error('Error al eliminar el archivo de Supabase Storage:', deleteError);
                throw new Error(`Error al eliminar el archivo de imagen: ${deleteError.message}`);
            } else {
                console.warn('Advertencia: El archivo de imagen no se encontró en el Storage (404), pero se continuará con la limpieza de la base de datos.');
            }
        }

        return true;

    } catch (e) {
        throw new Error(`Fallo en la eliminación del archivo: ${e.message}`);
    }
}

const mapBooleanFields = (data) => {
    if (data.visible !== undefined) data.visible = data.visible === 'on' || data.visible === 'true' || data.visible === true;
    if (data.mostrar_precio !== undefined) data.mostrar_precio = data.mostrar_precio === 'on' || data.mostrar_precio === 'true' || data.mostrar_precio === true;
    if (data.habilitar_whatsapp !== undefined) data.habilitar_whatsapp = data.habilitar_whatsapp === 'on' || data.habilitar_whatsapp === 'true' || data.habilitar_whatsapp === true;
    if (data.habilitar_formulario !== undefined) data.habilitar_formulario = data.habilitar_formulario === 'on' || data.habilitar_formulario === 'true' || data.habilitar_formulario === true;
};


export const ProductoService = {

    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(`
                *, 
                id_categoria,
                c:categoria(id, nombre) 
            `)
            .eq('visible', true)
            .order(CONFIG.id_key, { ascending: true });

        const { data, error } = await query;

        if (error) {
            throw new Error(`Error al cargar productos: ${error.message}`);
        }
        return data;
    },

    async create(formData) {
        const file = formData.get('file_upload');
        const dataToInsert = Object.fromEntries(formData.entries());

        try {
            dataToInsert.imagen_url = await uploadProductImage(file);
        } catch (e) {
            throw e;
        }

        delete dataToInsert.file_upload;

        dataToInsert.precio = parseFloat(dataToInsert.precio);
        dataToInsert.stock = parseInt(dataToInsert.stock);
        dataToInsert.id_categoria = parseInt(dataToInsert.id_categoria);

        mapBooleanFields(dataToInsert);
        dataToInsert.visible = true;

        const { error } = await supabase.from(TABLE_NAME).insert(dataToInsert);

        if (error) {
            throw new Error(`Error al crear producto: ${error.message}`);
        }
        return true;
    },

    async bulkCreate(productsArray) {
        if (!Array.isArray(productsArray) || productsArray.length === 0) {
            throw new Error('El array de productos está vacío o no es válido.');
        }

        const dataToInsert = productsArray.map(product => {
            const processedProduct = { ...product };

            if (processedProduct.precio !== undefined) processedProduct.precio = parseFloat(processedProduct.precio);
            if (processedProduct.stock !== undefined) processedProduct.stock = parseInt(processedProduct.stock);
            if (processedProduct.id_categoria !== undefined) processedProduct.id_categoria = parseInt(processedProduct.id_categoria);

            if (processedProduct.visible === undefined) processedProduct.visible = true;

            mapBooleanFields(processedProduct);

            return processedProduct;
        });

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert(dataToInsert);

        if (error) {
            const errorMessage = error.details || error.message;
            throw new Error(`Error al crear productos masivamente. Revise el formato de su CSV. Detalle: ${errorMessage}`);
        }
        return data;
    },

    async deleteImage(id) {
        const productData = await this.getById(id);
        const currentImageUrl = productData.imagen_url;

        if (!currentImageUrl) {
            return true;
        }

        try {
            await deleteProductImageFile(currentImageUrl);

            const { error: updateError } = await supabase
                .from(TABLE_NAME)
                .update({ imagen_url: null })
                .eq(CONFIG.id_key, id);

            if (updateError) {
                console.error('Error al limpiar el campo imagen_url en la DB:', updateError);
                throw new Error(`Error al actualizar la base de datos después de borrar la imagen: ${updateError.message}`);
            }

            return true;
        } catch (e) {
            console.error('Fallo en ProductoService.deleteImage:', e);
            throw e;
        }
    },

    async bulkUpdateAll(fieldName, value) {
        if (!fieldName || typeof value !== 'boolean') {
            throw new Error("Parámetros inválidos para la actualización masiva.");
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ [fieldName]: value })
            .neq(CONFIG.id_key, 0);

        if (error) {
            throw new Error(`Error al actualizar todos los productos masivamente. Detalle: ${error.message}`);
        }
        return true;
    },

    async bulkUpdateByIds(ids, fieldName, value) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error("El array de IDs para la actualización masiva está vacío o no es válido.");
        }
        if (!fieldName || typeof value !== 'boolean') {
            throw new Error("Parámetros inválidos para la actualización masiva.");
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ [fieldName]: value })
            .in(CONFIG.id_key, ids);

        if (error) {
            throw new Error(`Error al actualizar productos filtrados masivamente. Detalle: ${error.message}`);
        }
        return true;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq(CONFIG.id_key, id)
            .single();

        if (error) {
            throw new Error(`Error al obtener producto ID ${id}: ${error.message}`);
        }
        return data;
    },

    async getProductDetails(id) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, nombre, precio')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Error al obtener detalles del producto ID ${id}: ${error.message}`);
        }
        return data;
    },

    async updateField(id, data) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq(CONFIG.id_key, id);

        if (error) {
            throw new Error(`Error al actualizar campo: ${error.message}`);
        }
        return true;
    },

    async uploadAndSave(id, dataToUpdate, file, isEdit = true) {
        let currentImageUrl = null;

        if (isEdit) {
            const existingProduct = await this.getById(id);
            currentImageUrl = existingProduct?.imagen_url;
        }


        try {
            if (file && file.size > 0) {
                dataToUpdate.imagen_url = await uploadProductImage(file);

                if (isEdit && currentImageUrl) {
                    await deleteProductImageFile(currentImageUrl);
                }

            } else if (currentImageUrl) {
                dataToUpdate.imagen_url = currentImageUrl;
            } else {
                dataToUpdate.imagen_url = null;
            }
        } catch (e) {
            throw e;
        }

        if (dataToUpdate.precio !== undefined) dataToUpdate.precio = parseFloat(dataToUpdate.precio);
        if (dataToUpdate.stock !== undefined) dataToUpdate.stock = parseInt(dataToUpdate.stock);
        if (dataToUpdate.id_categoria !== undefined) dataToUpdate.id_categoria = parseInt(dataToUpdate.id_categoria);

        mapBooleanFields(dataToUpdate);

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dataToUpdate)
            .eq(CONFIG.id_key, id);

        if (error) {
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
        return true;
    },

    async update(id, dataToUpdate) {
        if (dataToUpdate.precio !== undefined) dataToUpdate.precio = parseFloat(dataToUpdate.precio);
        if (dataToUpdate.stock !== undefined) dataToUpdate.stock = parseInt(dataToUpdate.stock);
        if (dataToUpdate.id_categoria !== undefined) dataToUpdate.id_categoria = parseInt(dataToUpdate.id_categoria);

        mapBooleanFields(dataToUpdate);

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dataToUpdate)
            .eq(CONFIG.id_key, id);

        if (error) {
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
        return true;
    },

    async softDelete(id) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ visible: false })
            .eq(CONFIG.id_key, id);

        if (error) {
            throw new Error(`Error al inhabilitar producto: ${error.message}`);
        }
        return true;
    },

    async getSelectOptions() {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, nombre')
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (error) {
            throw new Error(`Error al cargar opciones de productos: ${error.message}`);
        }
        return data.map(item => ({ value: item.id, text: item.nombre }));
    }
};