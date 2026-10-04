import { describe, expect, it } from "vitest";
import { type AltGestureSample, initialAltGestureState, isAltEngaged, nextAltGestureState } from "./altGesture";

const sample = (over: Partial<AltGestureSample> = {}): AltGestureSample => ({
	altDown: false,
	mouseDown: false,
	inside: false,
	...over,
});

/** Feed samples in order, returning the engaged flag after each tick. */
function run(samples: AltGestureSample[]): boolean[] {
	let state = initialAltGestureState;
	return samples.map((s) => {
		state = nextAltGestureState(state, s);
		return isAltEngaged(state, s);
	});
}

describe("alt gesture latch", () => {
	it("engages on Alt while hovering, with no press involved", () => {
		expect(run([sample({ inside: true }), sample({ inside: true, altDown: true })])).toEqual([false, true]);
	});

	it("holds Alt for the rest of a press that began under Alt", () => {
		const engaged = run([
			sample({ inside: true, altDown: true }),
			sample({ inside: true, altDown: true, mouseDown: true }),
			sample({ inside: true, mouseDown: true }),
			sample({ inside: true, mouseDown: true }),
			sample({ inside: true }),
		]);
		expect(engaged).toEqual([true, true, true, true, false]);
	});

	it("keeps a latched gesture engaged after it drags the cursor outside", () => {
		const engaged = run([
			sample({ inside: true, altDown: true, mouseDown: true }),
			sample({ inside: false, mouseDown: true }),
			sample({ inside: false }),
		]);
		expect(engaged).toEqual([true, true, false]);
	});

	it("latches when Alt is released in the same tick the button goes down", () => {
		const engaged = run([
			sample({ inside: true, altDown: true }),
			// Probe samples Alt as already up, but the press is new and Alt was just down.
			sample({ inside: true, mouseDown: true }),
			sample({ inside: true, mouseDown: true }),
			sample({ inside: true }),
		]);
		expect(engaged).toEqual([true, true, true, false]);
	});

	it("never latches a press made without Alt, since that click passed through", () => {
		const engaged = run([
			sample({ inside: true }),
			sample({ inside: true, mouseDown: true }),
			// Alt pressed mid-press engages only while hovering, and does not latch.
			sample({ inside: true, mouseDown: true, altDown: true }),
			sample({ inside: false, mouseDown: true }),
		]);
		expect(engaged).toEqual([false, false, true, false]);
	});

	it("ignores a press that began outside the popup", () => {
		const engaged = run([
			sample({ altDown: true }),
			sample({ altDown: true, mouseDown: true }),
			sample({ inside: true, mouseDown: true }),
		]);
		expect(engaged).toEqual([false, false, false]);
	});

	it("re-latches a second press in the same Alt hold", () => {
		const engaged = run([
			sample({ inside: true, altDown: true, mouseDown: true }),
			sample({ inside: true, altDown: true }),
			sample({ inside: true, altDown: true, mouseDown: true }),
			sample({ inside: true, mouseDown: true }),
		]);
		expect(engaged).toEqual([true, true, true, true]);
	});
});
