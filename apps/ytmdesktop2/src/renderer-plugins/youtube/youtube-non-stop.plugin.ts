import definePlugin from "@plugins/utils";
import youtubeNonStopRenderer from "./youtube-non-stop.renderer";

/** Prevent YouTube Music from pausing playback after the window is idle. */
export default definePlugin(
	"youtube-non-stop",
	{
		enabled: true,
		displayName: "YouTube NonStop",
	},
	{
		renderer: youtubeNonStopRenderer,
	},
);
