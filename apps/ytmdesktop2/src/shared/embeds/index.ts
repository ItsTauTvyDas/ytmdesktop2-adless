export type { EmbedHttpClientOptions } from "./client/http";
export { createEmbedHttpClient } from "./client/http";
export type { EmbedFlags, EmbedLayout, EmbedUrlOptions } from "./flags";
export {
	buildNowPlayingEmbedUrl,
	defaultEmbedFlags,
	parseEmbedFlags,
	parseEmbedToken,
	serializeEmbedFlags,
} from "./flags";
export { buildApiThumbnailUrl, mapTrackToViewModel, withApiThumbnail } from "./map";
export type { EmbedColorKey, EmbedExtendedConfig, EmbedTextKey, EmbedTheme } from "./theme";
export {
	defaultEmbedTheme,
	EMBED_ACCENT,
	EMBED_COLOR_DEFAULTS,
	EMBED_EXTENDED_SETTINGS_KEY,
	EMBED_IDLE_IMAGE_PATH,
	EMBED_RADIUS_DEFAULTS,
	EMBED_RADIUS_MAX,
	EMBED_TEXT_DEFAULTS,
	isFileUrl,
	progressColor,
	resolveEmbedText,
	resolveEmbedTheme,
} from "./theme";
export type { EmbedStateLike, EmbedTrackLike, NowPlayingViewModel } from "./types";
export type { NowPlayingWidgetProps } from "./widgets/now-playing";
export { NowPlayingWidget } from "./widgets/now-playing";
