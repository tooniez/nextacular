import useSWR from 'swr';

const useRevenueDashboard = (workspaceSlug, fromDate, toDate) => {
  const params = new URLSearchParams({
    workspaceSlug,
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
  });
  
  const apiRoute = workspaceSlug ? `/api/dashboard/revenue?${params.toString()}` : null;
  const { data, error, mutate } = useSWR(apiRoute, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    ...data,
    totals: data?.data?.totals || {
      sessionsCount: 0,
      totalKwh: 0,
      grossRevenue: 0,
      subCpoEarnings: 0,
      msFees: 0,
      avgPricePerKwh: 0,
    },
    timeSeries: data?.data?.timeSeries || [],
    topStations: data?.data?.topStations || [],
    operational: data?.data?.operational || {
      activeStationsCount: 0,
      offlineStationsCount: 0,
      connectorsCount: 0,
    },
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useRevenueDashboard;
