import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/modules/$moduleId")({
  component: ModuleLayout,
});

function ModuleLayout() {
  return <Outlet />;
}
