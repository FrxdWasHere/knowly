import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch the next route's chunk + data on hover/focus so clicks feel instant.
    defaultPreload: "intent",
    defaultPreloadDelay: 80,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
