import useSWR from 'swr';

const useConnectors = (workspaceSlug, stationId) => {
  const apiRoute = stationId && workspaceSlug
    ? `/api/stations/${stationId}/connectors?workspaceSlug=${workspaceSlug}`
    : null;
  const { data, error, mutate } = useSWR(apiRoute);

  return {
    connectors: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useConnectors;
