import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useRevenueDashboard } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';

const RevenueDashboard = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;

  // Date range state
  const [dateRange, setDateRange] = useState('last30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [chartMetric, setChartMetric] = useState('grossRevenue');

  // Calculate date range
  const { fromDate, toDate } = useMemo(() => {
    let to = new Date();
    to.setHours(23, 59, 59, 999);
    
    let from = new Date();
    
    if (dateRange === 'custom' && customFrom && customTo) {
      from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const toCustom = new Date(customTo);
      toCustom.setHours(23, 59, 59, 999);
      return {
        fromDate: from.toISOString().split('T')[0],
        toDate: toCustom.toISOString().split('T')[0],
      };
    }
    
    switch (dateRange) {
      case 'last7d':
        from.setDate(from.getDate() - 7);
        break;
      case 'last30d':
        from.setDate(from.getDate() - 30);
        break;
      case 'thisMonth':
        from = new Date(to.getFullYear(), to.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
        to = new Date(to.getFullYear(), to.getMonth(), 0);
        to.setHours(23, 59, 59, 999);
        break;
      default:
        from.setDate(from.getDate() - 30);
    }
    
    from.setHours(0, 0, 0, 0);
    
    return {
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0],
    };
  }, [dateRange, customFrom, customTo]);

  const { totals, timeSeries, topStations, operational, isLoading } = useRevenueDashboard(
    workspaceSlug,
    fromDate,
    toDate
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Revenue Dashboard" />
        <Content.Title title="Revenue Dashboard" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Revenue Dashboard`} />
      <Content.Title
        title="Revenue Dashboard"
        subtitle="Monitor your charging station revenue and performance"
      />
      <Content.Divider />

      {/* Date Range Selector */}
      <Content.Container>
        <Card>
          <Card.Body>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setDateRange('last7d')}
                    className={dateRange === 'last7d' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    onClick={() => setDateRange('last30d')}
                    className={dateRange === 'last30d' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    onClick={() => setDateRange('thisMonth')}
                    className={dateRange === 'thisMonth' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                  >
                    This Month
                  </Button>
                  <Button
                    onClick={() => setDateRange('lastMonth')}
                    className={dateRange === 'lastMonth' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                  >
                    Last Month
                  </Button>
                  <Button
                    onClick={() => setDateRange('custom')}
                    className={dateRange === 'custom' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Showing data from {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
              </div>
            </div>
          </Card.Body>
        </Card>
      </Content.Container>

      <Content.Divider />

      {/* KPI Cards */}
      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">Gross Revenue</div>
              <div className="text-2xl font-bold mt-2">
                {isLoading ? '...' : formatCurrency(totals.grossRevenue)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Total revenue from charging sessions
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">Sub-CPO Earnings</div>
              <div className="text-2xl font-bold mt-2 text-green-600">
                {isLoading ? '...' : formatCurrency(totals.subCpoEarnings)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Your share after MSolution fees
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">MSolution Fees</div>
              <div className="text-2xl font-bold mt-2 text-blue-600">
                {isLoading ? '...' : formatCurrency(totals.msFees)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Platform fees retained by MSolution
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">Total kWh</div>
              <div className="text-2xl font-bold mt-2">
                {isLoading ? '...' : formatNumber(totals.totalKwh)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Energy delivered
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">Sessions</div>
              <div className="text-2xl font-bold mt-2">
                {isLoading ? '...' : formatNumber(totals.sessionsCount)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Completed charging sessions
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="text-sm font-medium text-gray-500">Avg Price per kWh</div>
              <div className="text-2xl font-bold mt-2">
                {isLoading ? '...' : formatCurrency(totals.avgPricePerKwh)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Average revenue per kWh
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>

      <Content.Divider />

      {/* Time Series Chart/Table */}
      <Content.Container>
        <Card>
          <Card.Body>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Revenue Trend</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setChartMetric('grossRevenue')}
                  className={chartMetric === 'grossRevenue' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                >
                  Revenue
                </Button>
                <Button
                  onClick={() => setChartMetric('kwh')}
                  className={chartMetric === 'kwh' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                >
                  kWh
                </Button>
                <Button
                  onClick={() => setChartMetric('subCpoEarnings')}
                  className={chartMetric === 'subCpoEarnings' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                >
                  Earnings
                </Button>
                <Button
                  onClick={() => setChartMetric('msFees')}
                  className={chartMetric === 'msFees' ? 'bg-blue-600 text-white' : 'border border-gray-300'}
                >
                  Fees
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-gray-400">Loading chart data...</div>
              </div>
            ) : timeSeries.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-gray-400">No data available for selected period</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        kWh
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {timeSeries.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(day.grossRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatCurrency(day.subCpoEarnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {formatCurrency(day.msFees)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatNumber(day.kwh)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {day.sessionsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Content.Container>

      <Content.Divider />

      {/* Top Stations & Operational */}
      <Content.Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Stations */}
          <Card>
            <Card.Body title="Top Stations">
              {isLoading ? (
                <div className="text-gray-400">Loading...</div>
              ) : topStations.length === 0 ? (
                <div className="text-gray-400">No stations with sessions in this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Station
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Sessions
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          kWh
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {topStations.map((station) => (
                        <tr key={station.stationId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2 text-sm font-medium">
                            {station.stationName}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {station.sessionsCount}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {formatNumber(station.totalKwh)}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(station.grossRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Operational Metrics */}
          <Card>
            <Card.Body title="Operational Status">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Active Stations</div>
                  <div className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : operational.activeStationsCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Stations in your workspace
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Offline Stations</div>
                  <div className="text-2xl font-bold mt-1 text-red-600">
                    {isLoading ? '...' : operational.offlineStationsCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Stations currently offline
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Total Connectors</div>
                  <div className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : operational.connectorsCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Available charging ports
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default RevenueDashboard;
