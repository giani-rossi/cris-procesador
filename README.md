# 🚀 CRIS Procesador - Sistema de Análisis de PDFs

Sistema completo para procesar PDFs de entregas, extraer datos estructurados y analizar clientes para pipeline de ventas.

## 📋 Características

### 🔧 Backend (Python)
- **Extracción de PDFs**: Procesamiento automático de PDFs desde Airtable
- **Parsing de datos**: Extracción de información de entregas (clientes, kg, localidades)
- **Integración Airtable**: Lectura y escritura de datos estructurados
- **Control de estado**: Sistema robusto de tracking de procesamiento

### 🌐 Frontend (Next.js)
- **Dashboard principal**: Métricas generales y navegación
- **Análisis de clientes**: Segmentación por volumen de kg
- **Gráficos interactivos**: Visualización de datos con Recharts
- **Ordenamiento**: Funcionalidad de ordenamiento por kg
- **Botón de procesamiento**: Ejecución directa del script Python

## 🏗️ Arquitectura

```
cris-procesador/
├── airtable_pdf_extractor.py    # Script principal de extracción
├── .env.local                   # Variables de entorno
├── .gitignore                   # Archivos a ignorar
├── frontend/                    # Aplicación Next.js
│   ├── src/app/
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── clientes/page.tsx   # Análisis de clientes
│   │   ├── api/
│   │   │   ├── airtable/       # Datos de Airtable
│   │   │   ├── analyze-clients/ # Análisis de clientes
│   │   │   └── run-script/     # Ejecutar script Python
│   │   └── layout.tsx          # Layout principal
│   ├── package.json            # Dependencias Node.js
│   └── vercel.json            # Configuración Vercel
└── venv/                      # Entorno virtual Python
```

## 🚀 Instalación

### Prerrequisitos
- Python 3.8+
- Node.js 18+
- Cuenta de Airtable

### 1. Clonar repositorio
```bash
git clone <repository-url>
cd cris-procesador
```

### 2. Configurar Python
```bash
python3 -m venv venv
source venv/bin/activate
pip install requests pyairtable PyPDF2 pdfplumber pandas
```

### 3. Configurar variables de entorno
```bash
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Airtable
```

### 4. Configurar Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuración

### Variables de Entorno (.env.local)
```bash
# Airtable Configuration
AIRTABLE_API_KEY=tu_api_key_aqui
AIRTABLE_BASE_ID=tu_base_id_aqui
AIRTABLE_TABLE_NAME=Table 1

# Python Script Path (local development)
PYTHON_SCRIPT_PATH=/ruta/al/script/airtable_pdf_extractor.py
VENV_PATH=/ruta/al/venv/bin/activate
```

## 📊 Funcionalidades

### 🔍 Procesamiento de PDFs
- Descarga automática de PDFs desde Airtable
- Extracción de texto con PyPDF2 y pdfplumber
- Parsing de datos CSV estructurados
- Actualización de registros en Airtable

### 📈 Análisis de Clientes
- **Segmentación automática**:
  - Cuentas chicas: 1,000kg - 7,000kg
  - Cuentas medianas: 7,000kg - 12,000kg
  - Cuentas grandes: +12,000kg

- **Métricas por cliente**:
  - Total de kg entregados
  - Número de viajes
  - Localidades de entrega
  - Fecha de última entrega
  - Documentos de origen

### 📊 Visualizaciones
- Gráficos de distribución por segmento
- Top 10 clientes por volumen
- Métricas generales del sistema

## 🚀 Deploy

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel
3. Deploy automático en cada push

### Variables de Entorno en Vercel
```bash
AIRTABLE_API_KEY=tu_api_key
AIRTABLE_BASE_ID=tu_base_id
AIRTABLE_TABLE_NAME=Table 1
```

## 🔄 Flujo de Trabajo

1. **Subir PDFs** a Airtable
2. **Ejecutar procesamiento** desde el frontend
3. **Revisar análisis** de clientes
4. **Identificar oportunidades** de venta

## 📝 Uso

### Procesamiento de PDFs
1. Ir a la página principal
2. Hacer click en "Procesar PDFs"
3. Esperar confirmación de procesamiento

### Análisis de Clientes
1. Navegar a "Ver Análisis de Clientes"
2. Seleccionar segmento (chicas/medianas/grandes)
3. Ordenar por kg total si es necesario
4. Identificar clientes prioritarios

## 🛠️ Desarrollo

### Scripts disponibles
```bash
# Frontend
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run start        # Servidor de producción

# Python
python airtable_pdf_extractor.py  # Procesar PDFs
```

### Estructura de datos
- **CSV**: Datos extraídos de PDFs
- **Estado_Procesamiento**: Control de estado (Pendiente/Procesado/Error)
- **Documento**: Archivo PDF original

## 📞 Soporte

Para problemas o consultas:
- Revisar logs del script Python
- Verificar variables de entorno
- Comprobar permisos de Airtable

## 📄 Licencia

Proyecto interno para análisis de pipeline de ventas. 