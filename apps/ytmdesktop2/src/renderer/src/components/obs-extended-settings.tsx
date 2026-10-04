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

const TEXT_FIELDS: ReadonlyArray<{ key: EmbedTextKey; label: string; description: string }> = [
	{
		key: "idle",
		label: "Nothing playing",
		description: "Replaces the song title whenever no track is loaded. This is what viewers see on a fresh launch, or after you close YouTube Music.",
	},
	{
		key: "artPlaceholder",
		label: "Artwork placeholder",
		description: "The small label drawn inside the empty artwork square. Ignored once a custom idle image is set below.",
	},
	{
		key: "connecting",
		label: "Connecting",
		description: "Shown for the moment the browser source spends opening its connection to the local API.",
	},
	{
		key: "reconnecting",
		label: "Reconnecting",
		description: "Shown after the live connection drops, until it comes back. Retries every 2 seconds.",
	},
	{
		key: "disconnected",
		label: "Disconnected",
		description: "Shown when the socket cannot be opened at all, usually because the local API is off.",
	},
	{
		key: "unauthorized",
		label: "Unauthorized",
		description: "Shown when the API requires a token and the one in the source URL is missing, wrong, or revoked.",
	},
];

function TextRow({ field }: { field: (typeof TEXT_FIELDS)[number] }) {
	const id = useId();
	const [value, setValue] = useSettingsState<string>(`${KEY}.text.${field.key}`, "", { debounce: TYPING_DEBOUNCE });
	const hidden = value !== "" && value.trim() === "";

	return (
		<Field orientation="horizontal" className="items-start justify-between gap-4">
			<FieldContent>
				<FieldLabel htmlFor={id}>{field.label}</FieldLabel>
				<FieldDescription>{field.description}</FieldDescription>
			</FieldContent>
			<div className="flex w-[18rem] shrink-0 flex-col gap-1">
				<Input
					id={id}
					value={value}
					placeholder={EMBED_TEXT_DEFAULTS[field.key]}
					spellCheck={false}
					onChange={(e) => setValue(e.target.value)}
				/>
				{hidden ? <span className="text-[10px] text-amber-500">Hidden, contains only whitespace</span> : null}
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
					Every fixed string the browser source can show. Leave a field <strong>empty</strong> to keep the shipped wording. Type a{" "}
					<strong>single space</strong> to remove that text from the overlay entirely, which is useful for hiding the idle label or the
					connection notices on a clean stream layout.
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

const COLOR_FIELDS: ReadonlyArray<{ key: EmbedColorKey; label: string; description: string; swatch: string }> = [
	{ key: "title", label: "Song title", description: "The track name while something is playing.", swatch: "#f4f4f5" },
	{ key: "artist", label: "Song artist", description: "The line under the title. Also used for the idle label and the ticker.", swatch: "#8b8b8f" },
	{ key: "startTime", label: "Elapsed time", description: "The counter on the left of the progress bar.", swatch: "#595960" },
	{ key: "endTime", label: "Track length", description: "The counter on the right of the progress bar.", swatch: "#8b8b8f" },
	{ key: "progress", label: "Progress bar", description: "The filled part of the bar.", swatch: "#3b82f6" },
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
				<FieldDescription>
					{field.description}
					{isDefault ? " Currently using the shipped colour." : null}
				</FieldDescription>
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
					App themes do not reach the browser source, which renders standalone, so these are the only colours it has. Leave a field empty for
					the shipped colour, or type any CSS colour (hex, <code className="font-mono text-xs">rgba()</code>, a named colour) if you need
					transparency the picker cannot express.
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
	settingKey: "art" | "progress";
	label: string;
	description: string;
	max: number;
	fallback: number;
}) {
	const id = useId();
	const [value, setValue] = useSettingsState<number>(`${KEY}.radius.${settingKey}`, fallback);
	const current = typeof value === "number" && Number.isFinite(value) ? value : fallback;

	return (
		<Field>
			<div className="flex items-center justify-between gap-4">
				<FieldLabel htmlFor={id}>{label}</FieldLabel>
				<span className="tabular-nums text-sm text-muted-foreground">{current}px</span>
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
			<FieldDescription>{description}</FieldDescription>
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
				<CardDescription>Corner rounding for the two elements where it reads at a glance on stream.</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<RadiusRow
						settingKey="art"
						label="Album art rounding"
						description="0 is a hard square, higher values round the cover. At 32 a 64px cover is a circle."
						max={EMBED_RADIUS_MAX.art}
						fallback={EMBED_RADIUS_DEFAULTS.art}
					/>
					<RadiusRow
						settingKey="progress"
						label="Progress bar rounding"
						description="0 is a flat bar. The bar is only a few pixels tall, so anything from about 6 up reads as a full pill."
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
					Idle artwork
					<ExtendedBadge />
				</CardTitle>
				<CardDescription>
					With nothing playing, the cover square is a gradient with the artwork placeholder label on top, and there is no image behind it.
					Set one here to show your own logo instead, and the label is dropped.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<Field orientation="horizontal" className="items-start justify-between gap-4">
						<FieldContent>
							<FieldLabel>Image</FieldLabel>
							<FieldDescription>
								Choose a file on this machine, or paste any URL the browser source can reach. Either way it is stored as a URL. A local file
								is served by the local API, since a browser source cannot load a file path on its own. Square images fit the cover best.
							</FieldDescription>
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
