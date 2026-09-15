import definePlugin from "@plugins/utils";

export default definePlugin(
	"adblocker",
	{
		enabled: true,
		displayName: "AdBlocker",
		service: "adblocker",
	},
	{},
);
