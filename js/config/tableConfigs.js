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
        select: `id,fecha,total,metodo_pago,estado,visible,u:usuario!id_usuario(primer_nombre),d:direccion!id_direccion(calle_avenida)`.replace(/\s/g, ''),
        headers: [
            'N°',
            'CLIENTE',
            'FECHA',
            'TOTAL',
            'MÉTODO PAGO',
            'DIRECCIÓN COMPLETA',
            'ESTADO',
            'Visible'
        ],
        fields: [
            'id',
            'u.primer_nombre',
            'fecha',
            'total',
            'metodo_pago',
            'd.calle_avenida',
            'estado',
            'visible'
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


export const CRUD_FIELDS_CONFIG = {
    'producto': [
        { name: 'nombre', label: 'Nombre del Producto', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
        { name: 'precio', label: 'Precio Unitario (Bs.)', type: 'number', step: '0.01', required: true },
        { name: 'stock', label: 'Stock Actual', type: 'number', required: true },
        { name: 'id_categoria', label: 'Categoría', type: 'select', required: true },
    ],
    'categoria': [
        { name: 'nombre', label: 'Nombre de la Categoría', type: 'text', required: true },
        { name: 'visible', label: '¿Es Visible al Público?', type: 'checkbox', required: false },
    ],
    'usuario': [
        { name: 'ci', label: 'Cédula de Identidad (CI)', type: 'text', required: true },
        { name: 'primer_nombre', label: 'Primer Nombre', type: 'text', required: true },
        { name: 'apellido_paterno', label: 'Apellido Paterno', type: 'text', required: true },
        { name: 'correo_electronico', label: 'Correo Electrónico', type: 'email', required: true },
    ],
};