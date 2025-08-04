'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

interface ClientData {
  nombre: string;
  localidad: string;
  kgTotal: number;
  viajes: number;
  documentos: number;
  fechaUltima: string;
  documentosInfo?: string[]; // Agregar información de documentos
}

interface Segmentacion {
  cuentasChicas: ClientData[];
  cuentasMedianas: ClientData[];
  cuentasGrandes: ClientData[];
  totalClientes: number;
  totalKg: number;
  promedioKg: number;
}

interface ApiResponse {
  segmentacion: Segmentacion;
  clientesAnalizados: ClientData[];
  resumen: {
    totalClientes: number;
    totalKg: number;
    promedioKg: number;
    cuentasChicas: number;
    cuentasMedianas: number;
    cuentasGrandes: number;
  };
}

export default function ClientesPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<'chicas' | 'medianas' | 'grandes'>('grandes');
  const [error, setError] = useState<string | null>(null);
  const [processingScript, setProcessingScript] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [clientStates, setClientStates] = useState<{[key: string]: string}>({});
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analyze-clients');
      if (!response.ok) {
        throw new Error('Error al obtener datos');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const runProcessingScript = async () => {
    try {
      setProcessingScript(true);
      const response = await fetch('/api/run-script', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.deployed) {
          // En Vercel - mostrar instrucciones
          alert(`✅ ${result.message}\n\n📝 ${result.note}\n\n${result.instructions.join('\n')}`);
        } else {
          // Local - mostrar éxito
          alert('✅ Script ejecutado exitosamente. Los datos se han actualizado.');
          // Recargar los datos después del procesamiento
          await fetchData();
        }
      } else {
        alert(`❌ Error: ${result.error}\n\nDetalles: ${result.details}`);
      }
    } catch (err) {
      alert(`❌ Error ejecutando script: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setProcessingScript(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleStateChange = (clientName: string, newState: string) => {
    setClientStates(prev => ({
      ...prev,
      [clientName]: newState
    }));
  };

  const filteredClients = data?.clientesAnalizados.filter(client => {
    if (statusFilter === 'Todos') return true;
    const clientState = clientStates[client.nombre] || 'Pendiente';
    return clientState === statusFilter;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando análisis de clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-red-600 text-xl mb-4">Error al cargar datos</div>
            <button 
              onClick={fetchData}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { segmentacion, resumen } = data;

  // Preparar datos para el gráfico de segmentación
  const segmentacionData = [
    { name: 'Cuentas Chicas (1K-7K kg)', value: resumen.cuentasChicas, color: '#F59E0B' },
    { name: 'Cuentas Medianas (7K-12K kg)', value: resumen.cuentasMedianas, color: '#10B981' },
    { name: 'Cuentas Grandes (+12K kg)', value: resumen.cuentasGrandes, color: '#3B82F6' }
  ];

  // Preparar datos para el gráfico de top 10 clientes
  const allClients = [
    ...segmentacion.cuentasGrandes,
    ...segmentacion.cuentasMedianas, 
    ...segmentacion.cuentasChicas
  ];
  
  const top10Clientes = allClients
    .sort((a, b) => b.kgTotal - a.kgTotal)
    .slice(0, 10);

  const getSelectedClients = () => {
    let clients: ClientData[] = [];
    
    switch (selectedSegment) {
      case 'chicas':
        clients = segmentacion.cuentasChicas;
        break;
      case 'medianas':
        clients = segmentacion.cuentasMedianas;
        break;
      case 'grandes':
        clients = segmentacion.cuentasGrandes;
        break;
      default:
        clients = [];
    }
    
    // Ordenar por kgTotal según el sortOrder
    return clients.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.kgTotal - a.kgTotal; // Mayor a menor
      } else {
        return a.kgTotal - b.kgTotal; // Menor a mayor
      }
    });
  };

  const formatKg = (kg: number) => {
    return new Intl.NumberFormat('es-AR').format(kg);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis de Clientes</h1>
            <p className="text-gray-600">Segmentación y análisis de clientes por volumen</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al Home
            </Link>
            <button
              onClick={runProcessingScript}
              disabled={processingScript}
              className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                processingScript
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {processingScript ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Procesar PDFs
                </>
              )}
            </button>
            <a
              href="https://airtable.com/appwpptQ5YsSKUlKH/tblVsih979diW8VX4/viwgGXi3J2Ld8g8k9"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ir a Airtable
            </a>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{resumen.totalClientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Kg</p>
                <p className="text-2xl font-bold text-gray-900">{formatKg(resumen.totalKg)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Promedio Kg</p>
                <p className="text-2xl font-bold text-gray-900">{formatKg(Math.round(resumen.promedioKg))}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cuentas Grandes</p>
                <p className="text-2xl font-bold text-gray-900">{resumen.cuentasGrandes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de segmentación */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Segmentación por Volumen</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentacionData}
                    cx="50%"
                    cy="40%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {segmentacionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={60}
                    layout="horizontal"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de top 10 clientes */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top 10 Clientes por Volumen</h3>
            <div className="h-80">
              {top10Clientes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10Clientes} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${formatKg(Number(value))} kg`, 'Kg Total']} />
                    <Bar dataKey="kgTotal" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No hay datos para mostrar
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de análisis por segmento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis por Segmento</h3>
            
            {/* Filtro de Estado */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Estado:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Ya tiene vendedor">Ya tiene vendedor</option>
                <option value="Ya tiene proveedor">Ya tiene proveedor</option>
                <option value="En proceso">En proceso</option>
                <option value="Cerrado">Cerrado</option>
              </select>
              
              {/* Estadísticas por Estado */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  Pendiente: {filteredClients.filter(c => (clientStates[c.nombre] || 'Pendiente') === 'Pendiente').length}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Con Vendedor: {filteredClients.filter(c => clientStates[c.nombre] === 'Ya tiene vendedor').length}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  Con Proveedor: {filteredClients.filter(c => clientStates[c.nombre] === 'Ya tiene proveedor').length}
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  En Proceso: {filteredClients.filter(c => clientStates[c.nombre] === 'En proceso').length}
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                  Cerrados: {filteredClients.filter(c => clientStates[c.nombre] === 'Cerrado').length}
                </span>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedSegment('chicas')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSegment === 'chicas'
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cuentas Chicas (1K-7K kg)
              </button>
              <button
                onClick={() => setSelectedSegment('medianas')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSegment === 'medianas'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cuentas Medianas (7K-12K kg)
              </button>
              <button
                onClick={() => setSelectedSegment('grandes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSegment === 'grandes'
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cuentas Grandes (+12K kg)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-b-lg">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    CLIENTE
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    LOCALIDAD
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    KG TOTAL
                    <button
                      onClick={toggleSortOrder}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    ESTADO
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                    VIAJES
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                    DOCS
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    FECHA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((cliente, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.localidad}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatKg(cliente.kgTotal)} kg</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <select
                        value={clientStates[cliente.nombre] || 'Pendiente'}
                        onChange={(e) => handleStateChange(cliente.nombre, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Ya tiene vendedor">Ya tiene vendedor</option>
                        <option value="Ya tiene proveedor">Ya tiene proveedor</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.viajes}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.documentos}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.fechaUltima}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 