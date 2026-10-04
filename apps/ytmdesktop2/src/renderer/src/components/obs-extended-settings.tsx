import {
	EMBED_ACCENT,
	EMBED_COLOR_DEFAULTS,
	EMBED_EXTENDED_SETTINGS_KEY,
	EMBED_RADIUS_DEFAULTS,
	EMBED_RADIUS_MAX,
	EMBED_TEXT_DEFAULTS,
	type EmbedColorKey,
	type EmbedExtendedConfig,
	type EmbedTextKey,
	isFileUrl,
} from "@shared/embeds";
import { useId } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettingsState } from "@/hooks/use-settings";
import { trpc } from "@/lib/trpc";

const KEY = EMBED_EXTENDED_SETTINGS_KEY;
const TYPING_DEBOUNCE = 400;

export function useExtendedEmbedConfig(): EmbedExtendedConfig {
	const utils = trpc.useUtils();
	const [config] = useSettingsState<EmbedExtendedConfig>(KEY, {});

	trpc.settings.onChange.useSubscription(undefined, {
		onData: (ev) => {
			const changed = ev?.key;
			if (typeof changed !== "string") return;
			if (changed !== KEY && !changed.startsWith(`${KEY}.`)) return;
			void utils.settings.get.invalidate({ key: KEY, defaultValue: {} });
		},
	});

	return config ?? {};
}

function ExtendedBadge() {
	return (
		<Badge variant="secondary" className="ml-2 align-middle text-[10px] uppercase">
			Extended
		</Badge>
	);
}

const TEXT_FIELDS: ReadonlyArray<{ key: EmbedTextKey; label: string; description?: string }> = [
	{ key: "idle", label: "Nothing playing", description: "Replaces the song title when no track is loaded." },
	{ key: "artPlaceholder", label: "Album art placeholder", description: "Ignored when an idle image is set." },
	{ key: "connecting", label: "Connecting" },
	{ key: "reconnecting", label: "Reconnecting", description: "Retries every 2 seconds." },
	{ key: "disconnected", label: "Disconnected", description: "Usually means the local API is off." },
	{ key: "unauthorized", label: "Unauthorized", description: "The token in the source URL is missing or invalid." },
];

function TextRow({ field }: { field: (typeof TEXT_FIELDS)[number] }) {
	const id = useId();
	const [value, setValue] = useSettingsState<string>(`${KEY}.text.${field.key}`, "", { debounce: TYPING_DEBOUNCE });
	const hidden = value !== "" && value.trim() === "";

	return (
		<Field orientation="horizontal" className="items-start justify-between gap-4">
			<FieldContent>
				<FieldLabel htmlFor={id}>{field.label}</FieldLabel>
				{field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
			</FieldContent>
			<div className="flex w-[18rem] shrink-0 flex-col gap-1">
				<Input
					id={id}
					value={value}
					placeholder={EMBED_TEXT_DEFAULTS[field.key]}
					spellCheck={false}
					onChange={(e) => setValue(e.target.value)}
				/>
				{hidden ? <span className="text-[10px] text-amber-500">Hidden</span> : null}
			</div>
		</Field>
	);
}

export function ObsLanguageCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Language
					<ExtendedBadge />
				</CardTitle>
				<CardDescription>
					Empty field uses default text. A single space hides the text.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					{TEXT_FIELDS.map((field) => (
						<TextRow key={field.key} field={field} />
					))}
				</FieldGroup>
			</CardContent>
		</Card>
	);
}

const COLOR_FIELDS: ReadonlyArray<{ key: EmbedColorKey; label: string; description?: string; swatch: string }> = [
	{ key: "title", label: "Song title", swatch: "#f4f4f5" },
	{ key: "artist", label: "Song artist", description: "Also used for the idle label and the ticker.", swatch: "#8b8b8f" },
	{ key: "startTime", label: "Elapsed time", swatch: "#595960" },
	{ key: "endTime", label: "Track length", swatch: "#8b8b8f" },
	{ key: "progress", label: "Progress bar", description: "Only the filled part of the bar.", swatch: "#3b82f6" },
];

