import type { RendererPluginRegistration } from "./world0/types";

const IDLE_TIMEOUT_MS = 5_000;
const PAUSE_REQUEST_TIMEOUT_MS = 5_000;
const APP_SELECTOR = "ytmusic-app";
const POPUP_CONTAINER_SELECTOR = "ytmusic-popup-container";
const STILL_WATCHING_NODE_NAME = "YTMUSIC-YOU-THERE-RENDERER";
const SETTING_KEY = "plugins.youtube-non-stop.enabled";

type NonStopVideo = HTMLVideoElement & {
	ytmdYoutubeNonStopPause?: () => void;
};

type MediaSessionWithNonStopHandler = MediaSession & {
	ytmdYoutubeNonStopSetActionHandler?: MediaSession["setActionHandler"];
};

let updateEnabled: ((enabled: boolean) => void) | null = null;

const youtubeNonStopRenderer: RendererPluginRegistration = {
	id: "youtube-non-stop",
	enabled: true,
	start(ctx) {
		let enabled = true;
		let lastInteractionTime = Date.now();
		let pauseRequested = false;
		let pauseRequestedTimeout: number | null = null;
		let videoElement: NonStopVideo | null = null;
		let appObserver: MutationObserver | null = null;
		let startupObserver: MutationObserver | null = null;

		const isIdle = () => Date.now() - lastInteractionTime >= IDLE_TIMEOUT_MS;

		const loadEnabled = async () => {
			try {
				const value = await ctx.ytmd?.settings.get(SETTING_KEY);
				if (typeof value === "boolean") enabled = value;
			} catch (error) {
				ctx.log.warn("failed to read YouTube NonStop setting", error);
			}
		};

		const clearPauseRequestTimeout = () => {
			if (pauseRequestedTimeout !== null) {
				window.clearTimeout(pauseRequestedTimeout);
				pauseRequestedTimeout = null;
			}
		};

		const clearPauseRequest = () => {
			pauseRequested = false;
			clearPauseRequestTimeout();
		};

		updateEnabled = (value) => {
			enabled = value;
			if (!enabled) clearPauseRequest();
		};

		const pauseVideo = () => {
			videoElement?.ytmdYoutubeNonStopPause?.();
			clearPauseRequest();
		};

		const processInteraction = () => {
			if (!enabled) return;
			if (pauseRequested) {
				pauseVideo();
				return;
			}
			lastInteractionTime = Date.now();
		};

		const keepMediaPauseKeyHonest = () => {
			const mediaSession = navigator.mediaSession as MediaSessionWithNonStopHandler | undefined;
			if (!mediaSession || mediaSession.ytmdYoutubeNonStopSetActionHandler) return;

			const originalSetActionHandler = mediaSession.setActionHandler.bind(mediaSession);
			mediaSession.ytmdYoutubeNonStopSetActionHandler = originalSetActionHandler;

			try {
				originalSetActionHandler("pause", pauseVideo);
			} catch {
				return;
			}

			mediaSession.setActionHandler = (action, handler) => {
				if (action === "pause") {
					ctx.log.debug("blocked YouTube Music from replacing the pause media key handler");
					return;
				}
				originalSetActionHandler(action, handler);
			};
		};

		const overrideVideoPause = () => {
			const currentVideoElement = document.querySelector("video") as NonStopVideo | null;
			if (!currentVideoElement || currentVideoElement.ytmdYoutubeNonStopPause) return;

			videoElement = currentVideoElement;
			videoElement.ytmdYoutubeNonStopPause = videoElement.pause.bind(videoElement);
			videoElement.pause = () => {
				if (!enabled) {
					videoElement?.ytmdYoutubeNonStopPause?.();
					return;
				}
				if (!isIdle()) {
					pauseVideo();
					return;
				}

				pauseRequested = true;
				clearPauseRequestTimeout();
				pauseRequestedTimeout = window.setTimeout(clearPauseRequest, PAUSE_REQUEST_TIMEOUT_MS);
			};

			keepMediaPauseKeyHonest();
		};

		const closeStillWatchingPopup = () => {
			document.querySelector<HTMLElement>(POPUP_CONTAINER_SELECTOR)?.click();
			pauseVideo();
			videoElement?.play().catch(() => undefined);
		};

		const handlePopupOpened = (event: Event) => {
			const detail = (event as CustomEvent<{ nodeName?: string }>).detail;
			if (!enabled || !isIdle() || detail?.nodeName !== STILL_WATCHING_NODE_NAME) return;
			closeStillWatchingPopup();
		};

		const observeApp = (): boolean => {
			const app = document.querySelector(APP_SELECTOR);
			if (!app) return false;

			overrideVideoPause();
			appObserver = new MutationObserver(overrideVideoPause);
			appObserver.observe(app, { childList: true, subtree: true });
			return true;
		};

		const onPointerDown = processInteraction;
		const onPointerUp = processInteraction;
		const pointerEventName = window.PointerEvent ? "pointer" : "mouse";
		document.addEventListener(`${pointerEventName}down`, onPointerDown, true);
		document.addEventListener(`${pointerEventName}up`, onPointerUp, true);
		document.addEventListener("keydown", processInteraction, true);
		document.addEventListener("keyup", processInteraction, true);
		document.addEventListener("yt-popup-opened", handlePopupOpened);

		if (!observeApp()) {
			startupObserver = new MutationObserver(() => {
				if (!observeApp()) return;
				startupObserver?.disconnect();
				startupObserver = null;
			});
			startupObserver.observe(document.documentElement, { childList: true, subtree: true });
		}

		ctx.log.debug("monitoring YouTube Music for the still-watching confirmation");
		void loadEnabled();

		return () => {
			document.removeEventListener(`${pointerEventName}down`, onPointerDown, true);
			document.removeEventListener(`${pointerEventName}up`, onPointerUp, true);
			document.removeEventListener("keydown", processInteraction, true);
			document.removeEventListener("keyup", processInteraction, true);
			document.removeEventListener("yt-popup-opened", handlePopupOpened);
			startupObserver?.disconnect();
			appObserver?.disconnect();
			clearPauseRequest();
			updateEnabled = null;
		};
	},
	async onConfigChange(key, value, ctx) {
		if (key !== SETTING_KEY || typeof value !== "boolean") return;
		updateEnabled?.(value);
		ctx.log.debug(`YouTube NonStop ${value ? "enabled" : "disabled"}`);
	},
};

export default youtubeNonStopRenderer;
