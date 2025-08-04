# 📊 Scripts para Airtable - Procesamiento de PDFs

## 🎯 **Respuesta a tu pregunta sobre datos:**

**✅ NO, los datos NO se van a borrar** entre despliegues porque:
- Los estados de clientes se guardan en **Airtable** (no en el código)
- Airtable es **persistente** e independiente de los despliegues
- El campo `estado` de cada empresa se mantiene entre redespliegues

---

## 🚀 **Cómo usar los scripts desde Airtable:**

### **Opción 1: Script Básico (Marcar como Pendiente)**
1. Abre tu base de datos en Airtable
2. Presiona `F12` para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Copia y pega el contenido de `airtable_script.js`
5. Presiona **Enter**

### **Opción 2: Script Avanzado (Procesamiento Completo)**
1. Sigue los mismos pasos que arriba
2. Usa el contenido de `airtable_advanced_script.js`
3. **Nota:** Este script requiere librerías adicionales para procesar PDFs

---

## 📋 **Instrucciones paso a paso:**

### **Para ejecutar desde Airtable:**

1. **Abrir Airtable:**
   - Ve a https://airtable.com/appwpptQ5YsSKUlKH/tblVsih979diW8VX4/viwgGXi3J2Ld8g8k9

2. **Abrir Console:**
   - Presiona `F12` (o `Cmd+Option+I` en Mac)
   - Ve a la pestaña **Console**

3. **Ejecutar Script:**
   - Copia el contenido de `airtable_script.js`
   - Pégalo en la consola
   - Presiona **Enter**

4. **Ver Resultados:**
   - Los registros se marcarán como "Pendiente"
   - Verás un resumen en la consola

---

## 🔧 **Scripts disponibles:**

### **`airtable_script.js` - Script Básico**
- ✅ Marca registros como "Pendiente"
- ✅ Funciona completamente en el navegador
- ✅ No requiere librerías adicionales
- ⚠️ Solo marca, no procesa PDFs

### **`airtable_advanced_script.js` - Script Avanzado**
- ✅ Descarga PDFs desde Airtable
- ✅ Extrae texto de PDFs
- ✅ Procesa datos y crea CSV
- ⚠️ Requiere librerías adicionales (pdf-parse)

---

## 📊 **Estados de Procesamiento:**

- **`Pendiente`** - Listo para procesar
- **`Procesado`** - Ya fue procesado exitosamente
- **`Error`** - Hubo un error durante el procesamiento

---

## 🎯 **Ventajas de usar scripts desde Airtable:**

1. **✅ No depende de Vercel** - Funciona directamente desde Airtable
2. **✅ No hay errores de `join()`** - Ejecuta en el navegador
3. **✅ Acceso directo a datos** - No hay intermediarios
4. **✅ Fácil de usar** - Solo copiar y pegar
5. **✅ Datos persistentes** - Los estados se mantienen entre despliegues

---

## 🔄 **Flujo recomendado:**

1. **Subir PDFs** a Airtable
2. **Ejecutar script básico** para marcar como pendiente
3. **Ejecutar script Python** localmente para procesamiento completo
4. **Ver resultados** en la aplicación web

---

## 📝 **Notas importantes:**

- Los scripts usan tu API key de Airtable
- Los datos se mantienen entre despliegues
- Puedes ejecutar los scripts múltiples veces
- Los registros ya procesados se saltan automáticamente 