import { createFileRoute } from "@tanstack/react-router";
import { SettingsCheckbox } from "@/components/settings-checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { useSettingsState } from "@/hooks/use-settings";

export const Route = createFileRoute("/_settings/extensions/trayview")({
    component: TrayViewSettingsPage,
});

const OPACITY_MIN_PERCENT = 30;
const OPACITY_MAX_PERCENT = 100;
const OPACITY_STEP_PERCENT = 5;

function TrayViewSettingsPage() {
    const [opacity, setOpacity, { isPending: opacityPending }] = useSettingsState("trayView.opacity", 1);
    const percent = Math.round(opacity * 100);

    const setOpacityPercent = (raw: number) => {
        const stepped = Math.round(raw / OPACITY_STEP_PERCENT) * OPACITY_STEP_PERCENT;
        const clamped = Math.min(OPACITY_MAX_PERCENT, Math.max(OPACITY_MIN_PERCENT, stepped));
        setOpacity(clamped / 100);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tray View</CardTitle>
                <CardDescription>Behavior and appearance of the compact now-playing popup.</CardDescription>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    <Field>
                        <div className="flex items-center justify-between gap-4">
                            <FieldLabel htmlFor="trayview-opacity">Window opacity</FieldLabel>
                            <span className="tabular-nums text-sm text-muted-foreground">{percent}%</span>
                        </div>
                        <Slider
                            id="trayview-opacity"
                            min={OPACITY_MIN_PERCENT}
                            max={OPACITY_MAX_PERCENT}
                            step={OPACITY_STEP_PERCENT}
                            disabled={opacityPending}
                            value={[percent]}
                            onValueChange={(value) => {
                                const next = Array.isArray(value) ? value[0] : value;
                                if (typeof next !== "number" || !Number.isFinite(next)) return;
                                setOpacityPercent(next);
                            }}
                        />
                        <FieldDescription>How transparent the tray popup is. With &quot;Dim only on hover&quot; on, this is the hovered opacity.</FieldDescription>
                    </Field>
                    <SettingsCheckbox
                        configKey="trayView.clickThrough"
                        defaultValue={false}
                        description="Let clicks pass through the tray popup. Hold Alt while the pointer is over it to use its controls."
                    >
                        Click-through
                    </SettingsCheckbox>
                    <SettingsCheckbox
                        configKey="trayView.applyOpacityOnHover"
                        defaultValue={false}
                        description="Fades the tray popup to the opacity above while the mouse is over it, and back to fully visible when it leaves. Holding Alt keeps it fully visible."
                    >
                        Dim only on hover
                    </SettingsCheckbox>
                </FieldGroup>
            </CardContent>
        </Card>
    );
}
