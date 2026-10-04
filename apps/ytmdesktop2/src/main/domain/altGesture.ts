export interface AltGestureState {
	latched: boolean;
	prevMouseDown: boolean;
	prevAltDown: boolean;
}

export interface AltGestureSample {
	altDown: boolean;
	mouseDown: boolean;
	inside: boolean;
}

export const initialAltGestureState: AltGestureState = {
	latched: false,
	prevMouseDown: false,
	prevAltDown: false,
};

export function nextAltGestureState(prev: AltGestureState, sample: AltGestureSample): AltGestureState {
	let latched = prev.latched;
	if (!sample.mouseDown) {
		latched = false;
	} else if (!prev.prevMouseDown && sample.inside && (sample.altDown || prev.prevAltDown)) {
		latched = true;
	}
	return { latched, prevMouseDown: sample.mouseDown, prevAltDown: sample.altDown };
}

export function isAltEngaged(state: AltGestureState, sample: AltGestureSample): boolean {
	return state.latched || (sample.inside && sample.altDown);
}
