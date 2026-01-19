import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminTrendPage() {
  // This page is accessible at /account for super admin (as per menu config)
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    stationId: 'all',
    period: 'lastYear',
  });

  const queryParams = new URLSearchParams({
    stationId: filters.stationId,
    period: filters.period,
  });

  const { data, error, isLoading } = useSWR(
    isSuperAdmin ? `/api/admin/trend?${queryParams}` : null,
    fetcher
  );

  // Get stations for filter
  const { data: stationsData } = useSWR(
    isSuperAdmin ? '/api/admin/stations?page=1&pageSize=1000' : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const trendData = data?.data || [];
  const totals = data?.totals || { totalValue: 0, totalCount: 0 };
  const stations = stationsData?.data || [];

  // Calculate max values for Y-axis
  const maxValue = trendData.length > 0 
    ? Math.max(...trendData.map(d => d.value)) * 1.1 
    : 100;
  const maxCount = trendData.length > 0 
    ? Math.max(...trendData.map(d => d.count)) * 1.1 
    : 10;

  // Format currency for tooltip
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name === 'value' ? (
                <>Valore: {formatCurrency(entry.value)}</>
              ) : (
                <>Numero: {entry.value}</>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AccountLayout>
      <Meta title="Andamento - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Andamento</h1>
            <p className="text-gray-600 mt-1">Visualizza le tendenze delle ricariche nel tempo</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[250px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stazione di Ricarica
                </label>
                <select
                  value={filters.stationId}
                  onChange={(e) => handleFilterChange('stationId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutte le Stazioni di Ricarica</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.ocppId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo
                </label>
                <select
                  value={filters.period}
                  onChange={(e) => handleFilterChange('period', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="last7d">Ultimi 7 Giorni</option>
                  <option value="lastMonth">Ultimo Mese</option>
                  <option value="lastYear">Ultimo Anno</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Charts */}
        {isLoading ? (
          <Card>
            <Card.Body>
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento dati...</p>
              </div>
            </Card.Body>
          </Card>
        ) : error ? (
          <Card>
            <Card.Body>
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento dei dati
              </div>
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* Valore Ricariche Chart */}
            <Card className="mb-6">
              <Card.Header>
                <h2 className="text-xl font-bold text-gray-900">Valore Ricariche</h2>
              </Card.Header>
              <Card.Body>
                {trendData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nessun dato disponibile per il periodo selezionato
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="dateFormatted"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis
                        domain={[0, maxValue]}
                        tickFormatter={(value) => formatCurrency(value)}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        name="value"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>

            {/* Numero Ricariche Chart */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-bold text-gray-900">Numero Ricariche</h2>
              </Card.Header>
              <Card.Body>
                {trendData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nessun dato disponibile per il periodo selezionato
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="dateFormatted"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis
                        domain={[0, maxCount]}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name="count"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </div>
    </AccountLayout>
  );
}
