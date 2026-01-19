import useSWR from 'swr';

const useWorkspaces = (opts = {}) => {
  const enabled = opts?.enabled !== false;
  const apiRoute = `/api/workspaces`;
  
  const { data, error, mutate } = useSWR(enabled ? `${apiRoute}` : null, {
    refreshInterval: 0, // No auto-refresh
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000, // 10 seconds dedupe
  });
  return {
    ...data,
    isLoading: !error && !data,
    isError: error,
    mutate, // Expose mutate for manual refresh
  };
};

export default useWorkspaces;
