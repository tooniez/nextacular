import useSWR from 'swr';

const useTariffAssignments = (workspaceSlug, stationId) => {
  const apiRoute = stationId && workspaceSlug
    ? `/api/stations/${stationId}/tariff-assignments?workspaceSlug=${workspaceSlug}`
    : null;
  const { data, error, mutate } = useSWR(apiRoute);

  return {
    assignments: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTariffAssignments;
