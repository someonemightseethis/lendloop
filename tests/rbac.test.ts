import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { day, expectError, listTool, NOW, setup, signIn } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.ADMIN_EMAILS = "admin@example.com";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.ADMIN_EMAILS;
});

describe("authentication", () => {
  it("rejects signed-out callers on every private function", async () => {
    const t = setup();
    await expectError(t.mutation(api.tools.create, { name: "Drill", category: "power_tools", condition: "good", description: "" }), "UNAUTHENTICATED");
    await expectError(t.query(api.tools.list, {}), "UNAUTHENTICATED");
    await expectError(t.query(api.loans.myRequests, {}), "UNAUTHENTICATED");
    await expectError(t.query(api.admin.allLoans, {}), "UNAUTHENTICATED");
  });

  it("grants admin only to verified emails listed in ADMIN_EMAILS", async () => {
    const t = setup();
    const unverified = await signIn(t, "Mallory", { email: "admin@example.com", emailVerified: false });
    expect((await unverified.as.query(api.users.me, {}))?.role).toBe("user");
    const admin = await signIn(t, "Admin", { email: "admin@example.com" });
    expect((await admin.as.query(api.users.me, {}))?.role).toBe("admin");
  });
});

describe("public catalogue", () => {
  it("returns only id, name and category of tools available now", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner One");
    const borrower = await signIn(t, "Borrower Two");
    await listTool(owner.as, "Ladder");
    const lent = await listTool(owner.as, "Tent");
    const loanId = await borrower.as.mutation(api.loans.request, { toolId: lent, startDate: day(0), endDate: day(2) });
    await owner.as.mutation(api.loans.approve, { loanId });

    const tools = await t.query(api.tools.listPublic, {});
    expect(tools).toHaveLength(1);
    expect(Object.keys(tools[0]).sort()).toEqual(["category", "id", "name"]);
    expect(JSON.stringify(tools)).not.toMatch(/owner|example\.com|Owner One/);
  });
});

describe("listings", () => {
  it("lets users edit and delete only their own listings", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const other = await signIn(t, "Other");
    const toolId = await listTool(owner.as);

    const edit = { toolId, name: "Hacked", category: "garden", condition: "worn", description: "" } as const;
    await expectError(other.as.mutation(api.tools.update, edit), "FORBIDDEN");
    await expectError(other.as.mutation(api.tools.remove, { toolId }), "FORBIDDEN");
    await expectError(other.as.mutation(api.admin.removeListing, { toolId }), "FORBIDDEN");

    await owner.as.mutation(api.tools.update, { ...edit, name: "Drill v2" });
    await owner.as.mutation(api.tools.remove, { toolId });
    expect(await owner.as.query(api.tools.mine, {})).toEqual([]);
  });

  it("blocks owners from deleting a tool that is out on loan, but lets admins remove it", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const borrower = await signIn(t, "Borrower");
    const admin = await signIn(t, "Admin", { email: "admin@example.com" });
    const toolId = await listTool(owner.as);
    const loanId = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(0), endDate: day(1) });
    await owner.as.mutation(api.loans.approve, { loanId });

    await expectError(owner.as.mutation(api.tools.remove, { toolId }), "CONFLICT");
    await admin.as.mutation(api.admin.removeListing, { toolId });
    expect(await t.query(api.tools.listPublic, {})).toEqual([]);
  });

  it("declines pending requests when a listing is removed", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const borrower = await signIn(t, "Borrower");
    const toolId = await listTool(owner.as);
    await borrower.as.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) });
    await owner.as.mutation(api.tools.remove, { toolId });
    const [request] = await borrower.as.query(api.loans.myRequests, {});
    expect(request.status).toBe("declined");
  });
});

describe("admin", () => {
  it("restricts all-loans, members and Trusted Lender to admins", async () => {
    const t = setup();
    const user = await signIn(t, "User");
    const admin = await signIn(t, "Admin", { email: "admin@example.com" });

    await expectError(user.as.query(api.admin.allLoans, {}), "FORBIDDEN");
    await expectError(user.as.query(api.admin.users, {}), "FORBIDDEN");
    await expectError(user.as.mutation(api.admin.setTrustedLender, { userId: user.userId, trusted: true }), "FORBIDDEN");

    await admin.as.mutation(api.admin.setTrustedLender, { userId: user.userId, trusted: true });
    expect((await user.as.query(api.users.me, {}))?.trustedLender).toBe(true);
    expect(await admin.as.query(api.admin.allLoans, {})).toEqual([]);
  });
});

