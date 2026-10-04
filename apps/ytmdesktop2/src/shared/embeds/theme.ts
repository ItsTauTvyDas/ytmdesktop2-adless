export interface EmbedExtendedConfig {
	readonly text?: Partial<Record<EmbedTextKey, string>>;
	readonly color?: Partial<Record<EmbedColorKey, string>>;
	readonly radius?: { readonly art?: number; readonly progress?: number };
	readonly idleImage?: string;
}

export const EMBED_EXTENDED_SETTINGS_KEY = "embeds.nowPlaying.extended";

export type EmbedTextKey = "idle" | "artPlaceholder" | "connecting" | "reconnecting" | "disconnected" | "unauthorized";
export type EmbedColorKey = "title" | "artist" | "startTime" | "endTime" | "progress";

export const EMBED_TEXT_DEFAULTS: Record<EmbedTextKey, string> = {
	idle: "Nothing playing",
	artPlaceholder: "YTM",
	connecting: "Connecting…",
	reconnecting: "Reconnecting…",
	disconnected: "Disconnected",
	unauthorized: "Unauthorized — check token",
};

export const EMBED_ACCENT = "accent";

export const EMBED_COLOR_DEFAULTS: Record<EmbedColorKey, string> = {
	title: "#f4f4f5",
	artist: "rgba(244,244,245,0.55)",
	startTime: "rgba(244,244,245,0.35)",
	endTime: "rgba(244,244,245,0.55)",
	progress: EMBED_ACCENT,
};

export const EMBED_RADIUS_DEFAULTS = { art: 8, progress: 12 } as const;
export const EMBED_RADIUS_MAX = { art: 32, progress: 12 } as const;

export interface EmbedTheme {
	readonly text: Readonly<Record<EmbedTextKey, string | null>>;
	readonly color: Readonly<Record<EmbedColorKey, string>>;
	readonly radius: { readonly art: number; readonly progress: number };
	readonly idleImage: string | null;
}

export function resolveEmbedText(raw: string | undefined | null, fallback: string): string | null {
	if (raw == null || raw === "") return fallback;
	if (raw.trim() === "") return null;
	return raw;
}

function resolveColor(raw: string | undefined | null, fallback: string): string {
	const value = raw?.trim();
	return value || fallback;
}

function resolveRadius(raw: number | undefined | null, fallback: number, max: number): number {
	const n = typeof raw === "number" ? raw : Number(raw);
	if (!Number.isFinite(n) || n < 0) return fallback;
	return Math.min(max, Math.round(n));
}

export function resolveEmbedTheme(config: EmbedExtendedConfig | null | undefined): EmbedTheme {
	const text = {} as Record<EmbedTextKey, string | null>;
	for (const key of Object.keys(EMBED_TEXT_DEFAULTS) as EmbedTextKey[]) {
		text[key] = resolveEmbedText(config?.text?.[key], EMBED_TEXT_DEFAULTS[key]);
	}
	const color = {} as Record<EmbedColorKey, string>;
	for (const key of Object.keys(EMBED_COLOR_DEFAULTS) as EmbedColorKey[]) {
		color[key] = resolveColor(config?.color?.[key], EMBED_COLOR_DEFAULTS[key]);
	}
	return {
		text,
		color,
		radius: {
			art: resolveRadius(config?.radius?.art, EMBED_RADIUS_DEFAULTS.art, EMBED_RADIUS_MAX.art),
			progress: resolveRadius(config?.radius?.progress, EMBED_RADIUS_DEFAULTS.progress, EMBED_RADIUS_MAX.progress),
		},
		idleImage: config?.idleImage?.trim() || null,
	};
}

export const EMBED_IDLE_IMAGE_PATH = "/embed/idle-image";

export function isFileUrl(value: string | null | undefined): boolean {
	return !!value && value.startsWith("file://");
}

export function progressColor(theme: EmbedTheme, accent: string): string {
	return theme.color.progress === EMBED_ACCENT ? accent : theme.color.progress;
}

export function defaultEmbedTheme(): EmbedTheme {
	return resolveEmbedTheme(null);
}
