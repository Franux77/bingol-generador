# 🎰 Generador de Cartones de Bingo

Aplicación web profesional para generar cartones de bingo únicos sin repeticiones.

## 🚀 Características

- ✅ Genera hasta 3000 cartones únicos (500 series)
- ✅ Sin cartones repetidos garantizado (base de datos)
- ✅ Colores personalizables o aleatorios por serie
- ✅ PDFs divididos automáticamente para descarga rápida
- ✅ Marca de agua @graficoemprendedor en cada cartón
- ✅ 6 cartones por serie (1 hoja)

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta en Supabase (gratis)

## 🛠️ Instalación

### 1. Ya tienes el proyecto creado, solo falta configurar las variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 2. Obtener las credenciales de Supabase

1. Ve a https://supabase.com
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Ve a Settings > API
5. Copia:
   - **Project URL** → NEXT_PUBLIC_SUPABASE_URL
   - **anon public** → NEXT_PUBLIC_SUPABASE_ANON_KEY

### 3. Ejecutar el script SQL en Supabase

1. Ve a tu proyecto en Supabase
2. Click en "SQL Editor" en el menú lateral
3. Pega y ejecuta el siguiente SQL:

```sql
-- Tabla para guardar cartones generados y evitar duplicados
CREATE TABLE cartones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  serie INTEGER NOT NULL,
  numero_carton INTEGER NOT NULL,
  hash_carton TEXT NOT NULL UNIQUE,
  numeros JSONB NOT NULL,
  fecha_generacion TIMESTAMP DEFAULT NOW(),
  color TEXT,
  CONSTRAINT unique_serie_numero UNIQUE(serie, numero_carton)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_cartones_hash ON cartones(hash_carton);
CREATE INDEX idx_cartones_serie ON cartones(serie);
CREATE INDEX idx_cartones_fecha ON cartones(fecha_generacion);

-- Tabla para tracking de generaciones
CREATE TABLE generaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cantidad_series INTEGER NOT NULL,
  total_cartones INTEGER NOT NULL,
  modo_color TEXT NOT NULL,
  fecha_generacion TIMESTAMP DEFAULT NOW()
);

-- Función para obtener el último número de serie usado
CREATE OR REPLACE FUNCTION get_ultimo_numero_serie()
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((SELECT MAX(serie) FROM cartones), 0);
END;
$$ LANGUAGE plpgsql;
```

## ▶️ Ejecutar la Aplicación

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador

## 📦 Para Producción

```bash
npm run build
npm start
```

## 🎨 Características de Diseño

- Cartones con formato estándar (3 filas x 9 columnas)
- 5 números por fila
- Números del 1-90 correctamente distribuidos
- Diseño profesional listo para imprimir
- Marca de agua en cada cartón

## 🔒 Garantía Anti-Duplicados

El sistema usa:
- Hash único por cada cartón
- Validación en base de datos
- Histórico completo de todos los cartones generados

## 📱 Uso

1. Selecciona la cantidad de series (1-500)
2. Elige modo de color (fijo o aleatorio)
3. Si es fijo, selecciona el color
4. Click en "Generar Cartones"
5. Se descargarán los PDFs automáticamente

## 💡 Tips

- Para eventos grandes, genera de a 100 series
- Los PDFs se dividen automáticamente cada 50 series
- Todos los cartones quedan guardados en la BD para evitar duplicados futuros

## 📞 Soporte

@graficoemprendedor en Instagram

---

Desarrollado con ❤️ por @graficoemprendedor