describe("borrowing rules", () => {
  async function scenario() {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const borrower = await signIn(t, "Borrower");
    const stranger = await signIn(t, "Stranger");
    const toolId = await listTool(owner.as);
    return { t, owner, borrower, stranger, toolId };
  }

  it("rejects self-borrowing", async () => {
    const { owner, toolId } = await scenario();
    await expectError(owner.as.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) }), "FORBIDDEN");
  });

  it("rejects an end date before the start date, past dates and malformed dates", async () => {
    const { borrower, toolId } = await scenario();
    await expectError(borrower.as.mutation(api.loans.request, { toolId, startDate: day(3), endDate: day(2) }), "INVALID");
    await expectError(borrower.as.mutation(api.loans.request, { toolId, startDate: day(-1), endDate: day(2) }), "INVALID");
    await expectError(borrower.as.mutation(api.loans.request, { toolId, startDate: "2026-02-30", endDate: "2026-03-01" }), "INVALID");
  });

  it("rejects ranges that overlap an approved loan", async () => {
    const { owner, borrower, stranger, toolId } = await scenario();
    const loanId = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(2), endDate: day(4) });
    await owner.as.mutation(api.loans.approve, { loanId });
    await expectError(stranger.as.mutation(api.loans.request, { toolId, startDate: day(4), endDate: day(6) }), "CONFLICT");
    await stranger.as.mutation(api.loans.request, { toolId, startDate: day(5), endDate: day(6) });
  });

  it("auto-declines overlapping pending requests when one is approved", async () => {
    const { owner, borrower, stranger, toolId } = await scenario();
    const first = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(3) });
    const second = await stranger.as.mutation(api.loans.request, { toolId, startDate: day(2), endDate: day(5) });
    await owner.as.mutation(api.loans.approve, { loanId: first });
    const [loan] = await stranger.as.query(api.loans.myRequests, {});
    expect(loan._id).toBe(second);
    expect(loan.status).toBe("declined");
    await expectError(owner.as.mutation(api.loans.approve, { loanId: second }), "CONFLICT");
  });

  it("lets only the owner decide and only the parties act", async () => {
    const { owner, borrower, stranger, toolId } = await scenario();
    const loanId = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(0), endDate: day(1) });
    await expectError(borrower.as.mutation(api.loans.approve, { loanId }), "CONFLICT");
    await expectError(stranger.as.mutation(api.loans.approve, { loanId }), "FORBIDDEN");
    await expectError(stranger.as.mutation(api.loans.cancel, { loanId }), "FORBIDDEN");
    await expectError(owner.as.mutation(api.loans.cancel, { loanId }), "CONFLICT");
    await owner.as.mutation(api.loans.approve, { loanId });
    await expectError(borrower.as.mutation(api.loans.markReturned, { loanId }), "CONFLICT");
    await owner.as.mutation(api.loans.markReturned, { loanId });
    expect((await borrower.as.query(api.loans.myRequests, {}))[0].status).toBe("returned");
  });

  it("validates every status transition", async () => {
    const { owner, borrower, toolId } = await scenario();
    const loanId = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) });
    await expectError(owner.as.mutation(api.loans.markReturned, { loanId }), "CONFLICT");
    await owner.as.mutation(api.loans.decline, { loanId });
    await expectError(owner.as.mutation(api.loans.approve, { loanId }), "CONFLICT");
    await expectError(owner.as.mutation(api.loans.decline, { loanId }), "CONFLICT");
    await expectError(borrower.as.mutation(api.loans.cancel, { loanId }), "CONFLICT");
  });

  it("queues one notification per creation and status change, for the right person", async () => {
    const { t, owner, borrower, toolId } = await scenario();
    const loanId = await borrower.as.mutation(api.loans.request, { toolId, startDate: day(0), endDate: day(1) });
    await owner.as.mutation(api.loans.approve, { loanId });
    await owner.as.mutation(api.loans.markReturned, { loanId });

    const notifications = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notifications.map((n) => [n.event, n.recipientId])).toEqual([
      ["request.created", owner.userId],
      ["request.approved", borrower.userId],
      ["loan.returned", borrower.userId],
    ]);
  });
});
