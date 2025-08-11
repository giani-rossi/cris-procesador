import { NextRequest, NextResponse } from 'next/server';



// POST - Actualizar CUIT de cliente
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { clientName, cuit } = await request.json();

    if (!clientName || !cuit) {
      return NextResponse.json(
        { success: false, error: 'Nombre de cliente y CUIT son requeridos' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_CLIENT_STATES_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Buscar si ya existe el cliente
    const searchResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula={Cliente_Nombre}="${clientName}"`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Error buscando cliente: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const records = searchData.records;

    let updateResponse;

    if (records.length > 0) {
      // Actualizar registro existente
      const recordId = records[0].id;
      updateResponse = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              'CUIT': cuit
            }
          })
        }
      );
    } else {
      // Crear nuevo registro
      updateResponse = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [{
              fields: {
                'Cliente_Nombre': clientName,
                'CUIT': cuit
              }
            }]
          })
        }
      );
    }

    if (!updateResponse.ok) {
      throw new Error(`Error actualizando CUIT: ${updateResponse.status}`);
    }

    console.log(`✅ CUIT actualizado para ${clientName}: ${cuit}`);

    return NextResponse.json({
      success: true,
      message: `CUIT actualizado para ${clientName}`,
      clientName,
      cuit
    });

  } catch (error) {
    console.error('❌ Error actualizando CUIT de cliente:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
