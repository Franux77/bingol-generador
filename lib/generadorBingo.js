import { supabase } from './supabase';

// Generar hash único para cada cartón
function generarHashCarton(numeros) {
  return numeros.join('-');
}

// Generar un cartón de bingo válido - ALGORITMO MEJORADO
function generarCartonBingo() {
  const carton = Array(3).fill(null).map(() => Array(9).fill(null));
  
  // Por cada columna, definir el rango de números
  const rangos = [
    [1, 9],    // Columna 0: 1-9
    [10, 19],  // Columna 1: 10-19
    [20, 29],  // Columna 2: 20-29
    [30, 39],  // Columna 3: 30-39
    [40, 49],  // Columna 4: 40-49
    [50, 59],  // Columna 5: 50-59
    [60, 69],  // Columna 6: 60-69
    [70, 79],  // Columna 7: 70-79
    [80, 90],  // Columna 8: 80-90
  ];

  // 1. PRIMERO: Generar números para cada columna
  const numerosPorColumna = [];
  for (let col = 0; col < 9; col++) {
    const [min, max] = rangos[col];
    const numeros = [];
    
    while (numeros.length < 3) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!numeros.includes(num)) {
        numeros.push(num);
      }
    }
    
    numeros.sort((a, b) => a - b);
    numerosPorColumna.push(numeros);
    
    // Colocar los 3 números en la columna
    for (let row = 0; row < 3; row++) {
      carton[row][col] = numeros[row];
    }
  }

  // 2. AHORA: Vaciar celdas estratégicamente
  // Necesitamos 27 celdas total, y solo 15 con números (5 por fila)
  // Debemos vaciar 12 celdas, pero GARANTIZANDO al menos 1 número por columna
  
  // Contar cuántos números podemos quitar por columna (máximo 2)
  const numerosAEliminarPorColumna = Array(9).fill(0);
  
  // Distribuir las 12 eliminaciones entre columnas (max 2 por columna)
  let eliminacionesRestantes = 12;
  while (eliminacionesRestantes > 0) {
    for (let col = 0; col < 9 && eliminacionesRestantes > 0; col++) {
      if (numerosAEliminarPorColumna[col] < 2) {
        numerosAEliminarPorColumna[col]++;
        eliminacionesRestantes--;
      }
    }
  }
  
  // 3. ELIMINAR números según el plan
  for (let col = 0; col < 9; col++) {
    const cantidadAEliminar = numerosAEliminarPorColumna[col];
    
    if (cantidadAEliminar > 0) {
      // Obtener filas disponibles para eliminar en esta columna
      const filasDisponibles = [0, 1, 2];
      
      // Mezclar aleatoriamente
      filasDisponibles.sort(() => Math.random() - 0.5);
      
      // Eliminar las primeras N filas
      for (let i = 0; i < cantidadAEliminar; i++) {
        carton[filasDisponibles[i]][col] = null;
      }
    }
  }

  // 4. AJUSTAR para que cada fila tenga exactamente 5 números
  for (let row = 0; row < 3; row++) {
    let numerosEnFila = carton[row].filter(n => n !== null).length;
    
    // Si tiene más de 5, quitar algunos
    while (numerosEnFila > 5) {
      // Buscar columnas con más de 1 número
      const columnasConMasDeUno = [];
      for (let col = 0; col < 9; col++) {
        if (carton[row][col] !== null) {
          // Contar cuántos números tiene esta columna en total
          let numerosEnColumna = 0;
          for (let r = 0; r < 3; r++) {
            if (carton[r][col] !== null) numerosEnColumna++;
          }
          if (numerosEnColumna > 1) {
            columnasConMasDeUno.push(col);
          }
        }
      }
      
      if (columnasConMasDeUno.length > 0) {
        const col = columnasConMasDeUno[Math.floor(Math.random() * columnasConMasDeUno.length)];
        carton[row][col] = null;
        numerosEnFila--;
      } else {
        break;
      }
    }
    
    // Si tiene menos de 5, agregar algunos
    while (numerosEnFila < 5) {
      // Buscar columnas vacías en esta fila que tengan números disponibles
      const columnasVacias = [];
      for (let col = 0; col < 9; col++) {
        if (carton[row][col] === null) {
          columnasVacias.push(col);
        }
      }
      
      if (columnasVacias.length > 0) {
        const col = columnasVacias[Math.floor(Math.random() * columnasVacias.length)];
        const [min, max] = rangos[col];
        
        // Generar un número que no esté ya en el cartón
        let num;
        let intentos = 0;
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min;
          intentos++;
        } while (carton.flat().includes(num) && intentos < 100);
        
        if (intentos < 100) {
          carton[row][col] = num;
          numerosEnFila++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  // 5. VERIFICACIÓN FINAL: Asegurar que cada columna tenga al menos 1 número
  for (let col = 0; col < 9; col++) {
    let tieneNumero = false;
    for (let row = 0; row < 3; row++) {
      if (carton[row][col] !== null) {
        tieneNumero = true;
        break;
      }
    }
    
    // Si la columna está vacía, agregar un número en una fila que tenga espacio
    if (!tieneNumero) {
      for (let row = 0; row < 3; row++) {
        let numerosEnFila = carton[row].filter(n => n !== null).length;
        if (numerosEnFila < 5) {
          const [min, max] = rangos[col];
          let num;
          let intentos = 0;
          do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
            intentos++;
          } while (carton.flat().includes(num) && intentos < 100);
          
          if (intentos < 100) {
            carton[row][col] = num;
            break;
          }
        }
      }
    }
  }

  return carton.flat();
}

// Verificar si un cartón ya existe en la BD
async function cartonExiste(hash) {
  try {
    const { data, error } = await supabase
      .from('cartones')
      .select('hash_carton')
      .eq('hash_carton', hash)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error verificando cartón:', error);
      return false;
    }
    
    return data !== null;
  } catch (error) {
    console.error('Error en cartonExiste:', error);
    return false;
  }
}

