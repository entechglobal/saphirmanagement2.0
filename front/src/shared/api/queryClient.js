import { QueryClient } from "@/shared/lib/query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});
