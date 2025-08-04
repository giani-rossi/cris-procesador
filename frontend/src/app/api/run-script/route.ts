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
      // En Vercel, no podemos procesar PDFs directamente
      // Solo marcamos como pendiente para procesamiento local
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
              'Estado_Procesamiento': 'Pendiente',
              'CSV': 'Marcado para procesamiento local'
            }
          })
        }
      );

      processedCount++;
    } catch (error) {
      console.error(`Error processing record ${record.id}:`, error);
      errorCount++;
    }
  }

  return {
    processed: processedCount,
    skipped: skippedCount,
    errors: errorCount,
    total: records.length,
    message: 'Registros marcados para procesamiento local. Ejecuta el script Python localmente para extracción completa.'
  };
} 