export const REPORT_CONFIG = {
    'producto': {
        select: 'id, nombre, imagen_url, descripcion, precio, stock, visible, mostrar_precio, habilitar_whatsapp, habilitar_formulario, c:categoria!id_categoria(nombre)',
        id_key: 'id',
        headers: [
            'N°',
            'Nombre de Producto',
            'Imagen',
            'Descripción',
            'Precio Unitario',
            'Stock Actual',
            'Categoría',
            'Mostrar Precio',
            'WhatsApp',
            'Formulario Cont.',
            'Visible'
        ],
        fields: [
            'id',
            'nombre',
            'imagen_url',
            'descripcion',
            'precio',
            'stock',
            'c.nombre',
            'mostrar_precio',
            'habilitar_whatsapp',
            'habilitar_formulario',
            'visible'
        ]
    },
    'categoria': {
        select: 'id, nombre, visible',
        id_key: 'id',
        headers: ['N°', 'Nombre de Categoría', 'Visible'],
        fields: ['id', 'nombre', 'visible']
    },
    'usuario': {
        id_key: 'id',
        select: 'id, ci, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, rol, correo_electronico, contrasena, visible',
        headers: ['ID', 'CI', 'Nombre', 'Apellido', 'ROL', 'Correo Electrónico', 'Contraseña', 'Visible'],
        fields: ['id', 'ci', 'primer_nombre', 'apellido_paterno', 'rol', 'correo_electronico', 'contrasena', 'visible']
    },
    'direccion': {
        id_key: 'id_direccion',
        select: `id_direccion,calle_avenida,numero_casa_edificio,referencia_adicional,visible,u:usuario!id_usuario(primer_nombre,segundo_nombre,apellido_paterno,apellido_materno),z:zona!id_zona(nombre,l:localidad!id_localidad(nombre))`.replace(/\s/g, ''),
        headers: [
            'N°',
            'CLIENTE',
            'LOCALIDAD',
            'CALLE/AVENIDA',
            'N° CASA/EDIFICIO',
            'REFERENCIA ADICIONAL',
            'ZONA',
            'Visible'
        ],
        fields: [
            'id_direccion',
            'u.primer_nombre',
            'z.l.nombre',
            'calle_avenida',
            'numero_casa_edificio',
            'referencia_adicional',
            'z.nombre',
            'visible'
        ]
    },
    'orden': {
        id_key: 'id',
        // --- INICIO DE LA CORRECCIÓN CLAVE PARA EDICIÓN (Paso 1) ---
        // Se añadieron ci, segundo_nombre, apellido_paterno, apellido_materno al SELECT
        select: `id,fecha,total,metodo_pago,estado,visible,
                u:usuario!id_usuario(ci,primer_nombre,segundo_nombre,apellido_paterno,apellido_materno),
                d:direccion!id_direccion(
                    calle_avenida,
                    numero_casa_edificio,
                    referencia_adicional,
                    z:zona!id_zona(
                        nombre,
                        l:localidad!id_localidad(
                            nombre
                        )
                    )
                )`.replace(/\s/g, ''),
        // --- FIN DE LA CORRECCIÓN CLAVE ---
        headers: [
            'N°',
            'CLIENTE',
            'FECHA',
            'TOTAL',
            'MÉTODO PAGO',
            'DIRECCIÓN COMPLETA',
            'ESTADO'
        ],
        fields: [
            'id',
            'u.primer_nombre',
            'fecha',
            'total',
            'metodo_pago',
            'd.calle_avenida',
            'estado'
        ]
    },
    'orden_detalle': {
        id_key: 'id',
        select: `id,id_orden,cantidad,precio_unitario,visible,p:producto!id_producto(nombre)`.replace(/\s/g, ''),
        headers: [
            'ID DETALLE',
            'N° ORDEN',
            'PRODUCTO',
            'CANTIDAD',
            'PRECIO UNITARIO',
            'VISIBLE'
        ],
        fields: [
            'id',
            'id_orden',
            'p.nombre',
            'cantidad',
            'precio_unitario',
            'visible'
        ]
    },
    'departamento': {
        select: 'id_departamento, nombre, visible',
        id_key: 'id_departamento',
        headers: ['N°', 'Nombre de Departamento', 'Visible'],
        fields: ['id_departamento', 'nombre', 'visible']
    },
    'municipio': {
        id_key: 'id_municipio',
        select: 'id_municipio,nombre,id_departamento,visible,departamento!inner(nombre)'.replace(/\s/g, ''),
        headers: ['N°', 'MUNICIPIO', 'DEPARTAMENTO', 'VISIBLE'],
        fields: ['id_municipio', 'nombre', 'departamento.nombre', 'visible']
    },
    'localidad': {
        id_key: 'id_localidad',
        headers: ['N°', 'LOCALIDAD', 'MUNICIPIO', 'VISIBLE'],
        select: 'id_localidad, nombre, visible, municipio:id_municipio!inner(nombre)',
        fields: ['id_localidad', 'nombre', 'municipio.nombre', 'visible']
    },
    'zona': {
        id_key: 'id_zona',
        select: 'id_zona, nombre, visible, l:localidad!inner(nombre)',
        headers: ['NOMBRE DE ZONA', 'LOCALIDAD', 'VISIBLE'],
        fields: ['nombre', 'l.nombre', 'visible']
    },
};