// Generar una serie completa (6 cartones únicos)
export async function generarSerie(numeroSerie, color) {
  const cartones = [];
  let intentos = 0;
  const maxIntentos = 1000;

  while (cartones.length < 6 && intentos < maxIntentos) {
    intentos++;
    const numeros = generarCartonBingo();
    const hash = generarHashCarton(numeros);
    
    const existe = await cartonExiste(hash);
    
    if (!existe && !cartones.some(c => c.hash_carton === hash)) {
      cartones.push({
        serie: numeroSerie,
        numero_carton: cartones.length + 1,
        hash_carton: hash,
        numeros: numeros,
        color: color
      });
    }
  }

  if (cartones.length < 6) {
    throw new Error('No se pudieron generar 6 cartones únicos');
  }

  return cartones;
}

// Guardar cartones en la base de datos
export async function guardarCartones(cartones) {
  const cartonesConTimestamp = cartones.map(carton => ({
    ...carton,
    fecha_generacion: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('cartones')
    .insert(cartonesConTimestamp)
    .select();

  if (error) {
    console.error('Error guardando cartones:', error);
    throw error;
  }

  return data;
}

// Registrar una generación CON MODO, COLOR, CLIENTE Y PEDIDO
export async function registrarGeneracion(cantidadSeries, modoColor, modoGeneracion = 'normal', color = null, cliente = null, notas = null) {
  // Calcular total de cartones según el modo
  let totalCartones;
  switch(modoGeneracion) {
    case 'cuatro':
      totalCartones = cantidadSeries * 4;
      break;
    case 'rondas':
    case 'sin_num':
    case 'normal':
    default:
      totalCartones = cantidadSeries * 6;
      break;
  }

  // Generar ID de pedido único
  const timestamp = Date.now();
  const pedidoId = `PEDIDO-${timestamp}`;

  const { data, error } = await supabase
    .from('generaciones')
    .insert({
      cantidad_series: cantidadSeries,
      total_cartones: totalCartones,
      modo_color: modoColor,
      modo_generacion: modoGeneracion,
      color_usado: color,
      pedido_id: pedidoId,
      cliente: cliente,
      notas: notas
    })
    .select()
    .single();

  if (error) {
    console.error('Error registrando generación:', error);
    throw error;
  }

  return { ...data, pedido_id: pedidoId };
}

// Generar múltiples series CON SERIE INICIAL Y MODO
export async function generarMultiplesSeries(cantidadSeries, modoColor, coloresSeleccionados, serieInicial = 1, modoGeneracion = 'normal', cliente = null, notas = null) {
  const seriesGeneradas = [];
  
  const coloresDisponibles = ['#E65100', '#1976D2', '#2E2E2E', '#2E7D32', '#D32F2F', '#9C27B0'];
  
  // Generar pedido_id primero
  const generacion = await registrarGeneracion(cantidadSeries, modoColor, modoGeneracion, coloresSeleccionados[0], cliente, notas);
  const pedidoId = generacion.pedido_id;
  
  for (let i = 0; i < cantidadSeries; i++) {
    const numeroSerie = serieInicial + i;
    
    let color;
    if (modoColor === 'fijo') {
      color = coloresSeleccionados[0];
    } else if (modoColor === 'aleatorio') {
      color = coloresDisponibles[i % coloresDisponibles.length];
    }
    
    const cartones = await generarSerie(numeroSerie, color);
    
    // Agregar pedido_id y cliente a cada cartón
    const cartonesConPedido = cartones.map(carton => ({
      ...carton,
      pedido_id: pedidoId,
      cliente: cliente
    }));
    
    await guardarCartones(cartonesConPedido);
    
    seriesGeneradas.push({
      numeroSerie,
      cartones: cartonesConPedido,
      color,
      pedidoId
    });
  }
  
  return seriesGeneradas;
}