import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '../api/units.api'; 

export const useUnits = () => {
  return useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
     
  });
};