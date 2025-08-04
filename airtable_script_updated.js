// Script actualizado para Airtable
// INSTRUCCIONES PARA OBTENER API KEY:
// 1. Ve a https://airtable.com/account
// 2. En "API" genera una nueva API key
// 3. Reemplaza la API_KEY abajo con tu nueva key

const API_KEY = 'TU_API_KEY_AQUI'; // ⚠️ REEMPLAZA CON TU API KEY
const BASE_ID = 'appwpptQ5YsSKUlKH';
const TABLE_NAME = 'tblVsih979diW8VX4';

async function procesarPDFsDesdeAirtable() {
    try {
        console.log('🔄 Iniciando procesamiento de PDFs desde Airtable...');
        
        if (API_KEY === 'TU_API_KEY_AQUI') {
            console.error('❌ ERROR: Debes reemplazar TU_API_KEY_AQUI con tu API key real');
            console.log('📝 Para obtener tu API key:');
            console.log('1. Ve a https://airtable.com/account');
            console.log('2. En la sección "API" genera una nueva key');
            console.log('3. Reemplaza TU_API_KEY_AQUI con tu nueva key');
            return;
        }
        
        // 1. Obtener todos los registros
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al obtener registros: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        const records = data.records;
        
        console.log(`📊 Encontrados ${records.length} registros`);
        
        let procesados = 0;
        let saltados = 0;
        let errores = 0;
        
        // 2. Procesar cada registro
        for (const record of records) {
            const pdfField = record.fields?.Documento;
            const statusField = record.fields?.Estado_Procesamiento;
            
            // Verificar si tiene PDF y no está procesado
            if (!pdfField || !Array.isArray(pdfField) || pdfField.length === 0) {
                console.log(`⚠️ Registro ${record.id}: Sin PDF`);
                continue;
            }
            
            // Si ya está procesado, saltar
            if (statusField === 'Procesado') {
                console.log(`⏭️ Registro ${record.id}: Ya procesado`);
                saltados++;
                continue;
            }
            
            // Marcar como pendiente para procesamiento
            try {
                const updateResponse = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${record.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fields: {
                            'Estado_Procesamiento': 'Pendiente',
                            'CSV': 'Marcado para procesamiento desde Airtable'
                        }
                    })
                });
                
                if (updateResponse.ok) {
                    console.log(`✅ Registro ${record.id}: Marcado como pendiente`);
                    procesados++;
                } else {
                    console.log(`❌ Error actualizando registro ${record.id}`);
                    errores++;
                }
                
                // Pausa para no sobrecargar la API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.log(`❌ Error procesando registro ${record.id}: ${error.message}`);
                errores++;
            }
        }
        
        console.log(`\n📈 Resumen del procesamiento:`);
        console.log(`✅ Procesados: ${procesados}`);
        console.log(`⏭️ Saltados: ${saltados}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📊 Total: ${records.length}`);
        
        if (procesados > 0) {
            console.log(`\n💡 Para extraer completamente los PDFs, ejecuta:`);
            console.log(`python3 airtable_pdf_extractor.py`);
        }
        
    } catch (error) {
        console.error(`❌ Error general: ${error.message}`);
        if (error.message.includes('401')) {
            console.log('\n🔑 PROBLEMA CON API KEY:');
            console.log('1. Ve a https://airtable.com/account');
            console.log('2. En "API" genera una nueva API key');
            console.log('3. Reemplaza TU_API_KEY_AQUI con tu nueva key');
        }
    }
}

// Ejecutar el script
procesarPDFsDesdeAirtable(); 