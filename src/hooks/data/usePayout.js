import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const usePayout = (payoutId, workspaceSlug) => {
  // Always call useSWR - use null key if conditions not met
  const apiRoute = payoutId && workspaceSlug 
    ? `/api/payouts/${payoutId}?workspaceSlug=${workspaceSlug}` 
    : null;
  
  const { data, error, mutate } = useSWR(apiRoute, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    payout: data?.data || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default usePayout;
