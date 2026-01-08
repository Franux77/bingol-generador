'use client';

import { useState } from 'react';

export default function LoginForm({ onLoginExitoso }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    // Simular delay de red
    setTimeout(() => {
      if (usuario.trim() === '' || password.trim() === '') {
        setError('Por favor completa todos los campos');
        setCargando(false);
        return;
      }

      onLoginExitoso(usuario, password);
      setCargando(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/icon.png" 
                alt="Logo Bingol" 
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Bingol
            </h1>
            <p className="text-gray-600">Iniciar Sesión</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                placeholder="Ingresa tu usuario"
                disabled={cargando}
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                placeholder="Ingresa tu contraseña"
                disabled={cargando}
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={cargando}
              className={`w-full py-3 px-6 rounded-lg font-bold text-lg transition ${
                cargando
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando...
                </span>
              ) : (
                '🔐 Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Info adicional */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Sistema de uso privado
            </p>
          </div>
        </div>

        {/* Footer del login */}
        <div className="text-center mt-6 text-white text-sm">
          <p>© {new Date().getFullYear()} Bingol - Generador de Cartones de Bingo</p>
        </div>
      </div>
    </div>
  );
}