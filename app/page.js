'use client';

import { useState, useEffect } from 'react';
import { generarMultiplesSeries } from '@/lib/generadorBingo';
import { generarMultiplesPDFs } from '@/lib/generadorPDF';
import { MODOS_GENERACION } from '@/lib/configCartones';
import { verificarCredenciales, guardarSesion, cerrarSesion, verificarSesion } from '@/lib/auth';
import { obtenerGeneraciones, buscarCarton, obtenerEstadisticas } from '@/lib/consultas';
import { auditarBaseDeDatos, verificarSerie, buscarCartonesConErrores } from '@/lib/validacion';
import LoginForm from '@/components/LoginForm';

export default function Home() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [cantidadSeries, setCantidadSeries] = useState(1);
  const [serieInicial, setSerieInicial] = useState(1);
  const [modoColor, setModoColor] = useState('fijo');
  const [colorSeleccionado, setColorSeleccionado] = useState('#1976D2');
  const [modoGeneracion, setModoGeneracion] = useState(MODOS_GENERACION.NORMAL);
  const [marcaAgua, setMarcaAgua] = useState('@graficoemprendedor');
  const [copiasPorCarton, setCopiasPorCarton] = useState(3);
  const [nombreCliente, setNombreCliente] = useState('');
  const [notasPedido, setNotasPedido] = useState('');
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [pdfsGenerados, setPdfsGenerados] = useState([]);
  const [generaciones, setGeneraciones] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [estadisticas, setEstadisticas] = useState({ totalCartones: 0, totalGeneraciones: 0, ultimaSerie: 0 });
  const [buscandoCarton, setBuscandoCarton] = useState(false);
  const [serieBuscar, setSerieBuscar] = useState('');
  const [numeroCartonBuscar, setNumeroCartonBuscar] = useState('');
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);
  const [auditando, setAuditando] = useState(false);
  const [reporteAuditoria, setReporteAuditoria] = useState(null);
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);

  // Verificar sesión y cargar datos al iniciar
  useEffect(() => {
    const sesionValida = verificarSesion();
    setAutenticado(sesionValida);
    setVerificandoSesion(false);
    
    // Cargar generaciones y estadísticas desde Supabase
    if (sesionValida) {
      cargarDatos();
    }
  }, []);

  const cargarDatos = async () => {
    const gens = await obtenerGeneraciones(30);
    setGeneraciones(gens);
    
    const stats = await obtenerEstadisticas();
    setEstadisticas(stats);
  };

  const buscarCartonEnBD = async () => {
    if (!serieBuscar || !numeroCartonBuscar) {
      alert('Por favor ingresa serie y número de cartón');
      return;
    }

    setBuscandoCarton(true);
    const carton = await buscarCarton(parseInt(serieBuscar), parseInt(numeroCartonBuscar));
    
    if (carton) {
      setResultadoBusqueda({
        encontrado: true,
        carton: carton,
        fecha: new Date(carton.fecha_generacion).toLocaleString('es-AR')
      });
    } else {
      setResultadoBusqueda({
        encontrado: false,
        mensaje: `No se encontró el cartón Serie ${serieBuscar} N° ${numeroCartonBuscar}`
      });
    }
    
    setBuscandoCarton(false);
  };

  const ejecutarAuditoria = async () => {
    setAuditando(true);
    setMostrarAuditoria(true);
    
    const reporte = await auditarBaseDeDatos();
    const cartonesConErrores = await buscarCartonesConErrores();
    
    setReporteAuditoria({
      ...reporte,
      cartonesDetallados: cartonesConErrores
    });
    
    setAuditando(false);
  };

  const handleLogin = (usuario, password) => {
    if (verificarCredenciales(usuario, password)) {
      guardarSesion();
      setAutenticado(true);
    } else {
      alert('❌ Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      cerrarSesion();
      setAutenticado(false);
      setPdfsGenerados([]);
      setMensaje('');
    }
  };

  // Mostrar loading mientras verifica sesión
  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Mostrar login si no está autenticado
  if (!autenticado) {
    return <LoginForm onLoginExitoso={handleLogin} />;
  }

  const colores = [
    { nombre: 'Naranja', valor: '#E65100' },  // Naranja más oscuro y fuerte
    { nombre: 'Azul', valor: '#1976D2' },      // Azul más oscuro (era celeste)
    { nombre: 'Negro', valor: '#2E2E2E' },
    { nombre: 'Verde', valor: '#2E7D32' },     // Verde más oscuro y fuerte
    { nombre: 'Rojo', valor: '#D32F2F' },      // Rojo fuerte (era rosa)
    { nombre: 'Morado', valor: '#9C27B0' },
  ];

  const handleGenerar = async () => {
    if (cantidadSeries < 1 || cantidadSeries > 500) {
      setMensaje('La cantidad de series debe estar entre 1 y 500');
      return;
    }

    setGenerando(true);
    setProgreso(0);
    setMensaje('Generando cartones únicos...');
    setPdfsGenerados([]);

    try {
      const series = await generarMultiplesSeries(
        cantidadSeries,
        modoColor,
        [colorSeleccionado],
        serieInicial,
        modoGeneracion,
        nombreCliente || null,
        notasPedido || null
      );

      setProgreso(50);
      setMensaje('Creando archivos PDF...');

      const opciones = {
        marcaAgua: marcaAgua,
        copiasPorCarton: copiasPorCarton
      };

      const pdfs = generarMultiplesPDFs(series, modoGeneracion, opciones);

      setProgreso(100);
      setMensaje(`✅ ¡Listo! ${cantidadSeries} series generadas (${cantidadSeries * 6} cartones)`);
      
      setPdfsGenerados(pdfs);
      
      // Recargar generaciones y estadísticas
      await cargarDatos();
      
      setGenerando(false);
      setProgreso(0);

    } catch (error) {
      console.error('Error:', error);
      setMensaje('❌ Error al generar cartones. Intenta de nuevo.');
      setGenerando(false);
      setProgreso(0);
    }
  };

  const descargarPDF = (pdf) => {
    pdf.doc.save(pdf.filename);
  };

  const verPreviewPDF = (pdf) => {
    const pdfBlob = pdf.doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    setPdfPreview({ url: pdfUrl, filename: pdf.filename });
  };

  const cerrarPreview = () => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.url);
      setPdfPreview(null);
    }
  };

  const descargarTodo = () => {
    pdfsGenerados.forEach((pdf, idx) => {
      setTimeout(() => {
        pdf.doc.save(pdf.filename);
      }, idx * 500);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* HEADER CON LOGO */}
        <div className="text-center mb-8 relative">
          {/* Botón de cerrar sesión - Responsive */}
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 px-3 py-2 md:px-4 md:py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>

          {/* Logo icon.png */}
          <div className="flex justify-center mb-4">
            <img 
              src="/icon.png" 
              alt="Logo Bingol" 
              className="w-20 h-20 drop-shadow-lg"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Bingol
          </h1>
          <p className="text-gray-600">Generador de Cartones de Bingo Únicos</p>
          <p className="text-sm text-gray-500 mt-2">@graficoemprendedor</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PANEL IZQUIERDO: Configuración */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Modo de generación */}
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <label className="block text-gray-700 font-semibold mb-3">
                  🎯 Modo de Generación
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setModoGeneracion(MODOS_GENERACION.NORMAL)}
                    className={`py-3 px-4 rounded-lg font-medium transition border-2 text-left ${
                      modoGeneracion === MODOS_GENERACION.NORMAL
                        ? 'bg-yellow-500 text-white border-yellow-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                    disabled={generando}
                  >
                    <div className="font-bold text-sm">📋 Normal</div>
                    <div className="text-xs opacity-90">6 cartones diferentes</div>
                  </button>
                  
                  <button
                    onClick={() => setModoGeneracion(MODOS_GENERACION.RONDAS)}
                    className={`py-3 px-4 rounded-lg font-medium transition border-2 text-left ${
                      modoGeneracion === MODOS_GENERACION.RONDAS
                        ? 'bg-yellow-500 text-white border-yellow-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                    disabled={generando}
                  >
                    <div className="font-bold text-sm">🔄 Rondas</div>
                    <div className="text-xs opacity-90">Copias del mismo cartón</div>
                  </button>
                  
                  <button
                    onClick={() => setModoGeneracion(MODOS_GENERACION.SIN_NUMERACION)}
                    className={`py-3 px-4 rounded-lg font-medium transition border-2 text-left ${
                      modoGeneracion === MODOS_GENERACION.SIN_NUMERACION
                        ? 'bg-yellow-500 text-white border-yellow-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                    disabled={generando}
                  >
                    <div className="font-bold text-sm">👨‍👩‍👧‍👦 Sin Numeración</div>
                    <div className="text-xs opacity-90">6 cartones sin serie</div>
                  </button>
                  
                  <button
                    onClick={() => setModoGeneracion(MODOS_GENERACION.CUATRO_GRANDES)}
                    className={`py-3 px-4 rounded-lg font-medium transition border-2 text-left ${
                      modoGeneracion === MODOS_GENERACION.CUATRO_GRANDES
                        ? 'bg-yellow-500 text-white border-yellow-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                    disabled={generando}
                  >
                    <div className="font-bold text-sm">📐 4 Cartones Grandes</div>
                    <div className="text-xs opacity-90">Sin numeración</div>
                  </button>
                </div>
              </div>

              {/* Serie inicial y cantidad */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Serie Inicial
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={serieInicial}
                    onChange={(e) => setSerieInicial(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    disabled={generando}
                  />
                  <p className="text-xs text-gray-500 mt-1">Empezar desde serie...</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Cantidad de Series
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={cantidadSeries}
                    onChange={(e) => setCantidadSeries(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    disabled={generando}
                  />
                  <p className="text-xs text-gray-500 mt-1">Hasta serie {serieInicial + cantidadSeries - 1}</p>
                </div>
              </div>

              {/* NUEVO: Cliente y Notas */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <label className="block text-gray-700 font-semibold mb-2">
                  👤 Cliente / Pedido (Opcional)
                </label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Nombre del cliente o identificador del pedido"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-3"
                  disabled={generando}
                />
                <textarea
                  value={notasPedido}
                  onChange={(e) => setNotasPedido(e.target.value)}
                  placeholder="Notas adicionales (ej: 'Evento bingo navideño', '100 cartones para sorteo')"
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  disabled={generando}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Te ayuda a identificar cada generación cuando tengas múltiples clientes
                </p>
              </div>

              {/* Marca de agua personalizable */}
              <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <label className="block text-gray-700 font-semibold mb-2">
                  💧 Marca de Agua
                </label>
                <input
                  type="text"
                  value={marcaAgua}
                  onChange={(e) => setMarcaAgua(e.target.value)}
                  placeholder="Deja vacío para sin marca de agua"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  disabled={generando}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {marcaAgua === '' ? '❌ Sin marca de agua' : '✅ Se mostrará en cada cartón'}
                </p>
              </div>

              {/* Copias por cartón (solo para modo rondas) */}
              {modoGeneracion === MODOS_GENERACION.RONDAS && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <label className="block text-gray-700 font-semibold mb-2">
                    🔄 Copias por Cartón (Rondas)
                  </label>
                  <select
                    value={copiasPorCarton}
                    onChange={(e) => setCopiasPorCarton(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    disabled={generando}
                  >
                    <option value={2}>2 copias - 1 hoja (2 cartones)</option>
                    <option value={3}>3 copias - 1 hoja (3 izq + 3 der) - Recomendado</option>
                    <option value={6}>6 copias - 1 hoja (3 izq + 3 der)</option>
                    <option value={12}>12 copias - 2 hojas (6 por hoja)</option>
                    <option value={18}>18 copias - 3 hojas (6 por hoja)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {copiasPorCarton <= 6 
                      ? `1 hoja por cartón (máx 6 copias por hoja)`
                      : `${Math.ceil(copiasPorCarton / 6)} hojas por cartón (6 copias por hoja)`
                    }
                  </p>
                </div>
              )}

              {/* Modo de color */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Modo de Color
                </label>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setModoColor('fijo')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                      modoColor === 'fijo'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={generando}
                  >
                    Color Fijo
                  </button>
                  <button
                    onClick={() => setModoColor('aleatorio')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                      modoColor === 'aleatorio'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={generando}
                  >
                    Aleatorio
                  </button>
                </div>
              </div>

              {/* Selector de color */}
              {modoColor === 'fijo' && (
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-3">
                    Selecciona un Color
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {colores.map((color) => (
                      <button
                        key={color.valor}
                        onClick={() => setColorSeleccionado(color.valor)}
                        className={`py-4 px-6 rounded-lg font-medium transition border-2 ${
                          colorSeleccionado === color.valor
                            ? 'border-gray-800 scale-105 ring-2 ring-gray-400'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ 
                          backgroundColor: color.valor,
                          color: 'white'
                        }}
                        disabled={generando}
                      >
                        {color.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Barra de progreso */}
              {generando && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <p className="text-center text-gray-600 mt-2">{mensaje}</p>
                </div>
              )}

              {/* Mensaje */}
              {mensaje && !generando && (
                <div className={`mb-6 p-4 rounded-lg ${
                  mensaje.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {mensaje}
                </div>
              )}

              {/* Botón generar */}
              <button
                onClick={handleGenerar}
                disabled={generando}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition ${
                  generando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg'
                }`}
              >
                {generando ? 'Generando...' : '🎲 Generar Cartones'}
              </button>
            </div>
          </div>

          {/* PANEL DERECHO: PDFs generados */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📄 PDFs Generados
              </h3>

              {pdfsGenerados.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-4xl mb-2">📭</p>
                  <p>Aún no has generado PDFs</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <button
                      onClick={descargarTodo}
                      className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition"
                    >
                      ⬇️ Descargar Todo ({pdfsGenerados.length} PDFs)
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {pdfsGenerados.map((pdf, idx) => (
                      <div
                        key={idx}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">
                              Series {pdf.series}
                            </p>
                            <p className="text-xs text-gray-500">
                              {pdf.totalCartones} cartones
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => verPreviewPDF(pdf)}
                              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver
                            </button>
                            <button
                              onClick={() => descargarPDF(pdf)}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                            >
                              ⬇️
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {pdf.filename}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info y Estadísticas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info del sistema */}
          <div className="p-6 bg-white rounded-2xl shadow-xl">
            <h3 className="font-semibold text-gray-700 mb-3">📋 Información:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ Cartones únicos garantizados</li>
              <li>✅ Guardados en base de datos</li>
              <li>✅ PDFs divididos automáticamente</li>
              <li>✅ Múltiples modos de generación</li>
              <li>✅ Serie inicial personalizable</li>
              <li>✅ Descarga individual o masiva</li>
            </ul>
          </div>

          {/* Estadísticas */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Estadísticas Totales:</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <span className="text-gray-600">🎫 Total Cartones:</span>
                <span className="font-bold text-blue-600 text-lg">{estadisticas.totalCartones.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <span className="text-gray-600">📦 Generaciones:</span>
                <span className="font-bold text-green-600 text-lg">{estadisticas.totalGeneraciones}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <span className="text-gray-600">🔢 Última Serie:</span>
                <span className="font-bold text-purple-600 text-lg">{estadisticas.ultimaSerie}</span>
              </div>
            </div>
          </div>
        </div>

        {/* VERIFICADOR DE CARTONES */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔍 Verificar Cartón
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Verifica si un cartón existe en la base de datos. Útil para atención al cliente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="number"
              placeholder="Número de Serie"
              value={serieBuscar}
              onChange={(e) => setSerieBuscar(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Número de Cartón"
              value={numeroCartonBuscar}
              onChange={(e) => setNumeroCartonBuscar(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Cliente (opcional)"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={buscarCartonEnBD}
              disabled={buscandoCarton}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                buscandoCarton
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {buscandoCarton ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>

          {/* Resultado de búsqueda */}
          {resultadoBusqueda && (
            <div className={`mt-4 p-4 rounded-lg ${
              resultadoBusqueda.encontrado 
                ? 'bg-green-100 border-2 border-green-300' 
                : 'bg-red-100 border-2 border-red-300'
            }`}>
              {resultadoBusqueda.encontrado ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">✅</span>
                    <h4 className="font-bold text-green-800">Cartón Encontrado</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Serie:</strong> {resultadoBusqueda.carton.serie}</p>
                    <p><strong>Número:</strong> {resultadoBusqueda.carton.numero_carton}</p>
                    <p><strong>Color:</strong> 
                      <span 
                        className="inline-block w-6 h-6 rounded ml-2 border-2 border-white shadow"
                        style={{ backgroundColor: resultadoBusqueda.carton.color }}
                      ></span>
                    </p>
                    <p><strong>Generado:</strong> {resultadoBusqueda.fecha}</p>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded">
                    <p className="font-semibold text-gray-700 mb-2">Números del cartón:</p>
                    <div className="grid grid-cols-9 gap-1 text-xs text-center">
                      {resultadoBusqueda.carton.numeros.map((num, idx) => (
                        <div 
                          key={idx}
                          className={`p-2 rounded ${
                            num === null 
                              ? 'bg-gray-200 text-gray-400' 
                              : 'bg-blue-500 text-white font-bold'
                          }`}
                        >
                          {num || '-'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">❌</span>
                  <p className="font-bold text-red-800">{resultadoBusqueda.mensaje}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AUDITORÍA DE CALIDAD */}
        <div className="mt-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                🛡️ Auditoría de Calidad
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Detecta cartones duplicados, números repetidos y otros errores
              </p>
            </div>
            <button
              onClick={ejecutarAuditoria}
              disabled={auditando}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                auditando
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg'
              }`}
            >
              {auditando ? 'Auditando...' : '🔍 Ejecutar Auditoría'}
            </button>
          </div>

          {/* Resultado de auditoría */}
          {reporteAuditoria && mostrarAuditoria && (
            <div className="mt-4 space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">Total Cartones</div>
                  <div className="text-2xl font-bold text-blue-600">{reporteAuditoria.total}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">✅ Válidos</div>
                  <div className="text-2xl font-bold text-green-600">{reporteAuditoria.validos}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">❌ Con Errores</div>
                  <div className="text-2xl font-bold text-red-600">{reporteAuditoria.errores}</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">🔄 Duplicados</div>
                  <div className="text-2xl font-bold text-orange-600">{reporteAuditoria.duplicados.length}</div>
                </div>
              </div>

              {/* Cartones duplicados */}
              {reporteAuditoria.duplicados.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    Cartones Duplicados Detectados
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {reporteAuditoria.duplicados.map((dup, idx) => (
                      <div key={idx} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                        <strong>Duplicado #{idx + 1}:</strong> Serie {dup.carton1.serie} N°{dup.carton1.numero} 
                        = Serie {dup.carton2.serie} N°{dup.carton2.numero}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cartones con errores */}
              {reporteAuditoria.cartonesConError.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <span>🐛</span>
                    Cartones con Errores de Validación
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {reporteAuditoria.cartonesConError.slice(0, 10).map((carton, idx) => (
                      <div key={idx} className="text-sm p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="font-bold mb-1">
                          Serie {carton.serie} - Cartón N°{carton.numero}
                        </div>
                        <ul className="text-xs space-y-1 ml-4">
                          {carton.errores.map((error, errIdx) => (
                            <li key={errIdx} className="text-red-600">• {error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {reporteAuditoria.cartonesConError.length > 10 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... y {reporteAuditoria.cartonesConError.length - 10} cartones más con errores
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Todo OK */}
              {reporteAuditoria.errores === 0 && reporteAuditoria.duplicados.length === 0 && (
                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-6 text-center">
                  <span className="text-6xl mb-4 block">✅</span>
                  <h4 className="text-2xl font-bold text-green-800 mb-2">
                    ¡Todo Perfecto!
                  </h4>
                  <p className="text-green-700">
                    No se detectaron errores ni duplicados en {reporteAuditoria.total} cartones
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HISTORIAL DE GENERACIONES (desde BD) */}
        {generaciones.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                📜 Últimas Generaciones
                <span className="text-sm font-normal text-gray-500">({generaciones.length})</span>
              </h3>
              <button
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition text-sm"
              >
                {mostrarHistorial ? '▲ Ocultar' : '▼ Ver Todo'}
              </button>
            </div>

            <div className={`space-y-4 ${mostrarHistorial ? 'max-h-[800px]' : 'max-h-[400px]'} overflow-y-auto`}>
              {generaciones.map((gen, idx) => {
                const fecha = new Date(gen.fecha_generacion);
                const fechaFormato = fecha.toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const horaFormato = fecha.toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Traducir modo de generación
                const modoTexto = {
                  'normal': '📋 Normal (6 cartones)',
                  'rondas': '🔄 Rondas',
                  'sin_num': '👨‍👩‍👧‍👦 Sin Numeración',
                  'cuatro': '📐 4 Cartones Grandes'
                }[gen.modo_generacion] || gen.modo_color;

                return (
                  <div
                    key={gen.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition bg-gray-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🎲</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800">
                                {gen.cliente || `Generación #${gen.id.substring(0, 8)}`}
                              </h4>
                              {gen.pedido_id && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-mono">
                                  {gen.pedido_id}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {fechaFormato} • {horaFormato}
                            </p>
                            {gen.notas && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                📝 {gen.notas}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">📊 Series:</span>
                            <span>{gen.cantidad_series}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">🎫 Cartones:</span>
                            <span>{gen.total_cartones}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">🎨 Color:</span>
                            {gen.color_usado ? (
                              <span 
                                className="w-4 h-4 rounded-full border-2 border-white shadow"
                                style={{ backgroundColor: gen.color_usado }}
                              ></span>
                            ) : (
                              <span>{gen.modo_color}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">📄 Modo:</span>
                            <span className="text-xs">{modoTexto}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FOOTER PROFESIONAL */}
        <footer className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Columna 1: Sobre nosotros */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/icon.png" 
                  alt="Logo" 
                  className="w-12 h-12"
                />
                <h3 className="text-xl font-bold">Bingol</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Generador profesional de cartones de bingo únicos. Sistema garantizado sin repeticiones.
              </p>
            </div>

            {/* Columna 2: Contacto */}
            <div>
              <h4 className="text-lg font-bold mb-4">📞 Contacto</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">📧</span>
                  <a 
                    href="mailto:graficoemprendedorr@gmail.com" 
                    className="hover:text-blue-400 transition"
                  >
                    graficoemprendedorr@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">📱</span>
                  <a 
                    href="https://wa.me/5493777739000" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-green-400 transition"
                  >
                    +54 9 3777 73-9000
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Redes Sociales */}
            <div>
              <h4 className="text-lg font-bold mb-4">🌐 Redes Sociales</h4>
              <div className="space-y-3">
                <a 
                  href="https://instagram.com/graficoemprendeorweb" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-pink-400 transition group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold">@graficoemprendeorweb</div>
                    <div className="text-xs text-gray-400">Síguenos en Instagram</div>
                  </div>
                </a>

                <a 
                  href="https://instagram.com/graficoemprendedor" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-pink-400 transition group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold">@graficoemprendedor</div>
                    <div className="text-xs text-gray-400">Nuestra cuenta principal</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Bingol - Generador de Cartones de Bingo. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Desarrollado por <span className="text-blue-400">@graficoemprendedor</span>
            </p>
          </div>
        </footer>

        {/* MODAL DE PREVIEW PDF */}
        {pdfPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-gray-800">{pdfPreview.filename}</h3>
                <div className="flex gap-2">
                  <a
                    href={pdfPreview.url}
                    download={pdfPreview.filename}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
                  >
                    ⬇️ Descargar
                  </a>
                  <button
                    onClick={cerrarPreview}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
                  >
                    ✖ Cerrar
                  </button>
                </div>
              </div>
              
              {/* Iframe con el PDF */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={pdfPreview.url}
                  className="w-full h-full"
                  title="Preview PDF"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}