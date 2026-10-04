import { createElement, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createEmbedHttpClient, type EmbedStatusSignal } from "../client/http";
import { parseEmbedFlags, parseEmbedToken } from "../flags";
import { type EmbedExtendedConfig, resolveEmbedTheme } from "../theme";
import type { NowPlayingViewModel } from "../types";
import { NowPlayingWidget } from "../widgets/now-playing";

const CONFIG_POLL_MS = 3000;

function useExtendedConfig(token: string | null): EmbedExtendedConfig | null {
	const [config, setConfig] = useState<EmbedExtendedConfig | null>(null);

	useEffect(() => {
		let stopped = false;
		const url = new URL("/embed/config", `${window.location.protocol}//${window.location.host}`);
		if (token) url.searchParams.set("token", token);

		const load = async () => {
			try {
				const res = await fetch(url.toString(), { cache: "no-store" });
				if (!res.ok || stopped) return;
				const next = (await res.json()) as EmbedExtendedConfig | null;
				if (stopped) return;
				// Replace only on change so the theme memo stays stable between polls.
				setConfig((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
			} catch {
				/* API down, keep whatever we already have */
			}
		};

		void load();
		const timer = window.setInterval(() => void load(), CONFIG_POLL_MS);
		return () => {
			stopped = true;
			clearInterval(timer);
		};
	}, [token]);

	return config;
}

function App() {
	const params = new URLSearchParams(window.location.search);
	const flags = parseEmbedFlags(params);
	const token = parseEmbedToken(params);
	const [track, setTrack] = useState<NowPlayingViewModel | null>(null);
	const [signal, setSignal] = useState<EmbedStatusSignal | null>("connecting");
	const extended = useExtendedConfig(token);

	useEffect(() => {
		const fill = flags.layout === "fullscreen";
		const bg = fill ? "#0a0a0c" : flags.transparent ? "transparent" : "#0c0c0e";
		document.documentElement.style.background = bg;
		document.body.style.background = bg;
		document.body.style.margin = "0";
		document.body.style.overflow = "hidden";
		document.documentElement.style.height = fill ? "100%" : "";
		document.body.style.height = fill ? "100%" : "";
		const root = document.getElementById("root");
		if (root) {
			root.style.height = fill ? "100%" : "";
			root.style.width = fill ? "100%" : "";
		}
	}, [flags.transparent, flags.layout]);

	useEffect(() => {
		const baseUrl = `${window.location.protocol}//${window.location.host}`;
		const client = createEmbedHttpClient({
			baseUrl,
			token,
			onTrack: setTrack,
			onStatus: setSignal,
		});
		return () => client.stop();
	}, [token]);

	const status = useMemo(() => {
		if (signal == null) return null;
		if (typeof signal === "object") return signal.error;
		return resolveEmbedTheme(extended).text[signal];
	}, [signal, extended]);

	return createElement(NowPlayingWidget, { track, flags, status, extended });
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(createElement(App));
}
