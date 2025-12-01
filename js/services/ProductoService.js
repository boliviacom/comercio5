import { supabase } from '../supabaseClient.js';
import { REPORT_CONFIG } from '../config/tableConfigs.js';

const TABLE_NAME = 'producto';
// Nota: CONFIG.id_key es probablemente 'id'
const CONFIG = REPORT_CONFIG[TABLE_NAME];

/**
 * @description Sube un archivo de imagen al bucket 'productos' de Supabase Storage.
 * @param {File} file - El objeto File de la imagen.
 * @returns {Promise<string|null>} La URL pública de la imagen o null si no hay archivo.
 */
async function uploadProductImage(file) {
    if (!file || typeof file.size === 'undefined' || file.size === 0) {
        return null;
    }

    const originalFileName = file.name || '';
    const fileExtension = originalFileName.split('.').pop();

    // Generar un nombre único para el archivo
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error('Error al subir la imagen:', uploadError);
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

/**
 * @description Función auxiliar para asegurar la conversión de campos de cadena 
 * a booleanos (necesario para manejar switches/checkboxes del formulario).
 * @param {Object} data - Objeto plano con los datos del producto.
 */
const mapBooleanFields = (data) => {
    // Si los campos se manejan mediante switches interactivos o checkboxes separados
    // en el formulario, esta función asegura la conversión a booleanos.

    // El campo 'visible' se maneja por softDelete/toggleVisibility, pero se mapea si está presente.
    if (data.visible !== undefined) data.visible = data.visible === 'on' || data.visible === 'true' || data.visible === true;

    // Campos del catálogo (manejo de switches interactivos)
    if (data.mostrar_precio !== undefined) data.mostrar_precio = data.mostrar_precio === 'on' || data.mostrar_precio === 'true' || data.mostrar_precio === true;
    if (data.habilitar_whatsapp !== undefined) data.habilitar_whatsapp = data.habilitar_whatsapp === 'on' || data.habilitar_whatsapp === 'true' || data.habilitar_whatsapp === true;
    if (data.habilitar_formulario !== undefined) data.habilitar_formulario = data.habilitar_formulario === 'on' || data.habilitar_formulario === 'true' || data.habilitar_formulario === true;
};


export const ProductoService = {

    async fetchData() {
        let query = supabase.from(TABLE_NAME)
            .select(CONFIG.select)
            .eq('visible', true)
            .order(CONFIG.id_key, { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error('Error en ProductoService.fetchData:', error);
            throw new Error(`Error al cargar productos: ${error.message}`);
        }
        return data;
    },

    async create(formData) { // Aquí formData ES un FormData
        const file = formData.get('file_upload');
        const dataToInsert = Object.fromEntries(formData.entries());

        try {
            dataToInsert.imagen_url = await uploadProductImage(file);
        } catch (e) {
            throw e;
        }

        delete dataToInsert.file_upload;

        // Conversión de tipos
        dataToInsert.precio = parseFloat(dataToInsert.precio);
        dataToInsert.stock = parseInt(dataToInsert.stock);
        dataToInsert.id_categoria = parseInt(dataToInsert.id_categoria);

        // Mapear campos booleanos
        mapBooleanFields(dataToInsert);
        dataToInsert.visible = true; // Aseguramos que el nuevo producto esté visible

        const { error } = await supabase.from(TABLE_NAME).insert(dataToInsert);

        if (error) {
            console.error('Error en ProductoService.create:', error);
            throw new Error(`Error al crear producto: ${error.message}`);
        }
        return true;
    },

    /**
     * @description Inserta múltiples productos en la base de datos a partir de un array de objetos (ej. resultado de un CSV).
     * @param {Array<Object>} productsArray - Array de objetos que representan los productos a insertar.
     */
    async bulkCreate(productsArray) {
        // 1. Validar que productsArray sea un array de objetos
        if (!Array.isArray(productsArray) || productsArray.length === 0) {
            throw new Error('El array de productos está vacío o no es válido.');
        }

        // 2. Pre-procesar cada producto para asegurar tipos de datos correctos
        const dataToInsert = productsArray.map(product => {
            const processedProduct = { ...product };

            // Conversión de tipos (asumiendo que vienen como strings del CSV)
            if (processedProduct.precio !== undefined) processedProduct.precio = parseFloat(processedProduct.precio);
            if (processedProduct.stock !== undefined) processedProduct.stock = parseInt(processedProduct.stock);
            if (processedProduct.id_categoria !== undefined) processedProduct.id_categoria = parseInt(processedProduct.id_categoria);

            // Si 'visible' no viene definido en el CSV, asumimos 'true' por defecto.
            if (processedProduct.visible === undefined) processedProduct.visible = true;

            // Llamar a la función auxiliar para convertir 'true'/'false' (strings) a booleanos reales.
            mapBooleanFields(processedProduct);

            // Nota: No se maneja subida de imagen aquí, se asume que 'imagen_url' 
            // ya contiene una URL válida o null.

            return processedProduct;
        });

        // 3. Insertar masivamente con una sola llamada
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert(dataToInsert);

        if (error) {
            console.error('Error en ProductoService.bulkCreate:', error);
            const errorMessage = error.details || error.message;
            // Detalle el error para facilitar la depuración del CSV
            throw new Error(`Error al crear productos masivamente. Revise el formato de su CSV. Detalle: ${errorMessage}`);
        }
        return data;
    },

    // 🆕 FUNCIÓN PARA EL CONTROL GLOBAL (BULK UPDATE ALL)
    /**
     * @description Realiza un UPDATE masivo en la tabla 'producto' para un campo booleano específico en TODOS los productos.
     * @param {string} fieldName - El nombre del campo (columna) a actualizar (ej: 'mostrar_precio').
     * @param {boolean} value - El valor (true/false) a establecer.
     */
    async bulkUpdateAll(fieldName, value) {
        console.log(`[bulkUpdateAll] Actualizando ${fieldName} a ${value} para todos los productos.`);

        if (!fieldName || typeof value !== 'boolean') {
            throw new Error("Parámetros inválidos para la actualización masiva.");
        }

        // La sintaxis [fieldName]: value usa una clave dinámica para el objeto de actualización
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ [fieldName]: value })
            // Condición para actualizar TODAS las filas que tengan un ID.
            .neq(CONFIG.id_key, 0);

        if (error) {
            console.error("Error en ProductoService.bulkUpdateAll:", error);
            throw new Error(`Error al actualizar todos los productos masivamente. Detalle: ${error.message}`);
        }
        return true;
    },

    // ✅ FUNCIÓN CORREGIDA - AÑADIDA PARA SOPORTAR EL AdminProductManager.handleGlobalToggle
    /**
     * @description Realiza un UPDATE masivo en la tabla 'producto' para un campo
     * booleano específico, LIMITADO a un conjunto de IDs.
     * ESTA FUNCIÓN RESUELVE EL TypeError.
     * @param {Array<string|number>} ids - Array de IDs de los productos a actualizar.
     * @param {string} fieldName - El nombre del campo (columna) a actualizar (ej: 'mostrar_precio').
     * @param {boolean} value - El valor (true/false) a establecer.
     */
    async bulkUpdateByIds(ids, fieldName, value) {
        console.log(`[bulkUpdateByIds] Actualizando ${fieldName} a ${value} para ${ids.length} productos.`);

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error("El array de IDs para la actualización masiva está vacío o no es válido.");
        }
        if (!fieldName || typeof value !== 'boolean') {
            throw new Error("Parámetros inválidos para la actualización masiva.");
        }

        // La sintaxis [fieldName]: value usa una clave dinámica para el objeto de actualización
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ [fieldName]: value })
            // CLAVE: La cláusula .in() limita el update a los IDs proporcionados
            .in(CONFIG.id_key, ids);

        if (error) {
            console.error("Error en ProductoService.bulkUpdateByIds:", error);
            throw new Error(`Error al actualizar productos filtrados masivamente. Detalle: ${error.message}`);
        }
        return true;
    },
    // -----------------------------------------------------------


    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq(CONFIG.id_key, id)
            .single();

        if (error) {
            console.error('Error en ProductoService.getById:', error);
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
            console.error('[Supabase Error - getProductDetails]', error);
            throw new Error(`Error al obtener detalles del producto ID ${id}: ${error.message}`);
        }
        return data;
    },

    async updateField(id, data) { // 'data' es un objeto plano { field: value }
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error en ProductoService.updateField:', error);
            throw new Error(`Error al actualizar campo: ${error.message}`);
        }
        return true;
    },

    /**
     * @description Función que maneja la subida de imagen y la actualización de datos
     * @param {string} id - ID del producto.
     * @param {Object} dataToUpdate - Objeto plano con los datos del formulario (sin el archivo).
     * @param {File} file - El objeto File.
     * @param {string|null} currentImageUrl - La URL actual de la imagen.
     */
    async uploadAndSave(id, dataToUpdate, file, currentImageUrl = null) {
        try {
            if (file && file.size > 0) {
                // Subir la nueva imagen y obtener la URL pública
                dataToUpdate.imagen_url = await uploadProductImage(file);
            } else if (currentImageUrl) {
                // Mantener la imagen actual si no se subió una nueva
                dataToUpdate.imagen_url = currentImageUrl;
            } else {
                // No hay imagen
                dataToUpdate.imagen_url = null;
            }
        } catch (e) {
            throw e;
        }

        // Conversión de tipos (necesario si vienen como strings)
        if (dataToUpdate.precio !== undefined) dataToUpdate.precio = parseFloat(dataToUpdate.precio);
        if (dataToUpdate.stock !== undefined) dataToUpdate.stock = parseInt(dataToUpdate.stock);
        if (dataToUpdate.id_categoria !== undefined) dataToUpdate.id_categoria = parseInt(dataToUpdate.id_categoria);

        // Mapear campos booleanos
        mapBooleanFields(dataToUpdate);

        // Llamar a la función de actualización de la base de datos
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dataToUpdate)
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error en ProductoService.uploadAndSave (Supabase update):', error);
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
        return true;
    },


    /**
     * @description Actualiza un producto con un objeto plano de datos.
     * @param {string} id - ID del producto.
     * @param {Object} dataToUpdate - Objeto plano con los datos a actualizar.
     */
    async update(id, dataToUpdate) {

        // Conversión de tipos (necesario si vienen como strings)
        if (dataToUpdate.precio !== undefined) dataToUpdate.precio = parseFloat(dataToUpdate.precio);
        if (dataToUpdate.stock !== undefined) dataToUpdate.stock = parseInt(dataToUpdate.stock);
        if (dataToUpdate.id_categoria !== undefined) dataToUpdate.id_categoria = parseInt(dataToUpdate.id_categoria);

        // Mapear campos booleanos
        mapBooleanFields(dataToUpdate);

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dataToUpdate)
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error en ProductoService.update:', error);
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
        return true;
    },

    /**
     * @description Inhabilita (soft-delete) un producto estableciendo 'visible' a false.
     * @param {string} id - ID del producto.
     */
    async softDelete(id) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ visible: false })
            .eq(CONFIG.id_key, id);

        if (error) {
            console.error('Error en ProductoService.softDelete:', error);
            throw new Error(`Error al inhabilitar producto: ${error.message}`);
        }
        return true;
    },

    /**
     * @description Obtiene una lista de productos para ser usados en un <select>
     * @returns {Promise<Array<Object>>} Array de objetos con { value, text }.
     */
    async getSelectOptions() {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, nombre')
            .eq('visible', true)
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error en ProductoService.getSelectOptions:', error);
            throw new Error(`Error al cargar opciones de productos: ${error.message}`);
        }
        return data.map(item => ({ value: item.id, text: item.nombre }));
    }
};