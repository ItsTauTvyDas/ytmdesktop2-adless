import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_settings/extensions")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/extensions" || location.pathname === "/extensions/") {
			throw redirect({ to: "/extensions/general" });
		}
	},
	component: () => <Outlet />,
});
