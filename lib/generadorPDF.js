import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CONFIG_CARTON, CONFIG_CARTON_GRANDE, MODOS_GENERACION } from './configCartones';

// Función base para dibujar un cartón
function dibujarCarton(doc, carton, x, y, mostrarHeader = true, config = CONFIG_CARTON, marcaAgua = '@graficoemprendedor') {
  const cfg = config;
  const cartonWidth = cfg.ancho;
  const cartonHeight = cfg.alto - 3;
  const bordeTop = cfg.bordeGruesoAlto;
  const bordeBottom = cfg.bordeGruesoAlto;
  const bordeLateral = cfg.bordeGruesoAncho;
  
  const hex = carton.color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 1. FONDO BLANCO
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, cartonWidth, cartonHeight, 'F');
  
  // 2. TEXTO EN BORDE SUPERIOR (solo si mostrarHeader)
  if (mostrarHeader) {
    doc.setFontSize(cfg.fuenteTitulo);
    doc.setTextColor(r, g, b);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `SERIE ${carton.serie}     CARTÓN N° ${String(carton.numero_carton).padStart(3, '0')}`,
      x + cartonWidth / 2,
      y + bordeTop / 2 + 1.8 - cfg.ajusteTextoTitulo,
      { align: 'center' }
    );
  }
  
  // 3. MARCA DE AGUA EN BORDE INFERIOR (solo si marcaAgua no está vacía)
  if (marcaAgua && marcaAgua.trim() !== '') {
    doc.setFontSize(cfg.fuenteMarca + 1);
    doc.setTextColor(r, g, b);
    doc.setFont('helvetica', 'bold');
    doc.text(
      marcaAgua,
      x + cartonWidth / 2,
      y + cartonHeight - bordeBottom / 2 + 2 - cfg.ajusteTextoMarca,
      { align: 'center' }
    );
  }
  
  // 4. ÁREA DE NÚMEROS CON CELDAS COLOREADAS
  const gridX = x + bordeLateral;
  const gridY = y + bordeTop;
  const gridWidth = cartonWidth - 2 * bordeLateral;
  const gridHeight = cartonHeight - bordeTop - bordeBottom;
  
  const cellWidth = (gridWidth / cfg.columnas) * cfg.ajusteCeldaAncho;
  const cellHeight = (gridHeight / cfg.filas) * cfg.ajusteCeldaAlto;
  
  const numeros = carton.numeros;
  
  // Dibujar fondos de celdas vacías
  for (let row = 0; row < cfg.filas; row++) {
    for (let col = 0; col < cfg.columnas; col++) {
      const cellX = gridX + col * cellWidth;
      const cellY = gridY + row * cellHeight;
      const numero = numeros[row * cfg.columnas + col];
      
      if (numero === null) {
        const rSuave = 255 - (255 - r) * cfg.opacidadCeldaVacia;
        const gSuave = 255 - (255 - g) * cfg.opacidadCeldaVacia;
        const bSuave = 255 - (255 - b) * cfg.opacidadCeldaVacia;
        
        doc.setFillColor(rSuave, gSuave, bSuave);
        doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
      }
    }
  }
  
  // 5. BORDES INTERNOS
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(cfg.bordeInternoGrosor);
  
  for (let row = 1; row < cfg.filas; row++) {
    const lineY = gridY + row * cellHeight;
    doc.line(gridX, lineY, gridX + gridWidth, lineY);
  }
  
  for (let col = 1; col < cfg.columnas; col++) {
    const lineX = gridX + col * cellWidth;
    doc.line(lineX, gridY, lineX, gridY + gridHeight);
  }
  
  // 6. NÚMEROS
  for (let row = 0; row < cfg.filas; row++) {
    for (let col = 0; col < cfg.columnas; col++) {
      const cellX = gridX + col * cellWidth;
      const cellY = gridY + row * cellHeight;
      const numero = numeros[row * cfg.columnas + col];
      
      if (numero !== null) {
        doc.setFontSize(cfg.fuenteNumero);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(r, g, b);
        
        const textY = cellY + cellHeight / 2 + cfg.fuenteNumero * 0.13;
        const textX = cellX + cellWidth / 2;
        
        // Número simple pero BOLD
        doc.text(String(numero), textX, textY, { align: 'center' });
      }
    }
  }
  
  // 7. BORDE EXTERIOR
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(cfg.bordeExteriorGrosor);
  doc.rect(x, y, cartonWidth, cartonHeight, 'S');
  
  // 8. MARCO INTERIOR
  doc.setLineWidth(cfg.bordeMarcoGrosor);
  doc.line(x + bordeLateral, y + bordeTop, x + cartonWidth - bordeLateral, y + bordeTop);
  doc.line(x + bordeLateral, y + cartonHeight - bordeBottom, x + cartonWidth - bordeLateral, y + cartonHeight - bordeBottom);
  doc.line(x + bordeLateral, y + bordeTop, x + bordeLateral, y + cartonHeight - bordeBottom);
  doc.line(x + cartonWidth - bordeLateral, y + bordeTop, x + cartonWidth - bordeLateral, y + cartonHeight - bordeBottom);
}

