import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../api/employees';

export const useEmployeeName = hash => {
  return useQuery({
    queryKey: ['employee', hash],
    queryFn: () => employeesApi.getByHash(hash),
    enabled: !!hash,
    staleTime: 1000 * 60 * 15,
  });
};
