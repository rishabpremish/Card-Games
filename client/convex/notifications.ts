import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listNotifications = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const take = limit ?? 50;
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(take);
  },
});

export const unreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("read", false),
      )
      .collect();
    return { count: unread.length };
  },
});

export const markAllRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("read", false),
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { success: true, updated: unread.length };
  },
});

export const markRead = mutation({
  args: { userId: v.id("users"), notificationId: v.id("notifications") },
  handler: async (ctx, { userId, notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n || n.userId !== userId) throw new Error("Not found");
    if (n.read) return { success: true };
    await ctx.db.patch(notificationId, { read: true });
    return { success: true };
  },
});
