// lib/configCartones.js
// Configuración EXACTA estilo Canva - Bordes sin relleno
// Todas las medidas en milímetros (mm)

export const CONFIG_CARTON = {
  // Tamaño del cartón
  ancho: 120,
  alto: 58,
  
  // Bordes gruesos en los 4 lados (SIN RELLENO)
  bordeGruesoAlto: 5.5,  // Altura del borde superior e inferior
  bordeGruesoAncho: 3,   // Ancho de los bordes laterales
  
  // Grid estándar de bingo
  filas: 3,
  columnas: 9,
  
  // Grosor de líneas
  bordeExteriorGrosor: 0.5,   // Borde exterior fino
  bordeMarcoGrosor: 0.5,      // Marco interior fino
  bordeInternoGrosor: 0.3,    // Líneas internas entre celdas
  
  // Color de celdas vacías (opacidad más fuerte)
  opacidadCeldaVacia: 0.15,  // 15% de opacidad
  
  // AJUSTE DE CELDAS
  ajusteCeldaAlto: 1.0,
  ajusteCeldaAncho: 1.0,
  
  // Espaciado entre cartones
  espaciadoHorizontal: 7,
  espaciadoVertical: 7,
  
  // Márgenes de página A4 landscape (297x210mm)
  margenX: 10,
  margenY: 14,
  
  // Tipografía
  fuenteTitulo: 8.5,
  fuenteNumero: 22.5,
  fuenteMarca: 8.5,
  fuentePaginaTitulo: 12,
  
  // Ajuste vertical del texto (subir texto)
  ajusteTextoTitulo: 0.9,    // mm hacia arriba
  ajusteTextoMarca: 1,   // mm hacia arriba
};

// Configuración para modo 4 CARTONES (más grandes)
export const CONFIG_CARTON_GRANDE = {
  ancho: 139,  // 1mm menos (era 140)
  alto: 69,    // 1mm más (era 68)
  bordeGruesoAlto: 6.5,
  bordeGruesoAncho: 3.5,
  filas: 3,
  columnas: 9,
  bordeExteriorGrosor: 0.5,
  bordeMarcoGrosor: 0.5,
  bordeInternoGrosor: 0.3,
  opacidadCeldaVacia: 0.15,
  ajusteCeldaAlto: 1.0,
  ajusteCeldaAncho: 1.0,
  espaciadoHorizontal: 10,
  espaciadoVertical: 10,
  margenX: 8,
  margenY: 18,  // Más centrado hacia abajo (era 15)
  fuenteTitulo: 9.5,
  fuenteNumero: 25,
  fuenteMarca: 9,
  fuentePaginaTitulo: 14,
  ajusteTextoTitulo: 1,
  ajusteTextoMarca: 1,
};

// MODOS DE GENERACIÓN
export const MODOS_GENERACION = {
  NORMAL: 'normal',              // 6 cartones diferentes
  RONDAS: 'rondas',              // 3 copias cartón 1 + 3 copias cartón 2
  SIN_NUMERACION: 'sin_num',     // Sin serie/número, 6 cartones
  CUATRO_GRANDES: 'cuatro',      // 4 cartones más grandes
};