import { AuthManager } from './authManager.js';

window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const eyeOpenIcon = document.getElementById('eye-open');
    const eyeClosedIcon = document.getElementById('eye-closed');
    
    if (passwordInput && eyeOpenIcon && eyeClosedIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeOpenIcon.style.display = 'none';
            eyeClosedIcon.style.display = 'block';
        } else {
            passwordInput.type = 'password';
            eyeOpenIcon.style.display = 'block';
            eyeClosedIcon.style.display = 'none';
        }
    }
};

window.handleLogin = async function (event) {
    event.preventDefault();

    const authManager = new AuthManager();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('password');
    const submitButton = event.submitter;

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value.trim() || "";

    if (email === "" || password === "") {
        alert("⚠️ No puedes dejar campos vacíos."); return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        alert("⚠️ Ingresa un correo electrónico válido."); return;
    }
    

    if (submitButton) submitButton.disabled = true;

    const authResult = await authManager.iniciarSesion(email, password);

    if (!authResult.success) {
        if (submitButton) submitButton.disabled = false;
        alert("⚠️ Error: El correo o la contraseña son incorrectos.");
        return;
    }

    const perfilUsuario = await authManager.getPerfilActual();

    if (!perfilUsuario || perfilUsuario.rol !== 'administrador') {
        await authManager.cerrarSesion();
        if (submitButton) submitButton.disabled = false;
        alert("❌ Acceso denegado. Solo los administradores pueden acceder por esta vía.");
        return;
    }

    localStorage.setItem("usuarioEmail", email);
    localStorage.setItem("usuarioId", perfilUsuario.id);
    localStorage.setItem("usuarioRol", perfilUsuario.rol);

    alert("✅ ¡Inicio de sesión de Administrador exitoso!");
    window.location.href = "administracion.html";
}


document.addEventListener("DOMContentLoaded", function () {
});