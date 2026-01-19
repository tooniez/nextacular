import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const useSessions = (workspaceSlug, filters = {}) => {
  // Build query string only if workspaceSlug is available
  let apiRoute = null;
  if (workspaceSlug) {
    const params = new URLSearchParams();
    params.append('workspaceSlug', workspaceSlug);
    if (filters.status) params.append('status', filters.status);
    if (filters.stationId) params.append('stationId', filters.stationId);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    apiRoute = `/api/sessions?${params.toString()}`;
  }

  const { data, error, mutate } = useSWR(apiRoute, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    sessions: data?.data?.data || [],
    pagination: data?.data?.pagination || {},
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useSessions;
