import { NextRequest, NextResponse } from 'next/server';

// Base de datos local de CUITs conocidos
// TODO: Reemplazar con CUITs reales obtenidos de AFIP o cuitonline.com
const knownCuits: { [key: string]: string } = {
  'ENVASES AZULES S.A.': '30-71151313-9', // ✅ Real
  // Los siguientes necesitan ser reemplazados con CUITs reales:
  'SANTA RITA METALURGICA S.A.': 'PENDIENTE',
  'MICROPLASTIC SA': 'PENDIENTE',
  'STRADA SRL': 'PENDIENTE',
  'BOLSAFRUT SA': 'PENDIENTE',
  'TROLLER ALBERTO WALTER': 'PENDIENTE',
  'CIA SUDAMERICANA DE PLASTICOS S.A.': 'PENDIENTE',
  'COES SUDAMERICA SA': 'PENDIENTE',
  'ROLAND-PLAST SA': 'PENDIENTE',
  'ATOMPLAST S.A.': 'PENDIENTE',
  'SANTIAGO SAENZ S.A.': 'PENDIENTE',
  'TELGOPOR ARGENTINA SA': 'PENDIENTE',
  'FACCIANO SRL': 'PENDIENTE',
  'KARVEL SA': 'PENDIENTE',
  'SERTRAFO S.A.': 'PENDIENTE',
  'PLASTICOS POO S.R.L.': 'PENDIENTE',
  'SOSA JOSE LUIS': 'PENDIENTE',
  'BROTHER PLAST SRL': 'PENDIENTE',
  'CELUPAPER S.A.': 'PENDIENTE',
  'ENVASES LEMA S.R.L.': 'PENDIENTE',
  'SERIN SA': 'PENDIENTE',
  'BODEGAS CUVILLIER S.A.': 'PENDIENTE',
};

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Nombre de empresa requerido' }, { status: 400 });
    }

    console.log('🔍 Buscando CUIT para:', companyName);

    // Generar URL de búsqueda en cuitonline.com (sin SA, SRL, etc.)
    const cleanCompanyName = companyName.toLowerCase().replace(/\s+(SA|SRL|S\.A\.|S\.R\.L\.)$/i, '');
    const searchQuery = encodeURIComponent(cleanCompanyName);
    const cuitOnlineUrl = `https://www.cuitonline.com/search/${searchQuery}`;
    
    // Primero buscar en la base de datos local
    const knownCuit = knownCuits[companyName.toUpperCase()];
    
    if (knownCuit && knownCuit !== 'PENDIENTE') {
      console.log('✅ CUIT encontrado en base local:', knownCuit);
      return NextResponse.json({ 
        cuit: `El CUIT de ${companyName} es ${knownCuit}`,
        rawCuit: knownCuit,
        source: 'base_local',
        searchUrl: cuitOnlineUrl
      });
    }

    // Si no está en la base local o está pendiente, usar OpenAI
    console.log('🔍 CUIT no encontrado en base local, usando OpenAI...');

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'API key de OpenAI no configurada' }, { status: 500 });
    }

    const prompt = `cuit de ${companyName}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error de OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const openaiResponse = data.choices[0]?.message?.content?.trim();

    console.log('🔍 OpenAI response:', openaiResponse);

    if (!openaiResponse) {
      return NextResponse.json({ cuit: 'No encontrado' });
    }

    return NextResponse.json({
      cuit: openaiResponse,
      source: 'openai',
      searchUrl: cuitOnlineUrl
    });

  } catch (error) {
    console.error('Error en búsqueda de CUIT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
