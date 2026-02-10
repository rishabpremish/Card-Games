---
name: Make UgroundBetZ More Fun
overview: Suggestions to increase engagement and "fun factor" for your retro card game platform, based on the existing games (Higher or Lower, Blackjack, Baccarat), leaderboard, wallet, and the unused Poker feature.
todos: []
isProject: false
---

# Make UgroundBetZ More Fun

Your app is **UgroundBetZ**: a retro 8-bit casino with Higher or Lower, Blackjack, Baccarat, a weekly leaderboard, Convex-backed wallet, and a **Poker feature that exists in code but is not linked** from the home menu or router.

Below are concrete ideas grouped by impact and effort. You can pick one area or mix a few.

---

## 1. Expose multiplayer Poker (high impact, low effort)

Poker is already implemented ([client/src/poker/](client/src/poker/)) with lobby, room codes, buy-in, and wallet integration, but it is **not in the app routes or home menu**.

- Add route in [client/src/App.tsx](client/src/App.tsx): `<Route path="/poker" element={<PokerPage />} />`
- Add a "Poker" link on [client/src/pages/Home.tsx](client/src/pages/Home.tsx) (e.g. next to Blackjack/Baccarat)
- Ensure [client/src/hooks/useWallet.ts](client/src/hooks/useWallet.ts) exposes the same API that `PokerPage` uses (`placeBet` / `addWinnings` — you already have `placeBet` as `walletPlaceBet` in useWallet; PokerPage uses `placeBet` and `addWinnings`, so the hook may need to expose those names or PokerPage updated to use the actual names)

This gives players a **social, multiplayer** game and reuses existing work.

---

## 2. Sound and celebration “juice” (high impact, medium effort)

Right now the games are silent and wins are mostly text. Adding light feedback makes wins and key moments feel much better.

- **Sound effects (optional, toggle in Settings)**  
  - Card deal/flip, chip place, win fanfare, lose “bonk”, cash-out “cha-ching”.  
  - Use short royalty-free WAV/MP3 or a tiny library (e.g. howler.js or simple `Audio`).  
  - Add a **Sound** toggle in [client/src/components/Settings.tsx](client/src/components/Settings.tsx) and persist in `user.settings` (extend [client/convex/schema.ts](client/convex/schema.ts) with e.g. `soundEnabled: v.optional(v.boolean())` and read it in a small `useSound` hook so games call `playSound('deal')` / `playSound('win')` only when enabled).
- **Celebration effects**  
  - **Big wins**: Confetti or particle burst when player gets blackjack, clears the deck in Higher or Lower, or wins a large Baccarat payout. A small dependency (e.g. `canvas-confetti`) or a few dozen divs with CSS animation is enough.  
  - **Wrong guess / bust**: Short screen-shake (e.g. `transform: translateX` keyframe on the game container for 200–300 ms) in Higher or Lower and Blackjack so failures have a clear, satisfying feedback.

This keeps the retro look while making outcomes feel more impactful.

---

## 3. Achievements and streaks (high impact, medium–high effort)

Gives players goals and bragging rights; can start client-only, then optionally sync to Convex.

- **Achievements (examples)**  
  - “First Blackjack”, “Clear the deck” (Higher or Lower), “Win 5 hands in a row” (Blackjack), “High roller” (single bet above X), “Baccarat banker streak”, etc.  
  - Store in localStorage keyed by `userId` (e.g. `achievements_${userId}`) as a list of achievement IDs and unlock time.  
  - Add an **Achievements** panel/modal (e.g. from Home or a nav icon) that lists all achievements and highlights unlocked ones with a small icon or badge.
- **Streaks**  
  - In Blackjack/Baccarat: show “2 wins in a row” (and optionally grant a small bonus or badge at 3/5).  
  - In Higher or Lower: you already have level progression; you could add a “correct guesses in a row” streak and show it next to the stake.  
  - Store current streak in component state; optionally persist “best streak” in localStorage or Convex for display on profile/leaderboard.
- **Optional Convex backing**  
  - Add an `achievements` or `userStats` table (e.g. `userId`, `achievementIds: array`, `bestStreak`, `lastStreakUpdate`) and sync unlocks/streaks so they persist across devices and can be shown on the leaderboard or profile.

---

## 4. Daily bonus / login streak (medium impact, medium effort)

Encourages daily return without changing core rules.

- **Daily bonus**  
  - First login of the day (by calendar day in user’s TZ) grants a small credit (e.g. $10) or a multiplier for the next N games.  
  - Track `lastDailyBonusDate` (and optionally `dailyLoginStreak`) in Convex `users` table; add a Convex function `claimDailyBonus` that checks and updates and returns new balance + “Day 3 streak!” message.  
  - On Home (or after login), show a “Claim daily bonus” button or auto-pop a small modal when they have an unclaimed bonus.
- **Login streak**  
  - Consecutive days = increasing reward or badge. Same `lastLogin` (and a `loginStreak` field) in Convex can drive this; show “7-day streak!” in the bonus modal or header.

---

## 5. Session summary and “fun stats” (medium impact, low effort)

Makes each session feel like a story (“I won at Blackjack but gave it back in Baccarat”).

- **Session stats**  
  - In-memory (or Convex) per-session: total wagered, total won/lost per game (Higher or Lower, Blackjack, Baccarat).  
  - On Home, show a collapsible “This session” panel: “Blackjack: +$20 | Baccarat: -$10 | Higher or Lower: +$5”.  
  - Optionally: “Biggest win today”, “Most played game”.
- **Implementation**  
  - Use React state or a small context updated when `placeBet` / `addWinnings` are called (with game name, which you already pass), or derive from Convex `transactions` for the current session (e.g. since page load or since midnight).

---

## 6. Leaderboard and social tweaks (medium impact, low–medium effort)

Your [client/src/pages/Leaderboard.tsx](client/src/pages/Leaderboard.tsx) already has weekly leaderboards and prize pot.

- **Highlight recent movement**  
  - “You moved up 2 spots this week” or “#3 in Blackjack profits” if you store per-game stats (see above).
- **Simple “reactions” or taunts**  
  - Optional: let players attach a short message or emoji to their leaderboard entry (e.g. “Lucky week!”). Requires a new field in leaderboard entries and a small form in profile/settings.

---

## 7. One more quick game mode (medium impact, high effort)

If you want a new game without building full multiplayer again:

- **War or Slap**  
  - Simple two-pile “War” (compare cards, higher wins) or “Slap” (slap on doubles/sandwiches) as a single-player vs CPU minigame. Uses the same deck/card UI you already have; rules are simple and fit the retro vibe.
- **Blackjack “Speed” mode**  
  - Same rules, but a 10–15 second timer per decision; if time runs out, auto-stand. Reuse [client/src/pages/Blackjack.tsx](client/src/pages/Blackjack.tsx) and add a countdown and auto-stand.

---

## Suggested order

1. **Expose Poker** — quick win, big new experience.
2. **Sound + celebration juice** — one sound toggle + a few effects and confetti/shake.
3. **Session summary on Home** — low effort, high clarity.
4. **Achievements (client-only first)** — then daily bonus and optional Convex sync.

If you tell me which of these you want to implement first (e.g. “Poker + sound” or “achievements + daily bonus”), I can break that into step-by-step implementation tasks and point to the exact files and code patterns to use.