// MODO NORMAL: 6 cartones diferentes
function generarPDFModoNormal(series, marcaAgua = '@graficoemprendedor') {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const cfg = CONFIG_CARTON;
  
  series.forEach((serie, serieIdx) => {
    if (serieIdx > 0) doc.addPage();
    
    doc.setFontSize(cfg.fuentePaginaTitulo);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Serie ${serie.numeroSerie}`, pageWidth / 2, 10, { align: 'center' });
    
    const cartonHeight = cfg.alto - 3;
    const anchoTotal = 2 * cfg.ancho + cfg.espaciadoHorizontal;
    const inicioX = (pageWidth - anchoTotal) / 2;
    const inicioY = cfg.margenY;
    
    serie.cartones.forEach((carton, idx) => {
      const fila = Math.floor(idx / 2);
      const columna = idx % 2;
      const x = inicioX + columna * (cfg.ancho + cfg.espaciadoHorizontal);
      const y = inicioY + fila * (cartonHeight + cfg.espaciadoVertical);
      dibujarCarton(doc, carton, x, y, true, cfg, marcaAgua);
    });
  });
  
  return doc;
}

// MODO RONDAS: N copias de cada cartón (usa los 6 cartones - 3 páginas)
function generarPDFModoRondas(series, copiasPorCarton = 3, marcaAgua = '@graficoemprendedor') {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const cfg = CONFIG_CARTON;
  
  series.forEach((serie, serieIdx) => {
    // Para cada serie, generamos 3 páginas (una por cada par de cartones)
    for (let parIdx = 0; parIdx < 3; parIdx++) {
      if (serieIdx > 0 || parIdx > 0) doc.addPage();
      
      doc.setFontSize(cfg.fuentePaginaTitulo);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Serie ${serie.numeroSerie} - Modo Rondas (${copiasPorCarton} copias)`, pageWidth / 2, 10, { align: 'center' });
      
      const cartonHeight = cfg.alto - 3;
      const inicioX = (pageWidth - (2 * cfg.ancho + cfg.espaciadoHorizontal)) / 2;
      const inicioY = cfg.margenY;
      
      const cartonIzq = serie.cartones[parIdx * 2];     // Cartones 0, 2, 4
      const cartonDer = serie.cartones[parIdx * 2 + 1]; // Cartones 1, 3, 5
      
      // Columna izquierda: copias del cartón actual
      for (let i = 0; i < copiasPorCarton; i++) {
        const x = inicioX;
        const y = inicioY + i * (cartonHeight + cfg.espaciadoVertical);
        if (cartonIzq) {
          dibujarCarton(doc, cartonIzq, x, y, true, cfg, marcaAgua);
        }
      }
      
      // Columna derecha: copias del siguiente cartón
      for (let i = 0; i < copiasPorCarton; i++) {
        const x = inicioX + cfg.ancho + cfg.espaciadoHorizontal;
        const y = inicioY + i * (cartonHeight + cfg.espaciadoVertical);
        if (cartonDer) {
          dibujarCarton(doc, cartonDer, x, y, true, cfg, marcaAgua);
        }
      }
    }
  });
  
  return doc;
}

