import { supabase } from './supabase';

// Obtener todas las generaciones registradas
export async function obtenerGeneraciones(limite = 50) {
  try {
    const { data, error } = await supabase
      .from('generaciones')
      .select('*')
      .order('fecha_generacion', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo generaciones:', error);
    return [];
  }
}

// Obtener cartones de una serie específica
export async function obtenerCartonesDeSerie(numeroSerie) {
  try {
    const { data, error } = await supabase
      .from('cartones')
      .select('*')
      .eq('serie', numeroSerie)
      .order('numero_carton', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo cartones:', error);
    return [];
  }
}

// Buscar un cartón específico por serie y número (el más reciente si hay duplicados)
export async function buscarCarton(serie, numeroCarton) {
  try {
    const { data, error } = await supabase
      .from('cartones')
      .select('*')
      .eq('serie', serie)
      .eq('numero_carton', numeroCarton)
      .order('fecha_generacion', { ascending: false })
      .limit(1)
      .single(); // Ahora sí podemos usar .single() porque limit(1) garantiza 1 resultado

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No existe
      }
      console.error('Error buscando cartón:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error en buscarCarton:', error);
    return null;
  }
}

// Verificar si un cartón existe y obtener su info
export async function verificarCartonExiste(serie, numeroCarton) {
  const carton = await buscarCarton(serie, numeroCarton);
  return {
    existe: carton !== null,
    carton: carton
  };
}

// Obtener estadísticas generales
export async function obtenerEstadisticas() {
  try {
    // Total de cartones
    const { count: totalCartones, error: errorCartones } = await supabase
      .from('cartones')
      .select('*', { count: 'exact', head: true });

    // Total de generaciones
    const { count: totalGeneraciones, error: errorGeneraciones } = await supabase
      .from('generaciones')
      .select('*', { count: 'exact', head: true });

    // Última serie generada
    const { data: ultimaSerie } = await supabase
      .from('cartones')
      .select('serie')
      .order('serie', { ascending: false })
      .limit(1)
      .single();

    if (errorCartones || errorGeneraciones) {
      throw errorCartones || errorGeneraciones;
    }

    return {
      totalCartones: totalCartones || 0,
      totalGeneraciones: totalGeneraciones || 0,
      ultimaSerie: ultimaSerie?.serie || 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      totalCartones: 0,
      totalGeneraciones: 0,
      ultimaSerie: 0
    };
  }
}

// Obtener generaciones por rango de fechas
export async function obtenerGeneracionesPorFecha(fechaInicio, fechaFin) {
  try {
    const { data, error } = await supabase
      .from('generaciones')
      .select('*')
      .gte('fecha_generacion', fechaInicio)
      .lte('fecha_generacion', fechaFin)
      .order('fecha_generacion', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo generaciones por fecha:', error);
    return [];
  }
}