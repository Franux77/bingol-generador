import { supabase } from './supabase';

// VALIDAR UN CARTÓN INDIVIDUAL
export function validarCarton(numeros) {
  const errores = [];
  
  // 1. Verificar que tenga 27 números (grid 3x9)
  if (numeros.length !== 27) {
    errores.push(`Error: El cartón tiene ${numeros.length} celdas en vez de 27`);
  }
  
  // 2. Contar números no nulos
  const numerosReales = numeros.filter(n => n !== null);
  if (numerosReales.length !== 15) {
    errores.push(`Error: El cartón tiene ${numerosReales.length} números en vez de 15`);
  }
  
  // 3. Verificar números duplicados en el MISMO cartón
  const numerosUnicos = new Set(numerosReales);
  if (numerosUnicos.size !== numerosReales.length) {
    errores.push('Error: Hay números duplicados en el mismo cartón');
    
    // Encontrar cuáles están duplicados
    const vistos = {};
    const duplicados = [];
    numerosReales.forEach(num => {
      if (vistos[num]) {
        duplicados.push(num);
      }
      vistos[num] = true;
    });
    errores.push(`Números duplicados: ${duplicados.join(', ')}`);
  }
  
  // 4. Verificar rangos por columna
  const columnas = [];
  for (let col = 0; col < 9; col++) {
    columnas[col] = [];
    for (let row = 0; row < 3; row++) {
      const num = numeros[row * 9 + col];
      if (num !== null) {
        columnas[col].push(num);
      }
    }
  }
  
  const rangosCorrectos = [
    [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
    [50, 59], [60, 69], [70, 79], [80, 90]
  ];
  
  columnas.forEach((nums, col) => {
    const [min, max] = rangosCorrectos[col];
    nums.forEach(num => {
      if (num < min || num > max) {
        errores.push(`Error: Número ${num} en columna ${col + 1} (debe estar entre ${min}-${max})`);
      }
    });
  });
  
  // 5. Verificar que cada fila tenga 5 números
  for (let row = 0; row < 3; row++) {
    const fila = [];
    for (let col = 0; col < 9; col++) {
      const num = numeros[row * 9 + col];
      if (num !== null) fila.push(num);
    }
    if (fila.length !== 5) {
      errores.push(`Error: Fila ${row + 1} tiene ${fila.length} números en vez de 5`);
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// BUSCAR CARTONES DUPLICADOS (mismo contenido, diferentes series)
export async function buscarCartonesDuplicados() {
  try {
    const { data: cartones, error } = await supabase
      .from('cartones')
      .select('*')
      .order('hash_carton');
    
    if (error) throw error;
    
    const duplicados = [];
    const hashMap = {};
    
    cartones.forEach(carton => {
      if (hashMap[carton.hash_carton]) {
        duplicados.push({
          hash: carton.hash_carton,
          cartones: [hashMap[carton.hash_carton], carton]
        });
      } else {
        hashMap[carton.hash_carton] = carton;
      }
    });
    
    return duplicados;
  } catch (error) {
    console.error('Error buscando duplicados:', error);
    return [];
  }
}

// VALIDAR TODOS LOS CARTONES EN LA BD
export async function auditarBaseDeDatos() {
  try {
    const { data: cartones, error } = await supabase
      .from('cartones')
      .select('*');
    
    if (error) throw error;
    
    const resultados = {
      total: cartones.length,
      validos: 0,
      errores: 0,
      cartonesConError: [],
      duplicados: []
    };
    
    // Validar cada cartón
    cartones.forEach(carton => {
      const validacion = validarCarton(carton.numeros);
      
      if (validacion.valido) {
        resultados.validos++;
      } else {
        resultados.errores++;
        resultados.cartonesConError.push({
          serie: carton.serie,
          numero: carton.numero_carton,
          errores: validacion.errores,
          fecha: carton.fecha_generacion
        });
      }
    });
    
    // Buscar duplicados
    const hashMap = {};
    cartones.forEach(carton => {
      if (hashMap[carton.hash_carton]) {
        resultados.duplicados.push({
          carton1: {
            serie: hashMap[carton.hash_carton].serie,
            numero: hashMap[carton.hash_carton].numero_carton
          },
          carton2: {
            serie: carton.serie,
            numero: carton.numero_carton
          },
          hash: carton.hash_carton
        });
      } else {
        hashMap[carton.hash_carton] = carton;
      }
    });
    
    return resultados;
  } catch (error) {
    console.error('Error en auditoría:', error);
    return null;
  }
}

// BUSCAR CARTONES CON ERRORES ESPECÍFICOS
export async function buscarCartonesConErrores() {
  try {
    const { data: cartones, error } = await supabase
      .from('cartones')
      .select('*');
    
    if (error) throw error;
    
    const cartonesProblematicos = [];
    
    cartones.forEach(carton => {
      const validacion = validarCarton(carton.numeros);
      
      if (!validacion.valido) {
        cartonesProblematicos.push({
          serie: carton.serie,
          numero_carton: carton.numero_carton,
          fecha_generacion: carton.fecha_generacion,
          errores: validacion.errores,
          numeros: carton.numeros
        });
      }
    });
    
    return cartonesProblematicos;
  } catch (error) {
    console.error('Error buscando cartones con errores:', error);
    return [];
  }
}

// VERIFICAR INTEGRIDAD DE UNA SERIE COMPLETA
export async function verificarSerie(numeroSerie) {
  try {
    const { data: cartones, error } = await supabase
      .from('cartones')
      .select('*')
      .eq('serie', numeroSerie)
      .order('numero_carton');
    
    if (error) throw error;
    
    const resultado = {
      serie: numeroSerie,
      totalCartones: cartones.length,
      cartonesEsperados: 6,
      completa: cartones.length === 6,
      errores: [],
      validos: 0,
      invalidos: 0,
      detalles: []
    };
    
    // Verificar que tenga 6 cartones
    if (cartones.length !== 6) {
      resultado.errores.push(`La serie tiene ${cartones.length} cartones en vez de 6`);
    }
    
    // Validar cada cartón
    cartones.forEach((carton, idx) => {
      const validacion = validarCarton(carton.numeros);
      
      const detalle = {
        numero: carton.numero_carton,
        valido: validacion.valido,
        errores: validacion.errores
      };
      
      if (validacion.valido) {
        resultado.validos++;
      } else {
        resultado.invalidos++;
      }
      
      resultado.detalles.push(detalle);
      
      // Verificar numeración secuencial
      if (carton.numero_carton !== idx + 1) {
        resultado.errores.push(`Cartón ${carton.numero_carton} debería ser el número ${idx + 1}`);
      }
    });
    
    // Buscar duplicados dentro de la serie
    const hashes = cartones.map(c => c.hash_carton);
    const hashesUnicos = new Set(hashes);
    if (hashesUnicos.size !== hashes.length) {
      resultado.errores.push('Hay cartones duplicados dentro de la misma serie');
    }
    
    return resultado;
  } catch (error) {
    console.error('Error verificando serie:', error);
    return null;
  }
}

// GENERAR REPORTE DE AUDITORÍA COMPLETO
export async function generarReporteAuditoria() {
  const reporte = {
    fecha: new Date().toISOString(),
    auditoria: await auditarBaseDeDatos(),
    duplicados: await buscarCartonesDuplicados(),
    cartonesConErrores: await buscarCartonesConErrores()
  };
  
  return reporte;
}