function isHex(value: string): boolean {
	return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function ColorRow({ field }: { field: (typeof COLOR_FIELDS)[number] }) {
	const id = useId();
	const [value, setValue] = useSettingsState<string>(`${KEY}.color.${field.key}`, "", { debounce: TYPING_DEBOUNCE });
	const accentCapable = field.key === "progress";
	const usesAccent = accentCapable && value.trim() === EMBED_ACCENT;
	const isDefault = value.trim() === "";

	return (
		<Field orientation="horizontal" className="items-start justify-between gap-4">
			<FieldContent>
				<FieldLabel htmlFor={id}>{field.label}</FieldLabel>
				{field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
			</FieldContent>
			<div className="flex w-[18rem] shrink-0 flex-col gap-2">
				{accentCapable ? (
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs text-muted-foreground">Follow album colour</span>
						<Switch checked={usesAccent} onCheckedChange={(on) => setValue(on ? EMBED_ACCENT : field.swatch)} />
					</div>
				) : null}
				{usesAccent ? null : (
					<div className="flex items-center gap-2">
						<input
							id={id}
							type="color"
							aria-label={`${field.label} colour`}
							className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-background"
							value={isHex(value) ? value.trim() : field.swatch}
							onChange={(e) => setValue(e.target.value)}
						/>
						<Input
							className="font-mono text-xs"
							value={value}
							placeholder={EMBED_COLOR_DEFAULTS[field.key]}
							spellCheck={false}
							onChange={(e) => setValue(e.target.value)}
						/>
						<Button type="button" size="sm" variant="ghost" disabled={isDefault} onClick={() => setValue("")}>
							Reset
						</Button>
					</div>
				)}
			</div>
		</Field>
	);
}

export function ObsColorsCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Colours
					<ExtendedBadge />
				</CardTitle>
				<CardDescription>
					App themes do not apply to the browser source. Empty field uses the default colour. Any CSS colour works, including{" "}
					<code className="font-mono text-xs">rgba()</code> for transparency.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					{COLOR_FIELDS.map((field) => (
						<ColorRow key={field.key} field={field} />
					))}
				</FieldGroup>
			</CardContent>
		</Card>
	);
}

function RadiusRow({
	settingKey,
	label,
	description,
	max,
	fallback,
}: {
	settingKey: "embed" | "art" | "progress";
	label: string;
	description?: string;
	max: number;
	fallback: number;
}) {
	const id = useId();
	const [value, setValue] = useSettingsState<number>(`${KEY}.radius.${settingKey}`, fallback);
	const current = typeof value === "number" && Number.isFinite(value) ? value : fallback;
	const isDefault = current === fallback;

	return (
		<Field>
			<div className="flex items-center justify-between gap-4">
				<FieldLabel htmlFor={id}>{label}</FieldLabel>
				<div className="flex items-center gap-2">
					<span className="tabular-nums text-sm text-muted-foreground">{current}px</span>
					<Button type="button" size="sm" variant="ghost" disabled={isDefault} onClick={() => setValue(fallback)}>
						Reset
					</Button>
				</div>
			</div>
			<Slider
				id={id}
				min={0}
				max={max}
				step={1}
				value={[current]}
				onValueChange={(next) => {
					const n = Array.isArray(next) ? next[0] : next;
					if (typeof n !== "number" || !Number.isFinite(n)) return;
					setValue(n);
				}}
			/>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
		</Field>
	);
}

export function ObsShapeCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Shape
					<ExtendedBadge />
				</CardTitle>
				<CardDescription>Corner rounding.</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<RadiusRow
						settingKey="embed"
						label="Embed card rounding"
						max={EMBED_RADIUS_MAX.embed}
						fallback={EMBED_RADIUS_DEFAULTS.embed}
					/>
					<RadiusRow
						settingKey="art"
						label="Album art rounding"
						max={EMBED_RADIUS_MAX.art}
						fallback={EMBED_RADIUS_DEFAULTS.art}
					/>
					<RadiusRow
						settingKey="progress"
						label="Progress bar rounding"
						max={EMBED_RADIUS_MAX.progress}
						fallback={EMBED_RADIUS_DEFAULTS.progress}
					/>
				</FieldGroup>
			</CardContent>
		</Card>
	);
}

export function ObsIdleArtCard() {
	const [image, setImage] = useSettingsState<string>(`${KEY}.idleImage`, "");
	const { mutateAsync: pickImageFile, isLoading: picking } = trpc.app.pickImageFile.useMutation();
	const value = image.trim();
	const hasImage = value !== "";
	const localFile = isFileUrl(value);
	const fileName = localFile ? decodeURIComponent(value.split("/").pop() ?? "") : "";

	const choose = async () => {
		const picked = await pickImageFile();
		if (!picked) return;
		setImage(picked);
		toast.success("Idle image set");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Idle album art
					<ExtendedBadge />
				</CardTitle>
				<CardDescription>Shown in place of the placeholder label when nothing is playing.</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<Field orientation="horizontal" className="items-start justify-between gap-4">
						<FieldContent>
							<FieldLabel>Image</FieldLabel>
							<FieldDescription>Choose a local file or paste a URL. Square images fit best.</FieldDescription>
						</FieldContent>
						<div className="flex w-[18rem] shrink-0 flex-col gap-2">
							<div className="flex items-center gap-2">
								<div
									className="size-12 shrink-0 rounded-md border border-input bg-muted/40 bg-cover bg-center"
									style={hasImage ? { backgroundImage: `url(${value})` } : undefined}
									aria-hidden
								/>
								<Button type="button" size="sm" variant="secondary" disabled={picking} onClick={() => void choose()}>
									Choose file
								</Button>
								<Button type="button" size="sm" variant="ghost" disabled={!hasImage} onClick={() => setImage("")}>
									Clear
								</Button>
							</div>
							<Input
								className="font-mono text-xs"
								value={image}
								placeholder="https://… or file:///…"
								spellCheck={false}
								onChange={(e) => setImage(e.target.value)}
							/>
							{localFile ? <span className="truncate text-[10px] text-muted-foreground">Local file: {fileName}</span> : null}
						</div>
					</Field>
				</FieldGroup>
			</CardContent>
		</Card>
	);
}
