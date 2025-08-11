import { NextResponse } from 'next/server';

interface AirtableRecord {
  id: string;
  fields: {
    Documento?: string;
    CSV?: string;
    Estado_Procesamiento?: string;
    Estado_Cliente?: string;
    [key: string]: unknown;
  };
}

interface ClientData {
  nombre: string;
  localidad: string;
  kgTotal: number;
  viajes: number;
  documentos: number;
  documentosInfo: string[];
  fechaUltima: string;
  estado: string; // Nuevo campo para el estado
}

interface ApiResponse {
  clientesAnalizados: ClientData[];
  resumen: {
    totalClientes: number;
    totalKg: number;
    promedioKg: number;
    cuentasChicas: number;
    cuentasMedianas: number;
    cuentasGrandes: number;
  };
  segmentacion: {
    cuentasChicas: ClientData[];
    cuentasMedianas: ClientData[];
    cuentasGrandes: ClientData[];
  };
}

function extractClientInfo(csvContent: string, filename: string): ClientData[] {
  const clients: ClientData[] = [];
  
  try {
    // Parsear CSV
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',') || [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(',');
      if (values.length < headers.length) continue;
      
      const clienteNombre = values[6]?.replace(/"/g, '').trim();
      const localidad = values[7]?.replace(/"/g, '').trim();
      const pesoNeto = parseFloat(values[11] || '0');
      
      if (clienteNombre && pesoNeto > 0) {
        clients.push({
          nombre: clienteNombre,
          localidad: localidad || 'Sin localidad',
          kgTotal: pesoNeto,
          viajes: 1,
          documentos: 1,
          fechaUltima: values[0]?.replace(/"/g, '').trim() || 'Sin fecha',
          documentosInfo: [filename],
          estado: 'Pendiente' // Estado por defecto
        });
      }
    }
  } catch (error) {
    console.error('Error parsing CSV:', error);
  }
  
  return clients;
}

function analyzeClientData(records: AirtableRecord[], estadosMap: Map<string, string> = new Map()): ApiResponse {
  const clientesMap = new Map<string, ClientData>();
  
  records.forEach((record: AirtableRecord) => {
    const csvContent = record.fields.CSV;
    const filename = record.fields.Documento || 'Sin nombre';
    
    if (!csvContent || typeof csvContent !== 'string') return;
    
    const clients = extractClientInfo(csvContent, filename);
    
    clients.forEach(client => {
      // Agrupar solo por nombre de cliente, sin importar localidad
      const clienteKey = client.nombre;
      const existing = clientesMap.get(clienteKey);
      
      if (existing) {
        existing.kgTotal += client.kgTotal;
        existing.viajes += client.viajes;
        existing.documentos += 1;
        if (!existing.documentosInfo.includes(filename)) {
          existing.documentosInfo.push(filename);
        }
        // Actualizar fecha si es más reciente
        if (client.fechaUltima && existing.fechaUltima && client.fechaUltima > existing.fechaUltima) {
          existing.fechaUltima = client.fechaUltima;
        }
        // Combinar localidades únicas
        if (client.localidad && !existing.localidad.includes(client.localidad)) {
          existing.localidad = existing.localidad + ', ' + client.localidad;
        }
      } else {
        // Usar el estado guardado en Airtable o 'Pendiente' por defecto
        const estadoGuardado = estadosMap.get(clienteKey) || 'Pendiente';
        clientesMap.set(clienteKey, { 
          ...client,
          estado: estadoGuardado
        });
      }
    });
  });
  
  const clientesAnalizados = Array.from(clientesMap.values())
    .sort((a, b) => b.kgTotal - a.kgTotal);
  
  // Segmentación
  const cuentasChicas = clientesAnalizados.filter(c => c.kgTotal >= 1000 && c.kgTotal < 7000);
  const cuentasMedianas = clientesAnalizados.filter(c => c.kgTotal >= 7000 && c.kgTotal < 12000);
  const cuentasGrandes = clientesAnalizados.filter(c => c.kgTotal >= 12000);
  
  const totalKg = clientesAnalizados.reduce((sum, c) => sum + c.kgTotal, 0);
  const promedioKg = clientesAnalizados.length > 0 ? totalKg / clientesAnalizados.length : 0;
  
  return {
    clientesAnalizados,
    resumen: {
      totalClientes: clientesAnalizados.length,
      totalKg,
      promedioKg,
      cuentasChicas: cuentasChicas.length,
      cuentasMedianas: cuentasMedianas.length,
      cuentasGrandes: cuentasGrandes.length
    },
    segmentacion: {
      cuentasChicas,
      cuentasMedianas,
      cuentasGrandes
    }
  };
}

export async function GET() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;
    const statesTableName = process.env.AIRTABLE_CLIENT_STATES_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    // Cargar datos principales
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
    const records: AirtableRecord[] = data.records || [];

    // Cargar estados desde la tabla separada
    const estadosMap = new Map<string, string>();
    if (statesTableName) {
      try {
        const statesResponse = await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(statesTableName)}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (statesResponse.ok) {
          const statesData = await statesResponse.json();
          const statesRecords = statesData.records || [];
          
          statesRecords.forEach((record: { fields: { Cliente_Nombre?: string; Estado_Cliente?: string } }) => {
            const clienteNombre = record.fields.Cliente_Nombre;
            const estado = record.fields.Estado_Cliente;
            if (clienteNombre && estado) {
              estadosMap.set(clienteNombre, estado);
            }
          });
        }
      } catch (error) {
        console.error('Error cargando estados de clientes:', error);
      }
    }
    
    const result = analyzeClientData(records, estadosMap);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing client data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze client data' },
      { status: 500 }
    );
  }
} 