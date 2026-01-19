import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const useAdminPayouts = (filters = {}, enabled = true) => {
  const isEnabled = Boolean(enabled);
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

  const apiRoute = isEnabled ? `/api/admin/payouts?${params.toString()}` : null;

  const { data, error, mutate } = useSWR(apiRoute, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    payouts: data?.data || [],
    pagination: data?.pagination || {},
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useAdminPayouts;

