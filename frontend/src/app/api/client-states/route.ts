import { NextRequest, NextResponse } from 'next/server';

interface ClientState {
  id: string;
  fields: {
    Cliente_Nombre?: string;
    Estado_Cliente?: string;
    Fecha_Actualizacion?: string;
    CUIT?: string;
  };
}

interface ClientStatesResponse {
  success: boolean;
  clientStates: Record<string, string>;
  clientCuits: Record<string, string>;
  error?: string;
}

// GET - Obtener todos los estados de clientes
export async function GET(): Promise<NextResponse<ClientStatesResponse>> {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_CLIENT_STATES_TABLE_NAME; // Nueva tabla

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json(
        { success: false, clientStates: {}, clientCuits: {}, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

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
    const records: ClientState[] = data.records || [];

    // Convertir a objetos { cliente: estado } y { cliente: cuit }
    const clientStates: Record<string, string> = {};
    const clientCuits: Record<string, string> = {};
    records.forEach((record) => {
      const clienteNombre = record.fields.Cliente_Nombre;
      const estado = record.fields.Estado_Cliente;
      const cuit = record.fields.CUIT;
      if (clienteNombre) {
        if (estado) {
          clientStates[clienteNombre] = estado;
        }
        if (cuit) {
          clientCuits[clienteNombre] = cuit;
        }
      }
    });

    return NextResponse.json({
      success: true,
      clientStates,
      clientCuits
    });

  } catch (error) {
    console.error('Error obteniendo estados de clientes:', error);
    return NextResponse.json(
      { success: false, clientStates: {}, clientCuits: {}, error: 'Error obteniendo estados de clientes' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar estado de cliente
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { clientName, newState } = await request.json();

    if (!clientName || !newState) {
      return NextResponse.json(
        { success: false, error: 'Nombre de cliente y estado son requeridos' },
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
              'Estado_Cliente': newState
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
                  'Estado_Cliente': newState
                }
              }]
            })
        }
      );
    }

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