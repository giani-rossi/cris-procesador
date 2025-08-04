import { NextRequest, NextResponse } from 'next/server';

interface UpdateStateRequest {
  clientName: string;
  newState: string;
}

export async function POST(request: NextRequest) {
  try {
    const { clientName, newState }: UpdateStateRequest = await request.json();

    if (!clientName || !newState) {
      return NextResponse.json(
        { success: false, error: 'Nombre de cliente y estado son requeridos' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Buscar el registro del cliente en Airtable
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

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: `Cliente "${clientName}" no encontrado` },
        { status: 404 }
      );
    }

    // Actualizar el estado del cliente
    const recordId = records[0].id;
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Estado_Cliente': newState
          }
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Error actualizando estado: ${updateResponse.status}`);
    }

    console.log(`✅ Estado actualizado para ${clientName}: ${newState}`);

    return NextResponse.json({
      success: true,
      message: `Estado actualizado para ${clientName}`,
      clientName,
      newState
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de cliente:', error);
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