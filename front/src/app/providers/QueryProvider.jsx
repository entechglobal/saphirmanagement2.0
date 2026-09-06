import { QueryClientProvider } from "@/shared/lib/query";
import { queryClient } from "@/shared/api/queryClient";

export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
