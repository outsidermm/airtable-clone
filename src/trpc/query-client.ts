import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Differentiated staleTime per query type
        staleTime: (query) => {
          const queryKey = query.queryKey[0];
          if (typeof queryKey === "string") {
            // Static metadata: cache for 5 minutes
            if (["table.getById", "table.getAllByBase"].includes(queryKey))
              return 5 * 60 * 1000;
            // Dynamic data: cache for 30 seconds
            if (["row.getRows", "view.getData"].includes(queryKey))
              return 30 * 1000;
            // Search results: cache for 10 seconds
            if (queryKey.includes("search")) return 10 * 1000;
          }
          return 30 * 1000; // Default
        },
        gcTime: 10 * 60 * 1000, // Keep unused data for 10 minutes
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
