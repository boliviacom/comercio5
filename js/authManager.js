import { supabase } from './supabaseClient.js';
import { Usuario } from './models/Usuario.js';

export class AuthManager {
    
    async crearUsuario(userData) {
        const nuevoUsuario = new Usuario(userData);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: nuevoUsuario.correo_electronico,
            password: nuevoUsuario.contrasena,
        });

        if (authError) {
            return { success: false, error: authError.message };
        }
        
        const user = authData.user || authData.session?.user;
        
        if (!user) {
             return { success: true, message: "Registro completo. Por favor, revisa tu correo electrónico para verificar tu cuenta e iniciar sesión." };
        }
        
        const perfilData = nuevoUsuario.toSupabaseObject(true); 
        perfilData.id = user.id; 
        
        const { error: profileError } = await supabase
            .from('usuario')
            .insert([perfilData]);

        if (profileError) {
            console.error("Error al crear el perfil:", profileError);
            return { success: false, error: "Error al guardar los detalles del perfil (el C.I. podría estar ya registrado o fallo en la BD)." };
        }

        return { success: true, usuario: nuevoUsuario };
    }
    
    async getActiveUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
    
    async iniciarSesion(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) {
            return { success: false, error: "Credenciales inválidas, cuenta no verificada o error de servidor." };
        }
        return { success: true, session: data.session };
    }
    
    async cerrarSesion() {
        const { error } = await supabase.auth.signOut();
        return { success: !error, error: error?.message };
    }
    
    async getPerfilActual() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        
        const { data, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            return null;
        }
        return new Usuario(data);
    }
}