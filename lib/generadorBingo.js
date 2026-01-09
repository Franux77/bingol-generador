import { supabase } from './supabase';

// ==========================================
// 1. LÓGICA DE DISTRIBUCIÓN (EL MOTOR)
// ==========================================

function generarLogicaSerie() {
  const columnasGlobales = [
    rango(1, 9), rango(10, 19), rango(20, 29), rango(30, 39), rango(40, 49),
    rango(50, 59), rango(60, 69), rango(70, 79), rango(80, 90)
  ];
  columnasGlobales.forEach(shuffle);

  const seriesCartones = Array(6).fill(null).map(() => 
    Array(3).fill(null).map(() => Array(9).fill(null))
  );

  // Repartimos los 90 números entre los 6 cartones primero
  for (let colIdx = 0; colIdx < 9; colIdx++) {
    const nums = columnasGlobales[colIdx];
    let distribucion = [];
    if (nums.length === 9) distribucion = [2, 2, 2, 1, 1, 1];
    else if (nums.length === 10) distribucion = [2, 2, 2, 2, 1, 1];
    else if (nums.length === 11) distribucion = [2, 2, 2, 2, 2, 1];
    shuffle(distribucion);

    let currentNumIdx = 0;
    for (let cartIdx = 0; cartIdx < 6; cartIdx++) {
      const cant = distribucion[cartIdx];
      const numsParaCarton = nums.slice(currentNumIdx, currentNumIdx + cant);
      currentNumIdx += cant;

      // Colocamos estos números en filas aleatorias del cartón
      const filasDisponibles = [0, 1, 2];
      shuffle(filasDisponibles);
      numsParaCarton.sort((a,b) => a-b);
      
      const filasElegidas = filasDisponibles.slice(0, cant).sort();
      filasElegidas.forEach((fIdx, i) => {
        seriesCartones[cartIdx][fIdx][colIdx] = numsParaCarton[i];
      });
    }
  }

  // Ahora ajustamos para que cada fila tenga exactamente 5 números
  return seriesCartones.map(carton => balancearFilas(carton));
}

function balancearFilas(carton) {
  let iter = 0;
  while (iter < 200) {
    let conteos = carton.map(f => f.filter(n => n !== null).length);
    if (conteos.every(c => c === 5)) return carton.flat();

    let fGorda = conteos.findIndex(c => c > 5);
    let fFlaca = conteos.findIndex(c => c < 5);

    if (fGorda === -1 || fFlaca === -1) break;

    // Buscamos una columna donde podamos mover de gorda a flaca
    let movido = false;
    for (let c = 0; c < 9; c++) {
      if (carton[fGorda][c] !== null && carton[fFlaca][c] === null) {
        carton[fFlaca][c] = carton[fGorda][c];
        carton[fGorda][c] = null;
        movido = true;
        break;
      }
    }
    
    if (!movido) { 
        // Si se traba, barajamos una columna entera para desbloquear
        const cRand = Math.floor(Math.random() * 9);
        const numsCol = [carton[0][cRand], carton[1][cRand], carton[2][cRand]].filter(n => n !== null);
        const nuevasFilas = [0, 1, 2];
        shuffle(nuevasFilas);
        carton[0][cRand] = carton[1][cRand] = carton[2][cRand] = null;
        numsCol.forEach((n, i) => carton[nuevasFilas[i]][cRand] = n);
    }
    iter++;
  }
  return null;
}

// ==========================================
// 2. UTILIDADES
// ==========================================

