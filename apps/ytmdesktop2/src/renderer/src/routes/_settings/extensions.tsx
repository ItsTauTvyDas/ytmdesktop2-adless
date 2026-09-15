import { createFileRoute } from "@tanstack/react-router";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

export const Route = createFileRoute("/_settings/extensions")({
	component: ExtensionsSettingsPage,
});

function ExtensionsSettingsPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Extensions</CardTitle>
				<CardDescription>Enable or disable optional services that run in the background. After changing settings, restart the app to take full effect.</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<SettingsCheckbox
						configKey="adblocker.enabled"
						defaultValue={true}
						description="Block ads and trackers on YouTube Music using Ghostery filter lists."
					>
						Ad blocker
					</SettingsCheckbox>
					<SettingsCheckbox
						configKey="plugins.youtube-non-stop.enabled"
						defaultValue={true}
						description="Prevent YouTube Music from pausing playback after the window has been idle."
					>
						YouTube NonStop
					</SettingsCheckbox>
				</FieldGroup>
			</CardContent>
		</Card>
	);
}
