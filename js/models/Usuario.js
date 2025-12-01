export class Usuario {
    constructor(data) {
        this.primer_nombre = data.primer_nombre || '';
        this.segundo_nombre = data.segundo_nombre || null;
        this.apellido_paterno = data.apellido_paterno || '';
        this.apellido_materno = data.apellido_materno || '';
        this.ci = data.ci || ''; 
        this.correo_electronico = data.correo_electronico || '';
        this.contrasena = data.contrasena || '';
        this.celular = data.celular || '';
        this.visible = data.visible === undefined ? true : data.visible;
        this.rol = data.rol || 'cliente';
    }

    toSupabaseObject(incluirContrasena = false) {
        const obj = {
            id: this.id,
            primer_nombre: this.primer_nombre,
            segundo_nombre: this.segundo_nombre,
            apellido_paterno: this.apellido_paterno,
            apellido_materno: this.apellido_materno,
            ci: this.ci, 
            correo_electronico: this.correo_electronico,
            celular: this.celular,
            rol: this.rol,
            visible: this.visible,
        };
        if (incluirContrasena && this.contrasena) {
            obj.contrasena = this.contrasena; 
        }
        return obj;
    }
}