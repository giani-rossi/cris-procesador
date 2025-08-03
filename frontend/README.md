# CRIS Procesador - Dashboard

Dashboard para visualizar datos extraídos de PDFs de Airtable.

## 🚀 Despliegue en Vercel

### 1. Preparación
```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

### 2. Desplegar en Vercel

#### Opción A: Desde GitHub
1. Sube el código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Conecta tu cuenta de GitHub
4. Importa el repositorio
5. Vercel detectará automáticamente que es un proyecto Next.js
6. Haz clic en "Deploy"

#### Opción B: Desde CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Para producción
vercel --prod
```

### 3. Variables de Entorno
Las siguientes variables están configuradas en `vercel.json`:
- `AIRTABLE_API_KEY`: Tu API key de Airtable

## 📊 Funcionalidades

### ✅ Métricas Principales
- **Documentos Procesados:** Número total de PDFs
- **Caracteres Totales:** Suma de todos los caracteres extraídos
- **Líneas Totales:** Total de líneas procesadas
- **Promedio Caracteres:** Promedio por documento

### 📈 Gráficos Interactivos
1. **Distribución de Caracteres:** Gráfico de barras mostrando caracteres extraídos por documento
2. **Elementos Encontrados:** Gráfico circular con fechas, números y palabras clave detectadas

### 📋 Tabla de Datos
- Detalles completos de cada documento procesado
- Información de caracteres, líneas y elementos extraídos

### ⚙️ Funcionalidades
- **Botón de Refrescar:** Para actualizar datos desde Airtable
- **Diseño responsivo:** Se adapta a diferentes tamaños de pantalla

## 🔧 Tecnologías

- **Frontend:** Next.js 15 + React 19
- **UI:** Tailwind CSS
- **Gráficos:** Recharts
- **API:** Next.js API Routes
- **Despliegue:** Vercel

## 📁 Estructura

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── airtable/
│   │   │       └── route.ts    # API para Airtable
│   │   └── page.tsx            # Dashboard principal
│   └── ...
├── vercel.json                 # Configuración de Vercel
└── package.json
```

## 🎯 Características

- ✅ **Migración completa** desde Python/Streamlit
- ✅ **Misma lógica** de procesamiento de datos
- ✅ **Mismos gráficos** y visualizaciones
- ✅ **Misma funcionalidad** de análisis
- ✅ **Listo para Vercel** con configuración optimizada
