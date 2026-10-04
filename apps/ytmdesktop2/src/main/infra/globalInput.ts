import { createLogger } from "@shared/utils/console";
import koffi from "koffi";

const log = createLogger("infra").child("globalInput");

export interface GlobalInputProbe {
	altDown(): boolean;
	mouseDown(): boolean;
}

function loadWin32Probe(): GlobalInputProbe {
	const user32 = koffi.load("user32.dll");
	const getAsyncKeyState = user32.func("__stdcall", "GetAsyncKeyState", koffi.types.int16, [koffi.types.int]);
	const VK_LBUTTON = 0x01;
	const VK_RBUTTON = 0x02;
	const VK_MBUTTON = 0x04;
	const VK_MENU = 0x12;
	const down = (vk: number) => (getAsyncKeyState(vk) & 0x8000) !== 0;
	return {
		altDown: () => down(VK_MENU),
		mouseDown: () => down(VK_LBUTTON) || down(VK_RBUTTON) || down(VK_MBUTTON),
	};
}

function loadDarwinProbe(): GlobalInputProbe {
	const appServices = koffi.load("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices");
	const keyState = appServices.func("bool CGEventSourceKeyState(int32_t stateID, uint16_t keycode)");
	const buttonState = appServices.func("bool CGEventSourceButtonState(int32_t stateID, uint32_t button)");
	const HID_SYSTEM_STATE = 1; // kCGEventSourceStateHIDSystemState
	const OPTION_LEFT = 0x3a; // kVK_Option
	const OPTION_RIGHT = 0x3d; // kVK_RightOption
	return {
		altDown: () => !!keyState(HID_SYSTEM_STATE, OPTION_LEFT) || !!keyState(HID_SYSTEM_STATE, OPTION_RIGHT),
		mouseDown: () => !!buttonState(HID_SYSTEM_STATE, 0) || !!buttonState(HID_SYSTEM_STATE, 1) || !!buttonState(HID_SYSTEM_STATE, 2),
	};
}

let resolved = false;
let probe: GlobalInputProbe | null = null;

export function getGlobalInputProbe(): GlobalInputProbe | null {
	if (resolved) return probe;
	resolved = true;
	try {
		if (process.platform === "win32") probe = loadWin32Probe();
		else if (process.platform === "darwin") probe = loadDarwinProbe();
		else log.debug(`no global input probe for ${process.platform}`);
		probe?.altDown();
		probe?.mouseDown();
	} catch (err) {
		log.warn("global input probe unavailable, falling back to renderer events", err);
		probe = null;
	}
	return probe;
}
