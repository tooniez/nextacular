import useSWR from 'swr';

const useStation = (workspaceSlug, stationId) => {
  const apiRoute = stationId && workspaceSlug
    ? `/api/stations/${stationId}?workspaceSlug=${workspaceSlug}`
    : null;
  const { data, error, mutate } = useSWR(apiRoute);

  return {
    station: data?.data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useStation;
