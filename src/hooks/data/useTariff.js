import useSWR from 'swr';

const useTariff = (workspaceSlug, tariffId) => {
  const apiRoute = tariffId && workspaceSlug
    ? `/api/tariffs/${tariffId}?workspaceSlug=${workspaceSlug}`
    : null;
  const { data, error, mutate } = useSWR(apiRoute);

  return {
    tariff: data?.data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTariff;
