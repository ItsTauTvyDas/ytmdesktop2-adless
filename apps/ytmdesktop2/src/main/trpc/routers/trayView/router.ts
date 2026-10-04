import { fromIpcEvent } from "@main/trpc/fromIpcEvent";
import { provider } from "@main/trpc/provider";
import { publicProcedure, router } from "@shared/trpc/trpc";
import { z } from "zod";

export type TrayViewState = { active?: boolean; pinned?: boolean };
export type TrayViewInputState = { altHeld: boolean };

export const trayViewRouter = router({
	toggle: publicProcedure.mutation(({ ctx }) => provider(ctx, "trayView").toggle()),
	open: publicProcedure.mutation(({ ctx }) => provider(ctx, "trayView").open()),
	hide: publicProcedure.mutation(({ ctx }) => provider(ctx, "trayView").hide()),
	openMain: publicProcedure.mutation(({ ctx }) => provider(ctx, "trayView").openMain()),
	togglePinned: publicProcedure.mutation(({ ctx }) => provider(ctx, "trayView").togglePinned()),
	pinned: publicProcedure.query(({ ctx }) => provider(ctx, "trayView").isPinned()),
	onState: publicProcedure.subscription(() => fromIpcEvent<TrayViewState | null>("trayview.state")),
	onInput: publicProcedure.subscription(() => fromIpcEvent<TrayViewInputState>("trayview.input")),
	altHeld: publicProcedure.query(({ ctx }) => provider(ctx, "trayView").isAltHeld()),
	setAltOverride: publicProcedure.input(z.boolean()).mutation(({ ctx, input }) => {
		provider(ctx, "trayView").reportAltFromRenderer(input);
	}),
});
