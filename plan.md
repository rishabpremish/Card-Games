# Card Games — Implementation Plan

20 ideas for what to build next, roughly ordered by impact.

---

## Gameplay & New Games

1. **Texas Hold'em Poker (CPU)** — Add a single-player poker mode against AI opponents with varying difficulty levels (Tight, Loose, Aggressive). Reuse the existing poker logic and UI components.

2. **Slots / Slot Machine** — A classic 3-reel or 5-reel slot machine with themed symbols (retro/pixel art), free spins, and a jackpot mechanic.

3. **Roulette** — European or American roulette with a spinning wheel animation. Inside/outside bets, neighbor bets, and a bet history tracker.

4. **Craps** — Dice game with pass/don't-pass line, come bets, and odds. Animate the dice roll with pixel-style 3D dice.

5. **War (Casino War)** — Simple high-card game against the dealer. Fast-paced, good for quick sessions.

---

## Economy & Progression

6. **XP & Leveling System** — Award XP for every game played. Unlock cosmetic themes, new table styles, and card backs as you level up.

7. **Daily / Weekly Challenges** — e.g., "Win 5 Blackjack hands today", "Cash out over $200 in Higher or Lower". Grant bonus coins or XP on completion.

8. **Shop & Cosmetics Store** — Let players spend coins on custom card backs, table themes, avatars, chip designs, and sound packs.

9. **VIP Tiers** — Bronze → Silver → Gold → Diamond based on total wagered. Each tier unlocks higher table limits, exclusive games, and bonus multipliers.

10. **Loan / Credit System** — If the player goes broke, let them take a loan with interest that gets deducted from future winnings. Adds a risk/reward layer.

---

## Social & Multiplayer

11. **Global Chat** — A lobby chat where players can trash-talk, share big wins, or ask for tips. Use the existing Convex real-time infrastructure.

12. **Friend System & Private Tables** — Add friends, see their online status, invite them to private poker/blackjack rooms.

13. **Spectator Mode** — Allow users to watch ongoing poker games in real-time without joining.

14. **Tournaments** — Scheduled poker or blackjack tournaments with a leaderboard, entry fee, and prize pool.

---

## Polish & UX

15. **Animated Card Dealing** — Smooth card-flip and dealing animations (slide from deck, flip reveal) across all games instead of instant renders.

16. **Game History / Hand Replay** — Store recent hands and let the player review them: cards dealt, bets placed, outcome. Useful for learning.

17. **Statistics Dashboard** — Detailed stats page: win rate per game, biggest win, longest streak, total hands played, profit/loss graph over time.

18. **Sound & Music Overhaul** — Background chiptune music per game, toggleable. Better SFX for chip clicks, card flips, wins, and losses.

19. **Mobile-First Responsive Redesign** — Optimize touch targets, swipe gestures (swipe up = hit, swipe down = stand), and bottom-sheet controls for mobile.

20. **Dark / Light / Custom Themes** — Let users pick from multiple color themes (e.g., classic green felt, neon cyberpunk, minimalist white) stored in their settings.