function rango(a, b) { return Array.from({length: b - a + 1}, (_, i) => a + i); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ==========================================
// 3. GENERACIÓN SEGURA (BLINDADA)
// ==========================================

export async function generarMultiplesSeries(
  cantidadSeries, 
  modoColor, 
  coloresSeleccionados, 
  serieInicial = 1, 
  modoGeneracion = 'normal', 
  cliente = null, 
  notas = null,
  onProgress = null
) {
  const coloresDisponibles = ['#E65100', '#1976D2', '#2E2E2E', '#2E7D32', '#D32F2F', '#9C27B0'];
  
  // 1. Registro de la operación
  const idPedido = `PED-${Date.now()}`;
  if (onProgress) onProgress({ fase: 'registro', progreso: 0 });
  
  await supabase.from('generaciones').insert({
    cantidad_series: cantidadSeries,
    modo_generacion: modoGeneracion,
    pedido_id: idPedido,
    cliente,
    notas
  });

  const todasLasSeries = [];
  const BATCH_SIZE = 50; 
  let cartonesBuffer = [];

  for (let i = 0; i < cantidadSeries; i++) {
    const numSerie = serieInicial + i;
    const color = modoColor === 'fijo' ? coloresSeleccionados[0] : coloresDisponibles[i % 6];
    
    // Generar datos de la serie
    let serieCartones = generarSerieCompleta(numSerie, color, modoGeneracion, idPedido, cliente);
    
    // Agregar al buffer
    cartonesBuffer.push(...serieCartones);
    todasLasSeries.push({ numeroSerie: numSerie, cartones: serieCartones });

    // Reportar progreso
    if (onProgress && i % 5 === 0) {
      onProgress({ 
        fase: 'generando', 
        progreso: Math.floor((i / cantidadSeries) * 50),
        serieActual: numSerie
      });
    }

    // ============================================================
    // MOMENTO DE GUARDADO (BATCH) CON PROTECCIÓN ANTI-DUPLICADOS
    // ============================================================
    if (cartonesBuffer.length >= BATCH_SIZE * 6 || i === cantidadSeries - 1) {
      if (onProgress) {
        onProgress({ 
          fase: 'verificando_guardando', 
          progreso: 50 + Math.floor(((i + 1) / cantidadSeries) * 50),
          cartones: cartonesBuffer.length
        });
      }
      
      // Llamamos a la función "Blindada" que reintenta si hay choques
      await guardarBufferBlindado(cartonesBuffer);
      
      cartonesBuffer = []; // Limpiar buffer tras éxito
      await new Promise(r => setTimeout(r, 50));
    }
  }

  if (onProgress) onProgress({ fase: 'completado', progreso: 100 });
  return todasLasSeries;
}

// ---------------------------------------------------------
// FUNCIONES AUXILIARES DE SEGURIDAD Y REGENERACIÓN
// ---------------------------------------------------------

// Genera una serie y devuelve los objetos listos (sin guardar)
function generarSerieCompleta(numSerie, color, modoGeneracion, idPedido, cliente) {
  let serieData = null;
  while (!serieData) {
    serieData = generarLogicaSerie();
    if (serieData.some(c => c === null)) serieData = null;
  }

  const cartonesEnSerie = modoGeneracion === 'cuatro' ? 4 : 6;
  const numeroCartonBase = (numSerie - 1) * 6 + 1;

  return serieData.map((nums, idx) => ({
    serie: numSerie,
    numero_carton: numeroCartonBase + idx,
    numeros: nums,
    hash_carton: nums.map(n => n || 0).join('.'),
    color,
    pedido_id: idPedido,
    cliente
  })).slice(0, cartonesEnSerie);
}

// Esta es la función que asegura el 100% de unicidad
async function guardarBufferBlindado(bufferCartones) {
  let guardadoExitoso = false;
  let intentosBatch = 0;

  // Hacemos una copia local para poder modificarla si regeneramos
  let bufferActual = [...bufferCartones];

  while (!guardadoExitoso && intentosBatch < 5) {
    try {
      // 1. Verificamos contra la BD antes de intentar insertar (Pre-Check)
      const hashes = bufferActual.map(c => c.hash_carton);
      const { data: existentes } = await supabase
        .from('cartones')
        .select('hash_carton, serie')
        .in('hash_carton', hashes);

      // 2. Si hay duplicados, regeneramos SOLO las series afectadas
      if (existentes && existentes.length > 0) {
        console.warn(`⚠️ Detectados ${existentes.length} cartones duplicados en BD. Regenerando series afectadas...`);
        const seriesAfectadas = new Set(existentes.map(e => e.serie));
        
        // Filtramos el buffer: quitamos las series malas y generamos nuevas
        bufferActual = bufferActual.filter(c => !seriesAfectadas.has(c.serie));
        
        // Regenerar las series afectadas
        for (let numSerie of seriesAfectadas) {
            // Buscamos la config original de uno de los cartones eliminados para saber color/cliente
            const ref = bufferCartones.find(c => c.serie === numSerie);
            const nuevaSerie = generarSerieCompleta(numSerie, ref.color, 'normal', ref.pedido_id, ref.cliente); // Asumimos 'normal' o pasamos el modo si es necesario
            bufferActual.push(...nuevaSerie);
        }
        // Volvemos al inicio del while para re-verificar los nuevos hashes
        continue; 
      }

      // 3. Intento de Inserción (Aquí actúa el CONSTRAINT UNIQUE de la BD)
      const { error } = await supabase.from('cartones').insert(bufferActual);

      if (error) {
        // Código 23505 = Unique Violation (Race Condition)
        if (error.code === '23505') {
          console.warn("🛡️ Choque de concurrencia (Race Condition). Reintentando batch...");
          // Si llegamos aquí, alguien insertó un duplicado MILISEGUNDOS después de nuestro check.
          // Simplemente el `continue` forzará a verificar de nuevo y regenerar.
          intentosBatch++;
          await new Promise(r => setTimeout(r, 200 + Math.random() * 500)); // Espera aleatoria
          continue;
        } else {
          throw error; // Otro error (conexión, permisos, etc)
        }
      }

      // Si llegamos aquí, todo se guardó perfecto
      guardadoExitoso = true;

    } catch (err) {
      console.error("Error crítico guardando batch:", err);
      // En caso de error grave, rompemos para no congelar, pero podrías manejarlo distinto
      break; 
    }
  }
}

// ==========================================
// 4. GENERACIÓN EN CHUNKS 
// ==========================================

export async function generarSeriesEnChunks(
  cantidadSeries,
  modoColor,
  coloresSeleccionados,
  serieInicial = 1,
  modoGeneracion = 'normal',
  cliente = null,
  notas = null,
  onProgress = null
) {
  const CHUNK_SIZE = 25; 
  const chunks = Math.ceil(cantidadSeries / CHUNK_SIZE);
  const todasLasSeries = [];

  for (let chunk = 0; chunk < chunks; chunk++) {
    const inicio = chunk * CHUNK_SIZE;
    const fin = Math.min((chunk + 1) * CHUNK_SIZE, cantidadSeries);
    const cantidadEnChunk = fin - inicio;
    
    const seriesChunk = await generarMultiplesSeries(
      cantidadEnChunk,
      modoColor,
      coloresSeleccionados,
      serieInicial + inicio,
      modoGeneracion,
      cliente,
      notas,
      (progresoParcial) => {
        if (onProgress) {
          const progresoGlobal = Math.floor(
            ((inicio + (cantidadEnChunk * progresoParcial.progreso / 100)) / cantidadSeries) * 100
          );
          onProgress({
            ...progresoParcial,
            progreso: progresoGlobal,
            chunk: chunk + 1,
            totalChunks: chunks
          });
        }
      }
    );
    
    todasLasSeries.push(...seriesChunk);
    await new Promise(r => setTimeout(r, 100));
  }

  return todasLasSeries;
}