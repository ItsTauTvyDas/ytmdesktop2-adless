import { ElectronBlocker, fetchLists, fetchResources, fullLists } from "@ghostery/adblocker-electron";
import { AfterInit, BaseProvider, BeforeStart, OnDestroy } from "@main/core/baseProvider";
import type SettingsProvider from "@main/trpc/routers/settings/service";
import { createHash } from "crypto";
import { app, type Session, type WebContentsView } from "electron";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { join } from "path";

const MAX_DOWNLOAD_ATTEMPTS = 10;
const RETRY_DELAY_CACHED_MS = 2 * 60 * 1000;
const RETRY_DELAY_UNCACHED_MS = 30 * 1000;

type CacheMeta = { hash: string; savedAt: number };

const checkedFetch = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
	return response;
};

export default class AdblockerProvider extends BaseProvider implements BeforeStart, AfterInit, OnDestroy {
	private blocker: ElectronBlocker | null = null;
	private blockerHash: string | null = null;
	private activeSession: Session | null = null;
	private downloadAttempts = 0;
	private retryTimer: NodeJS.Timeout | null = null;
	private settingsListenerBound = false;

	constructor() {
		super("adblocker");
	}

	get settingsInstance(): SettingsProvider {
		return this.getProvider("settings");
	}

	private get isEnabled(): boolean {
		return this.settingsInstance.get<boolean>("adblocker.enabled", true) !== false;
	}

	private get cacheDir() {
		return join(app.getPath("userData"), "adblocker");
	}

	private get enginePath() {
		return join(this.cacheDir, "engine.bin");
	}

	private get metaPath() {
		return join(this.cacheDir, "meta.json");
	}

	private status(message: string, ...args: unknown[]) {
		this.logger.warn(message, ...args);
	}

	async BeforeStart() {
		const cached = await this.loadCachedEngine();
		if (cached) {
			void this.tryDownload();
			return;
		}
		await this.tryDownload();
	}

	async AfterInit() {
		if (this.settingsListenerBound) return;
		this.settingsListenerBound = true;
		this.settingsInstance.onSettingChange(
			"adblocker.enabled",
			(value) => {
				if (value) this.attachToYoutubeView();
				else this.disable();
			},
			{ debounce: 500 },
		);
	}

	OnDestroy() {
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.retryTimer = null;
	}

	/** Call from WindowManager after youtube view exists, before loadURL. */
	attachToYoutubeView(view?: WebContentsView | null) {
		const target = view ?? this.views?.youtubeView;
		if (!target?.webContents || target.webContents.isDestroyed()) {
			this.status("Adblocker: youtube view not ready");
			return false;
		}
		return this.attachToSession(target.webContents.session);
	}

	attachToSession(session: Session): boolean {
		if (!this.isEnabled) {
			this.status("Adblocker disabled via settings");
			return false;
		}
		if (!this.blocker) {
			this.status("Adblocker: filter lists not ready yet, will attach once downloaded");
			return false;
		}
		if (this.blocker.isBlockingEnabled(session)) {
			this.activeSession = session;
			return true;
		}

		this.blocker.enableBlockingInSession(session);
		this.activeSession = session;
		this.status("Adblocker enabled for youtube session");
		return true;
	}

	private async loadCachedEngine(): Promise<boolean> {
		try {
			const [engine, meta] = await Promise.all([
				readFile(this.enginePath),
				readFile(this.metaPath, "utf8").then((raw) => JSON.parse(raw) as CacheMeta),
			]);
			const blocker = ElectronBlocker.deserialize(new Uint8Array(engine));
			this.setBlocker(blocker, meta.hash);
			this.status("Ad-blocker loaded from cache", { savedAt: new Date(meta.savedAt).toISOString() });
			return true;
		} catch (err) {
			this.logger.debug("No usable ad-blocker cache", err);
			return false;
		}
	}

	private async saveCache(blocker: ElectronBlocker, hash: string) {
		try {
			await mkdir(this.cacheDir, { recursive: true });
			const tmpEngine = `${this.enginePath}.tmp`;
			await writeFile(tmpEngine, blocker.serialize());
			await rename(tmpEngine, this.enginePath);
			await writeFile(this.metaPath, JSON.stringify({ hash, savedAt: Date.now() } satisfies CacheMeta));
		} catch (err) {
			this.logger.error("Failed to write ad-blocker cache", err);
		}
	}

	private async tryDownload(): Promise<void> {
		this.retryTimer = null;
		this.downloadAttempts += 1;
		const attempt = this.downloadAttempts;
		this.status(`Downloading ad-blocker filter lists (attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS})`);

		try {
			const [lists, resources] = await Promise.all([fetchLists(checkedFetch, fullLists), fetchResources(checkedFetch)]);
			const hash = createHash("sha256").update(lists.join("\n")).update("\0").update(resources).digest("hex");

			if (hash === this.blockerHash) {
				this.status("Ad-blocker filter lists unchanged, keeping cached engine");
				return;
			}

			const blocker = ElectronBlocker.parse(lists.join("\n"), { enableCompression: true });
			blocker.updateResources(resources, "" + resources.length);
			this.setBlocker(blocker, hash);
			await this.saveCache(blocker, hash);
			this.status("Ad-blocker filter lists updated");
		} catch (err) {
			this.logger.error(`Ad-blocker filter list download failed (attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS})`, err);
			if (attempt >= MAX_DOWNLOAD_ATTEMPTS) {
				this.status(this.blocker ? "Giving up on list refresh, using cached engine" : "Giving up on list download, ads will not be blocked");
				return;
			}
			const delay = this.blocker ? RETRY_DELAY_CACHED_MS : RETRY_DELAY_UNCACHED_MS;
			this.retryTimer = setTimeout(() => void this.tryDownload(), delay);
		}
	}

	private setBlocker(blocker: ElectronBlocker, hash: string) {
		this.wireEvents(blocker);
		const previous = this.blocker;
		const session = this.activeSession ?? this.views?.youtubeView?.webContents?.session ?? null;
		const wasBlocking = !!(previous && session && previous.isBlockingEnabled(session));

		if (previous && session && wasBlocking) previous.disableBlockingInSession(session);
		this.blocker = blocker;
		this.blockerHash = hash;

		// Re-attach after a swap, or attach late when the view loaded before any engine existed.
		if (session && (wasBlocking || !previous)) this.attachToSession(session);
	}

	private wireEvents(blocker: ElectronBlocker) {
		blocker.on("request-blocked", (request) => {
			this.logger.debug("[blocked]", request.url);
		});
		blocker.on("request-redirected", (request) => {
			this.logger.debug("[redirected]", request.url);
		});
		blocker.on("request-whitelisted", (request) => {
			this.logger.debug("[whitelisted]", request.url);
		});
		blocker.on("csp-injected", (request) => {
			this.logger.debug("[csp-injected]", request.url);
		});
		blocker.on("script-injected", (script, url) => {
			this.logger.debug("[script-injected]", script.length, url);
		});
		blocker.on("style-injected", (style, url) => {
			this.logger.debug("[style-injected]", style.length, url);
		});
	}

	private disable() {
		const session = this.activeSession ?? this.views?.youtubeView?.webContents?.session;
		if (!this.blocker || !session) return;
		if (!this.blocker.isBlockingEnabled(session)) return;

		this.blocker.disableBlockingInSession(session);
		this.activeSession = null;
		this.status("Adblocker disabled");
	}
}
