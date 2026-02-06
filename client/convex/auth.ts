import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Register new user
export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username
    if (args.username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }
    if (args.username.length > 20) {
      throw new Error("Username must be at most 20 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores",
      );
    }

    // Validate password
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.toLowerCase()),
      )
      .first();

    if (existing) {
      throw new Error("Username already taken");
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    // Create user with default settings
    const userId = await ctx.db.insert("users", {
      username: args.username.toLowerCase(),
      passwordHash,
      wallet: 100, // Starting balance
      createdAt: Date.now(),
      lastLogin: Date.now(),
      settings: {
        theme: "default",
        cardSpeed: "normal",
        pushed: true,
        confirmNewGame: true,
        aceValue: 1,
        scanlines: true,
        vignette: true,
        bgAnimation: true,
        highContrast: false,
        reduceMotion: false,
      },
      isAdmin: false,
    });

    return {
      userId,
      username: args.username.toLowerCase(),
      wallet: 100,
    };
  },
});

// Login user
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.toLowerCase()),
      )
      .first();

    if (!user) {
      throw new Error("Invalid username or password");
    }

    // Verify password
    const passwordHash = await hashPassword(args.password);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Invalid username or password");
    }

    // Update last login
    await ctx.db.patch(user._id, {
      lastLogin: Date.now(),
    });

    return {
      userId: user._id,
      username: user.username,
      wallet: user.wallet,
      settings: user.settings,
      isAdmin: user.isAdmin || false,
    };
  },
});

// Get current user by ID
export const getCurrentUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      username: user.username,
      wallet: user.wallet,
      settings: user.settings,
      isAdmin: user.isAdmin || false,
    };
  },
});

// Update user settings
export const updateSettings = mutation({
  args: {
    userId: v.id("users"),
    settings: v.object({
      theme: v.optional(v.string()),
      cardSpeed: v.optional(v.string()),
      pushed: v.optional(v.boolean()),
      confirmNewGame: v.optional(v.boolean()),
      aceValue: v.optional(v.number()),
      scanlines: v.optional(v.boolean()),
      vignette: v.optional(v.boolean()),
      bgAnimation: v.optional(v.boolean()),
      highContrast: v.optional(v.boolean()),
      reduceMotion: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      settings: { ...user.settings, ...args.settings },
    });

    return { success: true };
  },
});
