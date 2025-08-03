import { NextResponse } from 'next/server';

interface AirtableRecord {
  id: string;
  fields: {
    Documento?: string;
    CSV?: string;
    Estado_Procesamiento?: string;
    [key: string]: unknown;
  };
}

interface ApiResponse {
  records: AirtableRecord[];
  total_records: number;
  total_chars: number;
  total_lines: number;
  avg_chars: number;
}

export async function GET() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
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
    const records: AirtableRecord[] = data.records || [];

    // Calcular métricas
    let total_chars = 0;
    let total_lines = 0;
    let records_with_text = 0;

    records.forEach((record: AirtableRecord) => {
      const csvContent = record.fields.CSV;
      if (csvContent && typeof csvContent === 'string') {
        total_chars += csvContent.length;
        total_lines += csvContent.split('\n').length;
        records_with_text++;
      }
    });

    const avg_chars = records_with_text > 0 ? Math.round(total_chars / records_with_text) : 0;

    const result: ApiResponse = {
      records,
      total_records: records.length,
      total_chars,
      total_lines,
      avg_chars,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Airtable data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Airtable' },
      { status: 500 }
    );
  }
} 