/**
 * Configuración de campos para formularios de Creación/Edición (CRUD).
 * Define el nombre, etiqueta, tipo y reglas de validación/configuración para cada campo
 * en las diferentes entidades.
 */
export const CRUD_FIELDS_CONFIG = {
    'producto': [
        { name: 'nombre', label: 'Nombre del Producto', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
        { name: 'precio', label: 'Precio Unitario (Bs.)', type: 'number', step: '0.01', required: true },
        { name: 'stock', label: 'Stock Actual', type: 'number', required: true },
        { name: 'file_upload', label: 'Subir Imagen (Max 2MB)', type: 'file', required: false },
        {
            name: 'id_categoria',
            label: 'Categoría',
            type: 'select',
            required: true,
            options_service: 'CategoriaService'
        },
        { name: 'imagen_url', label: 'Imagen URL', type: 'hidden' },
    ],
    'categoria': [
        { name: 'nombre', label: 'Nombre de la Categoría', type: 'text', required: true, maxLength: 50 },
        { name: 'visible', label: '¿Es Visible al Público?', type: 'checkbox', required: false },
    ],
    'usuario': [
        { name: 'id', label: 'ID (UUID)', type: 'hidden', disabled: true },
        { name: 'ci', label: 'Cédula de Identidad (CI)', type: 'text', required: true },
        { name: 'primer_nombre', label: 'Primer Nombre', type: 'text', required: true },
        { name: 'segundo_nombre', label: 'Segundo Nombre', type: 'text', required: false },
        { name: 'apellido_paterno', label: 'Apellido Paterno', type: 'text', required: true },
        { name: 'apellido_materno', label: 'Apellido Materno', type: 'text', required: true },
        { name: 'celular', label: 'Celular', type: 'text', required: true },
        { name: 'correo_electronico', label: 'Correo Electrónico', type: 'email', required: true },
        { name: 'contrasena', label: 'Contraseña', type: 'password', required: false, placeholder: 'Dejar vacío para mantener la actual' },
        { name: 'rol', label: 'Rol', type: 'text', disabled: true },
    ],
    'direccion': [
        { name: 'id_direccion', label: 'ID', type: 'hidden', disabled: true },
        {
            name: 'id_usuario',
            label: 'Usuario (Propietario)',
            type: 'select',
            required: true,
            options_service: 'UsuarioService'
        },
        {
            name: 'id_zona',
            label: 'Zona',
            type: 'select',
            required: true,
            options_service: 'ZonaService'
        },
        {
            name: 'id_localidad',
            label: 'Localidad',
            type: 'select',
            required: false,
            options_service: 'LocalidadService'
        },
        { name: 'calle_avenida', label: 'Calle/Avenida', type: 'text', required: true, maxLength: 150 },
        { name: 'numero_casa_edificio', label: 'N° Casa/Edificio', type: 'text', required: false, maxLength: 20 },
        { name: 'referencia_adicional', label: 'Referencia Adicional', type: 'textarea', required: false },
    ],
    'orden': [
        { name: 'id', label: 'ID', type: 'hidden', disabled: true },
        // --- INICIO DE LA CORRECCIÓN CLAVE PARA EL ERROR DE ALERTA (Paso 3) ---
        // Se cambió required: true a required: false
        { name: 'fecha', label: 'Fecha de Creación', type: 'datetime-local', required: false, disabled: true },
        // --- FIN DE LA CORRECCIÓN CLAVE ---
        {
            name: 'id_usuario',
            label: 'Cédula de Identidad (Cliente)',
            type: 'select',
            required: true,
            is_client_ci: true
        },
        {
            name: 'id_direccion',
            label: 'Dirección de Entrega',
            type: 'select',
            required: true,
            options_service: 'DireccionService',
            dependency: 'id_localidad_form'
        },
        {
            name: 'metodo_pago',
            label: 'Método de Pago',
            type: 'select',
            required: true,
            is_enum: true,
            options: ['QR', 'EFECTIVO', 'TARJETA'],
        },
        {
            name: 'estado',
            label: 'Estado de la Orden',
            type: 'select',
            required: true,
            is_enum: true,
            options: ['PENDIENTE', 'ENTREGADO', 'CANCELADO'],
        },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false },
        { name: 'visible', label: 'Visible', type: 'checkbox' },
        { name: 'total', label: 'Total', type: 'hidden', disabled: true },
    ],
    'orden_detalle': [
        { name: 'id_producto', label: 'Producto', type: 'select', required: true, options_service: 'ProductoService' },
        { name: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: '1' },
        { name: 'precio_unitario', label: 'Precio Unitario (Bs.)', type: 'number', step: '0.01', required: true, disabled: true },
    ],
    'departamento': [
        { name: 'nombre', label: 'Nombre del Departamento', type: 'text', required: true, maxLength: 50 },
        { name: 'visible', label: '¿Es Visible?', type: 'checkbox', required: false },
    ],
    'municipio': [
        { name: 'nombre', label: 'Nombre del Municipio', type: 'text', required: true, placeholder: 'Ejem: El Alto' },
        { name: 'id_departamento', label: 'Departamento', type: 'select', required: true, placeholder: 'Seleccione un Departamento' },
        { name: 'visible', label: 'Visible', type: 'checkbox', required: false, disabled: true },
    ],
    'localidad': [
        { name: 'id_localidad', label: 'ID Localidad', type: 'text', disabled: true },
        {
            name: 'id_departamento',
            label: 'Departamento',
            type: 'select',
            required: true,
            placeholder: 'Seleccione un departamento',
            serviceName: 'departamento'
        },
        {
            name: 'id_municipio',
            label: 'Municipio',
            type: 'select',
            required: true,
            placeholder: 'Seleccione un municipio',
            serviceName: 'municipio',
            dependsOn: 'id_departamento'
        },
        { name: 'nombre', label: 'Nombre de la Localidad', type: 'text', required: true, maxLength: 100 },
        { name: 'visible', label: 'Visible', type: 'checkbox', default: true, disabled: true }
    ],
    'zona': [
        { name: 'id_departamento', label: 'Departamento', type: 'select', required: true, placeholder: 'Seleccione un departamento' },
        { name: 'id_municipio', label: 'Municipio', type: 'select', required: true, placeholder: 'Seleccione un municipio' },
        {
            name: 'id_localidad',
            label: 'Localidad',
            type: 'select',
            required: true,
            placeholder: 'Seleccione la Localidad'
        },
        { name: 'nombre', label: 'Nombre de la Zona', type: 'text', required: true, placeholder: 'Ej: Zona Central' },
        { name: 'visible', label: 'Visible', type: 'hidden', default: true, disabled: true }
    ],
};