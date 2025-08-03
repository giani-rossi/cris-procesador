import { NextResponse } from 'next/server';

// Configuración exactamente igual que en Python
const AIRTABLE_API_KEY = "patkWzbMni1wMv2YM.af1472b6ff881c529a09c16005b6f69ad34d0daf21eabb60e69559966ebd9ad3";
const BASE_ID = "appwpptQ5YsSKUlKH";
const TABLE_NAME = "Table 1";

export async function GET() {
  try {
    // Obtener datos de Airtable (exactamente igual que en Python)
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error al obtener datos de Airtable: ${response.status}`);
    }

    const data = await response.json();
    
    // Procesar datos exactamente igual que en Python
    const processedData = data.records.map((record: any) => {
      const recordData = {
        id: record.id,
        created_time: record.createdTime || '',
        filename: '',
        chars: 0,
        lines: 0,
        fechas: 0,
        numeros: 0,
        palabras_clave: 0
      };

      // Procesar campos de texto extraído (exactamente igual que en Python)
      if (record.fields.Texto_Extraido) {
        const textContent = record.fields.Texto_Extraido;
        const parsedData = parseExtractedData(textContent);
        
        recordData.chars = parsedData.cantidad_caracteres || 0;
        recordData.lines = parsedData.lineas || 0;
        recordData.fechas = parsedData.fechas?.size || 0;
        recordData.numeros = parsedData.numeros?.size || 0;
        recordData.palabras_clave = parsedData.palabras_clave?.size || 0;
      }

      // Obtener nombre del archivo (exactamente igual que en Python)
      if (record.fields.Documento && record.fields.Documento.length > 0) {
        recordData.filename = record.fields.Documento[0].filename || 'Sin nombre';
      }

      return recordData;
    });

    return NextResponse.json({
      records: processedData,
      total_records: processedData.length,
      total_chars: processedData.reduce((sum: number, record: any) => sum + record.chars, 0),
      total_lines: processedData.reduce((sum: number, record: any) => sum + record.lines, 0),
      avg_chars: processedData.length > 0 ? 
        processedData.reduce((sum: number, record: any) => sum + record.chars, 0) / processedData.length : 0
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de Airtable' },
      { status: 500 }
    );
  }
}

// Función exactamente igual que en Python
function parseExtractedData(textContent: string) {
  if (!textContent) {
    return {};
  }

  const data = {
    fechas: new Set<string>(),
    numeros: new Set<string>(),
    palabras_clave: new Set<string>(),
    cantidad_caracteres: textContent.length,
    lineas: textContent.split('\n').length
  };

  // Extraer fechas (formato DD-MM-YY o DD/MM/YY) - exactamente igual que en Python
  const fechaPatterns = [
    /\d{2}-\d{2}-\d{2}/g,
    /\d{2}\/\d{2}\/\d{2}/g,
    /\d{2}-\d{2}-\d{4}/g,
    /\d{2}\/\d{2}\/\d{4}/g
  ];

  for (const pattern of fechaPatterns) {
    const fechas = textContent.match(pattern);
    if (fechas) {
      fechas.forEach(fecha => data.fechas.add(fecha));
    }
  }

  // Extraer números - exactamente igual que en Python
  const numeros = textContent.match(/\d+/g);
  if (numeros) {
    numeros.slice(0, 50).forEach(numero => data.numeros.add(numero)); // Limitar a 50 números
  }

  // Extraer palabras clave - exactamente igual que en Python
  const palabrasClave = ['remito', 'cliente', 'entrega', 'peso', 'cantidad', 'viaje', 'chofer'];
  for (const palabra of palabrasClave) {
    if (textContent.toLowerCase().includes(palabra.toLowerCase())) {
      data.palabras_clave.add(palabra);
    }
  }

  return data;
} 