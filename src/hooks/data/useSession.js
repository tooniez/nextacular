import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const useSession = (sessionId, workspaceSlug) => {
  // Always call useSWR - use null key if conditions not met
  const apiRoute = sessionId && workspaceSlug 
    ? `/api/sessions/${sessionId}?workspaceSlug=${workspaceSlug}` 
    : null;
  
  const { data, error, mutate } = useSWR(apiRoute, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    session: data?.data || null,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useSession;
