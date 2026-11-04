import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { assertToolOwner, displayName, requireUser } from "./lib/auth";
import { approvedLoans, availabilityFrom } from "./lib/availability";
import { isoDay } from "./lib/dates";
import { vCategory, vCondition } from "./lib/domain";
import { fail } from "./lib/errors";
import { retireTool } from "./lib/retire";
import { cleanText } from "./lib/validation";

const toolFields = {
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
};

function cleanToolFields(fields: { name: string; description: string }) {
  return {
    name: cleanText(fields.name, "Name", { min: 2, max: 60 }),
    description: cleanText(fields.description, "Description", { min: 0, max: 280 }),
  };
}

function activeTools(ctx: QueryCtx) {
  return ctx.db
    .query("tools")
    .withIndex("by_removed", (q) => q.eq("removedAt", undefined))
    .order("desc")
    .collect();
}

async function loadOwnedTool(ctx: QueryCtx, toolId: Doc<"tools">["_id"], user: Doc<"users">) {
  const tool = await ctx.db.get(toolId);
  if (!tool || tool.removedAt !== undefined) fail("NOT_FOUND", "That listing doesn't exist.");
  assertToolOwner(tool, user);
  return tool;
}

/**
 * Public, unauthenticated: tools that can be borrowed right now. Returns an
 * explicit projection (id, name, category) so owner data can never leak, even
 * if the table gains fields later.
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const today = isoDay(Date.now());
    const tools = await activeTools(ctx);
    const rows = await Promise.all(
      tools.map(async (tool) => ({ tool, availability: availabilityFrom(await approvedLoans(ctx, tool._id), today) })),
    );
    return rows
      .filter(({ availability }) => availability.status === "available")
      .map(({ tool }) => ({ id: tool._id, name: tool.name, category: tool.category }));
  },
});

/** Signed-in catalogue: every listing with availability, optionally filtered by category. */
export const list = query({
  args: { category: v.optional(vCategory) },
  handler: async (ctx, { category }) => {
    const viewer = await requireUser(ctx);
    const today = isoDay(Date.now());
    const tools = (await activeTools(ctx)).filter((tool) => !category || tool.category === category);
    return await Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          isMine: tool.ownerId === viewer._id,
          owner: { name: owner ? displayName(owner) : "Neighbor", trustedLender: owner?.trustedLender ?? false },
          availability: availabilityFrom(await approvedLoans(ctx, tool._id), today),
        };
      }),
    );
  },
});

/** "My listings": the caller's own tools with availability and pending request counts. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const today = isoDay(Date.now());
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .order("desc")
      .collect();
    return await Promise.all(
      tools
        .filter((tool) => tool.removedAt === undefined)
        .map(async (tool) => {
          const pending = await ctx.db
            .query("loans")
            .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "requested"))
            .collect();
          return {
            _id: tool._id,
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            description: tool.description,
            pendingRequests: pending.length,
            availability: availabilityFrom(await approvedLoans(ctx, tool._id), today),
          };
        }),
    );
  },
});

export const create = mutation({
  args: toolFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("tools", { ...args, ...cleanToolFields(args), ownerId: user._id });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields },
  handler: async (ctx, { toolId, ...fields }) => {
    const user = await requireUser(ctx);
    await loadOwnedTool(ctx, toolId, user);
    await ctx.db.patch(toolId, { ...fields, ...cleanToolFields(fields) });
  },
});

/** Owners delete their own listing (soft delete). Admin moderation lives in admin.removeListing. */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const user = await requireUser(ctx);
    const tool = await loadOwnedTool(ctx, toolId, user);
    await retireTool(ctx, tool, { today: isoDay(Date.now()), allowActiveLoan: false });
  },
});
