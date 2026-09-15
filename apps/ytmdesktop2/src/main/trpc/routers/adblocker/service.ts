import { ElectronBlocker, fullLists } from "@ghostery/adblocker-electron";
import { AfterInit, BaseProvider, BeforeStart } from "@main/core/baseProvider";
import type SettingsProvider from "@main/trpc/routers/settings/service";
import type { Session, WebContentsView } from "electron";

export default class AdblockerProvider extends BaseProvider implements BeforeStart, AfterInit {
	private blocker: ElectronBlocker | null = null;
	private activeSession: Session | null = null;
	private blockerPromise: Promise<ElectronBlocker | null> | null = null;

	constructor() {
		super("adblocker");
	}

	get settingsInstance(): SettingsProvider {
		return this.getProvider("settings");
	}

	private get isEnabled(): boolean {
		return this.settingsInstance.get<boolean>("adblocker.enabled", true) !== false;
	}

	private status(message: string, ...args: unknown[]) {
		this.logger.warn(message, ...args);
	}

	async BeforeStart() {
		await this.ensureBlocker();
	}

	async AfterInit() {
		this.settingsInstance.onSettingChange(
			"adblocker.enabled",
			(value) => {
				if (value) this.attachToYoutubeView();
				else this.disable();
			},
			{ debounce: 500 },
		);
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
			this.status("Adblocker: filter lists not ready yet");
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

	private async ensureBlocker(): Promise<ElectronBlocker | null> {
		if (this.blocker) return this.blocker;
		if (this.blockerPromise) return this.blockerPromise;

		this.blockerPromise = (async () => {
			this.status("Initiating ad-blocker (downloading filter lists…)");
			try {
				const blocker = await ElectronBlocker.fromLists(fetch, fullLists, {
					enableCompression: true,
				});

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

				this.blocker = blocker;
				this.status("Ad-blocker filter lists ready");
				return blocker;
			} catch (err) {
				this.logger.error("Failed to initialize ad-blocker", err);
				this.blockerPromise = null;
				return null;
			}
		})();

		return this.blockerPromise;
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
