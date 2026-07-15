// Redirect to editor with 'new' sentinel
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: () => <Navigate to="/admin/products/$id" params={{ id: "new" }} replace />,
});
