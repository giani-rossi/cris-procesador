import os
import re
import csv
import io
import requests
from datetime import datetime
import pandas as pd
import PyPDF2
import pdfplumber
from pyairtable import Api

class ImprovedPDFExtractor:
    def __init__(self, api_key, base_id, table_name):
        """
        Initialize the improved PDF extractor with pattern recognition
        """
        self.api = Api(api_key)
        self.base_id = base_id
        self.table_name = table_name
        self.table = self.api.table(base_id, table_name)
    
    def download_pdf_from_url(self, pdf_url):
        """Download PDF content from Airtable attachment URL"""
        try:
            response = requests.get(pdf_url)
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            print(f"Error downloading PDF: {e}")
            return None
    
    def extract_text_from_pdf(self, pdf_content):
        """Extract all text from PDF using pdfplumber"""
        try:
            text_content = ""
            pdf_file = io.BytesIO(pdf_content)
            
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n\n"
            
            return text_content.strip()
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""
    
    def parse_delivery_data_advanced(self, text_content):
        """
        Advanced parsing for GruSIMPA delivery documents
        Handles multiple formats and patterns
        """
        delivery_records = []
        lines = text_content.split('\n')
        
        current_client_code = None
        current_client_name = None
        
        # Patterns for different line types
        client_pattern = r'^(\d+)\s+(.+)$'
        
        # More flexible delivery record pattern
        delivery_patterns = [
            # Pattern 1: Standard format with Remito
            r'(\d{2}-\w{3}-\d{2})\s+(\d+)\s+Remito(\d+)\s+(\d+)\s+(\d+)\s+([A-Z\s\-\.]+?)\s+([A-Z\s\-\(\)\.,"]+?)\s+(\d+)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)',
            
            # Pattern 2: Format with Orden de Retiro
            r'(\d{2}-\w{3}-\d{2})\s+(\d+)\s+Orden de Retiro(\d+)\s+(\d+)\s+(\d+)\s+([A-Z\s\-\.]+?)\s+([A-Z\s\-\(\)\.,"]+?)\s+(\d+)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)',
            
            # Pattern 3: More flexible pattern
            r'(\d{2}-\w{3}-\d{2})\s+(\d+)\s+(?:Remito|Orden de Retiro)(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s+([A-Z\s\-\(\)\.,"]+?)\s+(\d+)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)'
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line contains client information
            client_match = re.match(client_pattern, line)
            if client_match and not re.search(r'\d{2}-\w{3}-\d{2}', line):
                potential_code = client_match.group(1)
                potential_name = client_match.group(2).strip()
                
                # Validate that it looks like a client header
                if len(potential_code) <= 6 and not potential_name.isdigit():
                    current_client_code = potential_code
                    current_client_name = potential_name
                    continue
            
            # Try each delivery pattern
            for pattern in delivery_patterns:
                delivery_match = re.search(pattern, line)
                if delivery_match:
                    try:
                        # Extract data based on the pattern
                        groups = delivery_match.groups()
                        
                        record = {
                            'fecha': groups[0],
                            'transac_nr': groups[1],
                            'remito': groups[2],
                            'viaje_nr': groups[3],
                            'chofer_code': groups[4],
                            'chofer': groups[5].strip(),
                            'localidad_entrega': groups[6].strip(),
                            'cliente_codigo': current_client_code or '',
                            'cliente_nombre': current_client_name or '',
                            'codigo_destino': '',  # Not clearly visible in this format
                            'bultos': groups[7],
                            'cantidad': float(groups[8]),
                            'peso_neto': float(groups[9]),
                            'peso_bruto': float(groups[10])
                        }
                        
                        delivery_records.append(record)
                        break  # Stop trying other patterns once we find a match
                        
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing line: {line[:50]}... - {e}")
                        continue
        
        return delivery_records
    
    def parse_simple_table_data(self, text_content):
        """
        Simple parsing that extracts data from table-like structures
        """
        delivery_records = []
        lines = text_content.split('\n')
        
        current_client_code = None
        current_client_name = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for client headers (number followed by text)
            if re.match(r'^\d+\s+[A-Z]', line) and not re.search(r'\d{2}-\w{3}-\d{2}', line):
                parts = line.split(None, 1)
                if len(parts) >= 2:
                    current_client_code = parts[0]
                    current_client_name = parts[1]
                continue
            
            # Look for date patterns to identify delivery records
            if re.search(r'\d{2}-\w{3}-\d{2}', line):
                # Try to extract structured data from this line and potentially next lines
                words = line.split()
                
                # Find the date
                date_match = re.search(r'(\d{2}-\w{3}-\d{2})', line)
                if date_match:
                    try:
                        # Extract what we can from the line
                        record = {
                            'fecha': date_match.group(1),
                            'transac_nr': '',
                            'remito': '',
                            'viaje_nr': '',
                            'chofer_code': '',
                            'chofer': '',
                            'localidad_entrega': '',
                            'cliente_codigo': current_client_code or '',
                            'cliente_nombre': current_client_name or '',
                            'codigo_destino': '',
                            'bultos': '0',
                            'cantidad': 0.0,
                            'peso_neto': 0.0,
                            'peso_bruto': 0.0
                        }
                        
                        # Try to extract numbers from the line
                        numbers = re.findall(r'\d+\.?\d*', line)
                        if len(numbers) >= 3:
                            # Assume last few numbers are quantities/weights
                            record['cantidad'] = float(numbers[-3]) if len(numbers) >= 3 else 0.0
                            record['peso_neto'] = float(numbers[-2]) if len(numbers) >= 2 else 0.0
                            record['peso_bruto'] = float(numbers[-1]) if len(numbers) >= 1 else 0.0
                        
                        # Try to extract text parts (chofer, location)
                        text_parts = re.findall(r'[A-Z][A-Z\s\-\(\)\.,"]+', line)
                        if text_parts:
                            if len(text_parts) >= 2:
                                record['chofer'] = text_parts[0].strip()
                                record['localidad_entrega'] = text_parts[1].strip()
                            elif len(text_parts) == 1:
                                record['localidad_entrega'] = text_parts[0].strip()
                        
                        delivery_records.append(record)
                        
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing simple line: {line[:50]}... - {e}")
                        continue
        
        return delivery_records
    
    def convert_to_csv_string(self, delivery_records):
        """Convert delivery records to CSV string format"""
        if not delivery_records:
            return "No se pudieron extraer registros estructurados del PDF"
        
        # Create CSV string
        output = io.StringIO()
        fieldnames = [
            'Fecha', 'Viaje_Nr', 'Chofer', 'TransacNr', 'Remito',
            'Cliente_Codigo', 'Cliente_Nombre', 'Localidad_Entrega',
            'Codigo_Destino', 'Bultos', 'Cantidad', 'Peso_Neto', 'Peso_Bruto'
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in delivery_records:
            # Map internal field names to CSV headers
            csv_record = {
                'Fecha': record.get('fecha', ''),
                'Viaje_Nr': record.get('viaje_nr', ''),
                'Chofer': record.get('chofer', ''),
                'TransacNr': record.get('transac_nr', ''),
                'Remito': record.get('remito', ''),
                'Cliente_Codigo': record.get('cliente_codigo', ''),
                'Cliente_Nombre': record.get('cliente_nombre', ''),
                'Localidad_Entrega': record.get('localidad_entrega', ''),
                'Codigo_Destino': record.get('codigo_destino', ''),
                'Bultos': record.get('bultos', '0'),
                'Cantidad': record.get('cantidad', 0.0),
                'Peso_Neto': record.get('peso_neto', 0.0),
                'Peso_Bruto': record.get('peso_bruto', 0.0)
            }
            writer.writerow(csv_record)
        
        csv_content = output.getvalue()
        output.close()
        
        return csv_content
    
    def process_pdf_content(self, pdf_content):
        """Process PDF content and return structured CSV data"""
        # Extract text from PDF
        text_content = self.extract_text_from_pdf(pdf_content)
        
        if not text_content:
            return "No se pudo extraer texto del PDF"
        
        # Try advanced parsing first
        delivery_records = self.parse_delivery_data_advanced(text_content)
        
        # If advanced parsing didn't work, try simple parsing
        if not delivery_records:
            delivery_records = self.parse_simple_table_data(text_content)
        
        # If we found structured data, convert to CSV
        if delivery_records:
            csv_content = self.convert_to_csv_string(delivery_records)
            return f"\n\n{csv_content}\n\n REGISTROS ENCONTRADOS: {len(delivery_records)} ==="
        else:
            # If no structured data found, return raw text
            return f"=== NO SE PUDIERON EXTRAER DATOS ESTRUCTURADOS ===\n\n=== TEXTO EXTRAÍDO ===\n\n{text_content}"
    
    def process_record(self, record_id, pdf_field_name, output_field_name, status_field_name):
        """Process a single Airtable record"""
        try:
            record = self.table.get(record_id)
            
            if pdf_field_name not in record['fields']:
                print(f"No PDF field '{pdf_field_name}' found in record {record_id}")
                return 'error'
            
            pdf_attachments = record['fields'][pdf_field_name]
            if not pdf_attachments:
                print(f"No PDF attachments found in record {record_id}")
                return 'error'
            
            pdf_url = pdf_attachments[0]['url']
            filename = pdf_attachments[0].get('filename', 'unknown.pdf')
            
            # Verificar estado de procesamiento
            current_status = record['fields'].get(status_field_name, 'Pendiente')
            
            if current_status == 'Procesado':
                print(f"⏭️ Ya procesado: {filename}")
                return 'skipped'
            elif current_status == 'Error':
                print(f"🔄 Reprocesando: {filename}")
            else:
                print(f"📄 Procesando nuevo: {filename}")
            
            pdf_content = self.download_pdf_from_url(pdf_url)
            if not pdf_content:
                print(f"Failed to download PDF: {filename}")
                # Marcar como error
                self.table.update(record_id, {status_field_name: 'Error'})
                return 'error'
            
            extracted_content = self.process_pdf_content(pdf_content)
            
            if not extracted_content:
                print(f"No content could be extracted from PDF: {filename}")
                # Marcar como error
                self.table.update(record_id, {status_field_name: 'Error'})
                return 'error'
            
            # Debug: mostrar el contenido extraído
            print(f"📝 Contenido extraído (primeros 200 chars): {extracted_content[:200]}...")
            print(f"📏 Longitud del contenido: {len(extracted_content)}")
            
            # Actualizar con contenido y estado
            self.table.update(record_id, {
                output_field_name: extracted_content,
                status_field_name: 'Procesado'
            })
            
            print(f"✅ Successfully processed {filename}")
            return 'success'
            
        except Exception as e:
            print(f"❌ Error processing record {record_id}: {e}")
            # Marcar como error
            try:
                self.table.update(record_id, {status_field_name: 'Error'})
            except:
                pass
            return 'error'
    
    def process_all_records(self, pdf_field_name, output_field_name, status_field_name, filter_formula=None):
        """Process all records in the table that have PDF attachments"""
        try:
            print("🚀 Starting improved PDF processing...")
            
            records = self.table.all(formula=filter_formula) if filter_formula else self.table.all()
            
            processed_count = 0
            success_count = 0
            skipped_count = 0
            error_count = 0
            
            for record in records:
                record_id = record['id']
                
                if pdf_field_name in record['fields'] and record['fields'][pdf_field_name]:
                    processed_count += 1
                    print(f"\n📄 Processing record {processed_count}...")
                    
                    result = self.process_record(record_id, pdf_field_name, output_field_name, status_field_name)
                    if result == 'success':
                        success_count += 1
                    elif result == 'skipped':
                        skipped_count += 1
                    else:
                        error_count += 1
            
            print(f"\n🎉 Processing complete!")
            print(f"📊 Records with PDFs: {processed_count}")
            print(f"✅ Successfully processed: {success_count}")
            print(f"⏭️ Skipped (already processed): {skipped_count}")
            print(f"❌ Failed: {error_count}")
            
        except Exception as e:
            print(f"❌ Error processing records: {e}")

def main():
    """Main function"""
    
    # Configuration
    AIRTABLE_API_KEY = "patkWzbMni1wMv2YM.af1472b6ff881c529a09c16005b6f69ad34d0daf21eabb60e69559966ebd9ad3"
    BASE_ID = "appwpptQ5YsSKUlKH"
    TABLE_NAME = "Table 1"
    PDF_FIELD_NAME = "Documento"
    OUTPUT_FIELD_NAME = "CSV"
    STATUS_FIELD_NAME = "Estado_Procesamiento"
    
    print("🔧 Initializing Improved PDF Extractor...")
    
    extractor = ImprovedPDFExtractor(AIRTABLE_API_KEY, BASE_ID, TABLE_NAME)
    
    # Process all records, including ones that might need reprocessing
    # Remove the filter to reprocess all records
    extractor.process_all_records(PDF_FIELD_NAME, OUTPUT_FIELD_NAME, STATUS_FIELD_NAME)

if __name__ == "__main__":
    main()