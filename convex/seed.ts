import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { isoDay } from "./lib/dates";
import type { Category, Condition } from "./lib/domain";
import { enqueueNotification } from "./lib/notify";

const DAY = 86_400_000;

const NEIGHBORS = [
  { name: "Sam Rivera", email: "sam@example.com", trustedLender: true },
  { name: "Priya Shah", email: "priya@example.com", trustedLender: false },
  { name: "Jonas Berg", email: "jonas@example.com", trustedLender: false },
];

const TOOLS: { owner: number; name: string; category: Category; condition: Condition; description: string }[] = [
  { owner: 0, name: "Cordless drill", category: "power_tools", condition: "good", description: "18V with two batteries and a charger. Bits not included." },
  { owner: 0, name: "Circular saw", category: "power_tools", condition: "fair", description: "7¼ inch blade. Bring your own safety glasses." },
  { owner: 1, name: "Hedge trimmer", category: "garden", condition: "good", description: "Electric, 50 cm blade, 10 m extension cord included." },
  { owner: 1, name: "Stand mixer", category: "kitchen", condition: "new", description: "Dough hook, whisk and paddle." },
  { owner: 2, name: "4-person tent", category: "camping", condition: "good", description: "Easy pitch, rain fly, fits in a car boot." },
  { owner: 2, name: "Carpet cleaner", category: "cleaning", condition: "worn", description: "Works well, a bit loud. Shampoo not included." },
];

/**
 * Demo data for local development: three neighbors, six tools, one active
 * loan, one overdue loan and one pending request (whose
 * owner notification goes through n8n like any other). Run with
 * `npx convex run seed:demo`. Demo users have no Clerk identity, so they
 * can't sign in; sign in yourself and borrow from them.
 */
export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("tools").first()) return "skipped: data already exists";

    const users: Id<"users">[] = [];
    for (const neighbor of NEIGHBORS) {
      users.push(await ctx.db.insert("users", { ...neighbor, tokenIdentifier: `demo|${neighbor.email}`, role: "user" }));
    }
    const tools: Id<"tools">[] = [];
    for (const { owner, ...tool } of TOOLS) tools.push(await ctx.db.insert("tools", { ...tool, ownerId: users[owner] }));

    const now = Date.now();
    const day = (offset: number) => isoDay(now + offset * DAY);
    const loan = (tool: number, borrower: number, status: "approved" | "requested", start: number, end: number) =>
      ctx.db.insert("loans", {
        toolId: tools[tool],
        ownerId: users[TOOLS[tool].owner],
        borrowerId: users[borrower],
        status,
        startDate: day(start),
        endDate: day(end),
        ...(status === "approved" ? { decidedAt: now } : {}),
      });

    await loan(4, 0, "approved", -1, 2); // tent: on loan
    await loan(1, 2, "approved", -6, -2); // circular saw: overdue
    const pending = await loan(2, 0, "requested", 3, 5); // hedge trimmer: pending
    await enqueueNotification(ctx, (await ctx.db.get(pending))!, "request.created");
    return "seeded";
  },
});
