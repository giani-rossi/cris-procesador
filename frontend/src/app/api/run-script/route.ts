import { NextResponse } from 'next/server';

interface ScriptResponse {
  success: boolean;
  message: string;
  deployed?: boolean;
  note?: string;
  error?: string;
  details?: string;
}

export async function POST(): Promise<NextResponse<ScriptResponse>> {
  try {
    console.log('🚀 Iniciando ejecución de script desde Vercel...');

    // Opción 1: Llamar a un servicio externo (Railway, Render, etc.)
    const externalServiceUrl = process.env.EXTERNAL_SCRIPT_URL;
    
    if (externalServiceUrl) {
      console.log('📡 Llamando a servicio externo...');
      
      const response = await fetch(externalServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_SERVICE_TOKEN}`
        },
        body: JSON.stringify({
          action: 'process_pdfs',
          airtable_config: {
            api_key: process.env.AIRTABLE_API_KEY,
            base_id: process.env.AIRTABLE_BASE_ID,
            table_name: process.env.AIRTABLE_TABLE_NAME
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Script ejecutado exitosamente en servicio externo',
          deployed: true,
          note: 'Los PDFs han sido procesados y los datos actualizados en Airtable'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Error en servicio externo',
          error: 'Error en servicio externo',
          details: result.error || 'Error desconocido'
        });
      }
    }

    // Opción 2: Trigger GitHub Actions
    console.log('🚀 Triggering GitHub Actions workflow...');
    
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (githubToken && githubRepo) {
      try {
        const [owner, repo] = githubRepo.split('/');
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'process_pdfs_trigger',
            client_payload: {
              source: 'vercel_app',
              timestamp: new Date().toISOString()
            }
          })
        });
        
        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: 'GitHub Actions workflow iniciado',
            deployed: true,
            note: 'El script se ejecutará en GitHub Actions. Revisa los logs en GitHub.'
          });
        } else {
          console.error('Error triggering GitHub Actions:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error calling GitHub API:', error);
      }
    }
    
    // Fallback: Marcar registros para procesamiento local
    console.log('📝 Marcando registros para procesamiento local...');
    
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json({
        success: false,
        message: 'Configuración de Airtable incompleta',
        error: 'Configuración de Airtable incompleta'
      });
    }

    // Obtener registros pendientes
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo registros: ${response.status}`);
    }

    const data = await response.json();
    const records = data.records;
    let processedCount = 0;

    // Marcar registros como pendientes
    for (const record of records) {
      const pdfField = record.fields?.Documento;
      const statusField = record.fields?.Estado_Procesamiento;

      if (pdfField && Array.isArray(pdfField) && pdfField.length > 0) {
        if (statusField !== 'Procesado' && statusField !== 'Pendiente') {
          try {
            const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: {
                  'Estado_Procesamiento': 'Pendiente',
                  'CSV': 'Marcado para procesamiento desde Vercel'
                }
              })
            });

            if (updateResponse.ok) {
              processedCount++;
            }
          } catch (error) {
            console.error(`Error actualizando registro ${record.id}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Marcados ${processedCount} registros para procesamiento`,
      deployed: true,
      note: `Para procesar completamente los PDFs, ejecuta localmente: python3 airtable_pdf_extractor.py`
    });

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
} 