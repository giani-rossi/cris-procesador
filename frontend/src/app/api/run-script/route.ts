import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Iniciando procesamiento de PDFs...');

    // En Vercel, no podemos ejecutar scripts Python directamente
    // Vamos a usar una solución alternativa: procesar directamente desde la API
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // En Vercel, procesar directamente usando la API de Airtable
      const result = await processAirtablePDFs();
      
      return NextResponse.json({
        success: true,
        message: '✅ Registros marcados para procesamiento local',
        result: result,
        deployed: true,
        note: 'Para extracción completa de PDFs, ejecuta el script Python localmente'
      });
    }

    // Solo ejecutar localmente
    const { exec } = await import('child_process');
    const { promisify } = await import('util');

    const execAsync = promisify(exec);

    // Ejecutar el script de Python
    const { stdout, stderr } = await execAsync(
      'cd /Users/gianirossi/Desktop/cris-procesador && source venv/bin/activate && python airtable_pdf_extractor.py',
      {
        shell: '/bin/zsh',
        timeout: 300000 // 5 minutos de timeout
      }
    );

    console.log('✅ Script ejecutado exitosamente');
    console.log('📊 Output:', stdout);

    if (stderr) {
      console.log('⚠️ Warnings:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Script ejecutado exitosamente',
      output: stdout,
      warnings: stderr || null
    });

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error ejecutando el script de procesamiento',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

async function processAirtablePDFs() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('Missing environment variables');
  }

  // Obtener registros de Airtable
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }

  const data = await response.json();
  const records = data.records || [];

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const pdfField = record.fields.Documento;
    const statusField = record.fields.Estado_Procesamiento;

    if (!pdfField || !pdfField.length) {
      continue;
    }

    // Verificar estado
    if (statusField === 'Procesado') {
      skippedCount++;
      continue;
    }

    try {
      // Procesar PDF usando JavaScript
      const pdfUrl = pdfField[0].url;
      const filename = pdfField[0].filename || 'unknown.pdf';
      
      console.log(`📄 Procesando: ${filename}`);
      
      // Descargar PDF
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfText = await extractTextFromPDF(pdfBuffer);
      
      if (!pdfText) {
        throw new Error('No text extracted from PDF');
      }
      
      // Procesar texto extraído
      const processedData = processPDFText(pdfText, filename);
      
      // Actualizar Airtable
      await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${record.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              'Estado_Procesamiento': 'Procesado',
              'CSV': processedData
            }
          })
        }
      );

      processedCount++;
      console.log(`✅ Procesado exitosamente: ${filename}`);
      
    } catch (error) {
      console.error(`Error processing record ${record.id}:`, error);
      
      // Marcar como error
      try {
        await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${record.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                'Estado_Procesamiento': 'Error',
                'CSV': `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
              }
            })
          }
        );
      } catch (updateError) {
        console.error('Error updating record status:', updateError);
      }
      
      errorCount++;
    }
  }

  return {
    processed: processedCount,
    skipped: skippedCount,
    errors: errorCount,
    total: records.length,
    message: 'Procesamiento completado en JavaScript'
  };
}

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Importar pdf-parse dinámicamente
    const pdfParse = await import('pdf-parse');
    
    // Convertir ArrayBuffer a Buffer
    const buffer = Buffer.from(pdfBuffer);
    
    // Extraer texto del PDF
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "";
  }
}

function processPDFText(text: string, filename: string): string {
  try {
    // Implementar lógica de procesamiento similar a Python
    const lines = text.split('\n');
    const deliveryRecords = [];
    
    // Patrones regex para extraer datos
    const deliveryPattern = /(\d{2}-\w{3}\.-?\d{2})\s+(\d+)\s+Remito(\d+)\s+(\d+)\s+(\d+)\s+([A-Z\s\-\.]+?)\s+([A-Z\s\-\(\)\.,"]+?)\s+(\d+)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/;
    
    let currentClientCode = '';
    let currentClientName = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Buscar información de cliente
      const clientMatch = trimmedLine.match(/^(\d+)\s+(.+)$/);
      if (clientMatch && !trimmedLine.match(/\d{2}-\w{3}-\d{2}/)) {
        const potentialCode = clientMatch[1];
        const potentialName = clientMatch[2].trim();
        
        if (potentialCode.length <= 6 && !potentialName.match(/^\d+$/)) {
          currentClientCode = potentialCode;
          currentClientName = potentialName;
          continue;
        }
      }
      
      // Buscar registros de entrega
      const deliveryMatch = trimmedLine.match(deliveryPattern);
      if (deliveryMatch) {
        const groups = deliveryMatch;
        if (groups.length >= 11) {
          const record = {
            fecha: groups[1] || '',
            transac_nr: groups[2] || '',
            remito: groups[3] || '',
            viaje_nr: groups[4] || '',
            chofer_code: groups[5] || '',
            chofer: groups[6] || '',
            localidad_entrega: groups[7] || '',
            cliente_codigo: currentClientCode,
            cliente_nombre: currentClientName,
            codigo_destino: '',
            bultos: groups[8] || '0',
            cantidad: parseFloat(groups[9]) || 0.0,
            peso_neto: parseFloat(groups[10]) || 0.0,
            peso_bruto: parseFloat(groups[11]) || 0.0
          };
          
          deliveryRecords.push(record);
        }
      }
    }
    
    // Convertir a CSV
    if (deliveryRecords.length === 0) {
      return "No se pudieron extraer registros estructurados del PDF";
    }
    
    const csvHeaders = [
      'Fecha', 'Viaje_Nr', 'Chofer', 'TransacNr', 'Remito',
      'Cliente_Codigo', 'Cliente_Nombre', 'Localidad_Entrega',
      'Codigo_Destino', 'Bultos', 'Cantidad', 'Peso_Neto', 'Peso_Bruto'
    ];
    
    const csvRows = deliveryRecords.map(record => [
      record.fecha,
      record.viaje_nr,
      record.chofer,
      record.transac_nr,
      record.remito,
      record.cliente_codigo,
      record.cliente_nombre,
      record.localidad_entrega,
      record.codigo_destino,
      record.bultos,
      record.cantidad,
      record.peso_neto,
      record.peso_bruto
    ].join(','));
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    
    return `${csvContent}\n\n REGISTROS ENCONTRADOS: ${deliveryRecords.length} ===`;
    
  } catch (error) {
    console.error('Error processing PDF text:', error);
    return `Error procesando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`;
  }
} 