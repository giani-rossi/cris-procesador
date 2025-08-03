import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Iniciando procesamiento de PDFs...');

    // En Vercel, no podemos ejecutar scripts Python
    // Retornamos un mensaje informativo
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      return NextResponse.json({
        success: true,
        message: '✅ Aplicación desplegada en Vercel',
        note: 'El procesamiento de PDFs debe ejecutarse localmente',
        instructions: [
          '1. Ejecuta localmente: python airtable_pdf_extractor.py',
          '2. O usa el botón desde la aplicación local',
          '3. Los datos se actualizarán en Airtable automáticamente'
        ],
        deployed: true
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