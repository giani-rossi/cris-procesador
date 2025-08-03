import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    console.log('🚀 Iniciando procesamiento de PDFs...');
    
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