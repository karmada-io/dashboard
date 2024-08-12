import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetNamespaces } from '@/services/namespace.ts';
import { DataSelectQuery } from '@/services/base.ts';

const useNamespace = (props: { nsFilter?: DataSelectQuery }) => {
  const { nsFilter = {} } = props;
  const {
    data: nsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['GetNamespaces', nsFilter],
    queryFn: async () => {
      const response = await GetNamespaces(nsFilter);
      return response.data || {};
    },
  });
  const nsOptions = useMemo(() => {
    if (!nsData?.namespaces) return [];
    return nsData.namespaces.map((item) => {
      return {
        title: item.objectMeta.name,
        value: item.objectMeta.name,
      };
    });
  }, [nsData]);
  return {
    nsOptions,
    isNsDataLoading: isLoading,
    refetchNsData: refetch,
  };
};

export default useNamespace;