// MODO SIN NUMERACIÓN: 6 cartones sin serie/número
function generarPDFSinNumeracion(series, marcaAgua = '@graficoemprendedor') {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const cfg = CONFIG_CARTON;
  
  series.forEach((serie, serieIdx) => {
    if (serieIdx > 0) doc.addPage();
    
    doc.setFontSize(cfg.fuentePaginaTitulo);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cartones de Bingo`, pageWidth / 2, 10, { align: 'center' });
    
    const cartonHeight = cfg.alto - 3;
    const anchoTotal = 2 * cfg.ancho + cfg.espaciadoHorizontal;
    const inicioX = (pageWidth - anchoTotal) / 2;
    const inicioY = cfg.margenY;
    
    serie.cartones.forEach((carton, idx) => {
      const fila = Math.floor(idx / 2);
      const columna = idx % 2;
      const x = inicioX + columna * (cfg.ancho + cfg.espaciadoHorizontal);
      const y = inicioY + fila * (cartonHeight + cfg.espaciadoVertical);
      dibujarCarton(doc, carton, x, y, false, cfg, marcaAgua);
    });
  });
  
  return doc;
}

// MODO 4 CARTONES GRANDES
function generarPDFCuatroGrandes(series, marcaAgua = '@graficoemprendedor') {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const cfg = CONFIG_CARTON_GRANDE;
  
  series.forEach((serie, serieIdx) => {
    if (serieIdx > 0) doc.addPage();
    
    doc.setFontSize(cfg.fuentePaginaTitulo);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Serie ${serie.numeroSerie}`, pageWidth / 2, 10, { align: 'center' });
    
    const cartonHeight = cfg.alto - 3;
    const anchoTotal = 2 * cfg.ancho + cfg.espaciadoHorizontal;
    const inicioX = (pageWidth - anchoTotal) / 2;
    const inicioY = cfg.margenY;
    
    // Solo usar los primeros 4 cartones
    for (let idx = 0; idx < 4 && idx < serie.cartones.length; idx++) {
      const fila = Math.floor(idx / 2);
      const columna = idx % 2;
      const x = inicioX + columna * (cfg.ancho + cfg.espaciadoHorizontal);
      const y = inicioY + fila * (cartonHeight + cfg.espaciadoVertical);
      dibujarCarton(doc, serie.cartones[idx], x, y, false, cfg, marcaAgua);
    }
  });
  
  return doc;
}

// Función principal
export function generarPDFSerie(series, modo = MODOS_GENERACION.NORMAL, opciones = {}) {
  const marcaAgua = opciones.marcaAgua !== undefined ? opciones.marcaAgua : '@graficoemprendedor';
  const copiasPorCarton = opciones.copiasPorCarton || 3;
  
  switch (modo) {
    case MODOS_GENERACION.RONDAS:
      return generarPDFModoRondas(series, copiasPorCarton, marcaAgua);
    case MODOS_GENERACION.SIN_NUMERACION:
      return generarPDFSinNumeracion(series, marcaAgua);
    case MODOS_GENERACION.CUATRO_GRANDES:
      return generarPDFCuatroGrandes(series, marcaAgua);
    case MODOS_GENERACION.NORMAL:
    default:
      return generarPDFModoNormal(series, marcaAgua);
  }
}

export function dividirEnChunks(series, cartonesPerPDF = 300) {
  const seriesPorPDF = Math.ceil(cartonesPerPDF / 6);
  const chunks = [];
  
  for (let i = 0; i < series.length; i += seriesPorPDF) {
    chunks.push(series.slice(i, i + seriesPorPDF));
  }
  
  return chunks;
}

// Generar múltiples PDFs con opciones
export function generarMultiplesPDFs(series, modo = MODOS_GENERACION.NORMAL, opciones = {}) {
  const chunks = dividirEnChunks(series, 300);
  const pdfs = [];
  
  chunks.forEach((chunk, idx) => {
    const doc = generarPDFSerie(chunk, modo, opciones);
    const primeraSerieNum = chunk[0].numeroSerie;
    const ultimaSerieNum = chunk[chunk.length - 1].numeroSerie;
    
    let sufijo = '';
    if (modo === MODOS_GENERACION.RONDAS) sufijo = '_RONDAS';
    if (modo === MODOS_GENERACION.SIN_NUMERACION) sufijo = '_SIN_NUM';
    if (modo === MODOS_GENERACION.CUATRO_GRANDES) sufijo = '_4GRANDES';
    
    const filename = `Cartones_Serie_${String(primeraSerieNum).padStart(3, '0')}-${String(ultimaSerieNum).padStart(3, '0')}${sufijo}.pdf`;
    
    pdfs.push({
      doc,
      filename,
      series: `${primeraSerieNum}-${ultimaSerieNum}`,
      totalCartones: chunk.reduce((sum, s) => sum + s.cartones.length, 0)
    });
  });
  
  return pdfs;
}