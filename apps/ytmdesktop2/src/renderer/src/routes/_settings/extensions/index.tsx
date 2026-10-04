import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_settings/extensions/")({
	beforeLoad: () => {
		throw redirect({ to: "/extensions/general" });
	},
	component: () => null,
});
