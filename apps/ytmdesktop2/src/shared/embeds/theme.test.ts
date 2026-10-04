import { describe, expect, it } from "vitest";
import { EMBED_ACCENT, progressColor, resolveEmbedText, resolveEmbedTheme } from "./theme";

describe("resolveEmbedText", () => {
	it("falls back to the shipped default when the field is empty", () => {
		expect(resolveEmbedText("", "Nothing playing")).toBe("Nothing playing");
		expect(resolveEmbedText(undefined, "Nothing playing")).toBe("Nothing playing");
		expect(resolveEmbedText(null, "Nothing playing")).toBe("Nothing playing");
	});

	it("hides the text when the field holds only whitespace", () => {
		expect(resolveEmbedText(" ", "Nothing playing")).toBeNull();
		expect(resolveEmbedText("   ", "Nothing playing")).toBeNull();
		expect(resolveEmbedText("\t", "Nothing playing")).toBeNull();
	});

	it("uses the value verbatim otherwise, including its padding", () => {
		expect(resolveEmbedText("Offline", "Nothing playing")).toBe("Offline");
		expect(resolveEmbedText(" Offline ", "Nothing playing")).toBe(" Offline ");
	});
});

describe("resolveEmbedTheme", () => {
	it("returns shipped defaults for an absent config", () => {
		const theme = resolveEmbedTheme(null);
		expect(theme.text.idle).toBe("Nothing playing");
		expect(theme.text.artPlaceholder).toBe("YTM");
		expect(theme.color.progress).toBe(EMBED_ACCENT);
		expect(theme.radius).toEqual({ embed: 12, art: 8, progress: 12 });
		expect(theme.idleImage).toBeNull();
	});

	it("keeps per-field overrides independent", () => {
		const theme = resolveEmbedTheme({ text: { idle: " " }, color: { title: "#ff0000" } });
		expect(theme.text.idle).toBeNull();
		expect(theme.text.artPlaceholder).toBe("YTM");
		expect(theme.color.title).toBe("#ff0000");
		expect(theme.color.artist).toBe("rgba(244,244,245,0.55)");
	});

	it("ignores blank colours and out-of-range radii", () => {
		const theme = resolveEmbedTheme({ color: { title: "   " }, radius: { art: -5, progress: 9999 } });
		expect(theme.color.title).toBe("#f4f4f5");
		expect(theme.radius).toEqual({ embed: 12, art: 8, progress: 12 });
	});

	it("clamps each radius independently", () => {
		const theme = resolveEmbedTheme({ radius: { embed: 999, art: 4 } });
		expect(theme.radius.embed).toBe(32);
		expect(theme.radius.art).toBe(4);
		expect(theme.radius.progress).toBe(12);
	});

	it("resolves the progress fill against the album accent", () => {
		expect(progressColor(resolveEmbedTheme(null), "#abcdef")).toBe("#abcdef");
		expect(progressColor(resolveEmbedTheme({ color: { progress: "#123456" } }), "#abcdef")).toBe("#123456");
	});
});
