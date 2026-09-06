import { useQuery } from "@/shared/lib/query";
import { unitsApi } from '../api/units.api'; 

export const useUnits = () => {
  return useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
     
  });
};