import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
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
import toast from 'react-hot-toast';
import { 
  TrashIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminSystemInfoPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    period: 'last3months',
  });

  const queryParams = new URLSearchParams({
    period: filters.period,
  });

  const { data, error, isLoading } = useSWR(
    isSuperAdmin ? `/api/admin/system-info?${queryParams}` : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler cancellare tutte le informazioni di sistema? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/system-info', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('System Info cancellato con successo');
      }
    } catch (error) {
      toast.error('Errore durante la cancellazione');
    }
  };

  const systemData = data?.data || {};
  const timeSeries = systemData.timeSeries || [];
  const current = systemData.current || { cpu: 0, memory: 0, disk: 0 };

  // Calculate max values for Y-axis
  const maxCpu = timeSeries.length > 0 
    ? Math.max(...timeSeries.map(d => d.cpu)) * 1.1 
    : 100;
  const maxMemory = timeSeries.length > 0 
    ? Math.max(...timeSeries.map(d => d.memory)) * 1.1 
    : 100;
  const maxDisk = timeSeries.length > 0 
    ? Math.max(...timeSeries.map(d => d.disk)) * 1.1 
    : 100;

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name === 'cpu' ? 'CPU' : entry.name === 'memory' ? 'Memoria' : 'Disco'}: {entry.value.toFixed(2)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AccountLayout>
      <Meta title="System Info - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ComputerDesktopIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">System Info</h1>
          </div>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            Cancella System Info
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo
                </label>
                <select
                  value={filters.period}
                  onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="lastWeek">Ultima Settimana</option>
                  <option value="lastMonth">Ultimo Mese</option>
                  <option value="last3months">Ultimi 3 Mesi</option>
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
            {/* CPU Usage Chart */}
            <Card className="mb-6">
              <Card.Header>
                <h2 className="text-xl font-bold text-gray-900">Utilizzo CPU</h2>
              </Card.Header>
              <Card.Body>
                {timeSeries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={timeSeries}
                      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
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
                        domain={[0, maxCpu]}
                        tickFormatter={(value) => `${value}%`}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCpu)"
                        name="cpu"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>

            {/* Memory Usage Chart */}
            <Card className="mb-6">
              <Card.Header>
                <h2 className="text-xl font-bold text-gray-900">Utilizzo Memoria</h2>
              </Card.Header>
              <Card.Body>
                {timeSeries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={timeSeries}
                      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
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
                        domain={[0, maxMemory]}
                        tickFormatter={(value) => `${value}%`}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="memory"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorMemory)"
                        name="memory"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>

            {/* Disk Usage Chart */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-bold text-gray-900">Occupazione Disco</h2>
              </Card.Header>
              <Card.Body>
                {timeSeries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nessun dato disponibile
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={timeSeries}
                      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
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
                        domain={[0, maxDisk]}
                        tickFormatter={(value) => `${value}%`}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="disk"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorDisk)"
                        name="disk"
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
