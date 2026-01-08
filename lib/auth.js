// lib/auth.js
// Sistema de autenticación simple para uso personal

// CREDENCIALES (cambialas por las tuyas)
const USUARIO_CORRECTO = '12torresfranco@gmail.com';  // ← Cambia esto
const PASSWORD_CORRECTA = 'FrancoTorres21..';  // ← Cambia esto

export function verificarCredenciales(usuario, password) {
  return usuario === USUARIO_CORRECTO && password === PASSWORD_CORRECTA;
}

export function guardarSesion() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bingol_auth', 'true');
    localStorage.setItem('bingol_timestamp', Date.now().toString());
  }
}

export function cerrarSesion() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bingol_auth');
    localStorage.removeItem('bingol_timestamp');
  }
}

export function verificarSesion() {
  if (typeof window !== 'undefined') {
    const auth = localStorage.getItem('bingol_auth');
    const timestamp = localStorage.getItem('bingol_timestamp');
    
    if (!auth || !timestamp) {
      return false;
    }
    
    // Sesión válida por 7 días
    const DURACION_SESION = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
    const tiempoTranscurrido = Date.now() - parseInt(timestamp);
    
    if (tiempoTranscurrido > DURACION_SESION) {
      cerrarSesion();
      return false;
    }
    
    return true;
  }
  return false;
}