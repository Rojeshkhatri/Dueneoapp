# Task 2-a-viral — Random / Picker Tools

**Agent:** random-tools
**Date:** build session
**Task ID:** `2-a-viral`

## Scope

Built 8 browser-only random/picker tools (registry IDs 101–108) under
`src/components/tools/utility/`. All processing is local — no backend, no
uploads. Randomness is sourced from `crypto.getRandomValues` (rejection-sampled
to remove modulo bias) with a `Math.random` fallback for ancient browsers.

## Files created

- `src/components/tools/utility/_random-helpers.ts`
  Shared utilities: `hasCrypto`, `randomInt`, `randomIntInRange`, `randomPick`,
  `secureShuffle` (Fisher–Yates), `parseLines`, `parseOptions`,
  `WHEEL_PALETTE` (16 colours), `TEAM_PALETTE` (8 colours with soft variants).

- `src/components/tools/utility/wheel-spinner.tsx` — `WheelSpinner`
  Custom spinning wheel rendered as SVG with coloured segments. User enters
  options (one per line or comma-separated). Spin rotates the wheel with a
  4-second CSS cubic-bezier transition; the winner is decided up-front and
  the rotation math lands the chosen segment at the fixed top pointer.
  Supports shuffle, clear, reset, remove-winner (for multi-round raffles),
  and a 12-entry recent-winners badge list.

- `src/components/tools/utility/yes-no-wheel.tsx` — `YesNoWheel`
  50/50 wheel with green YES / red NO halves. Big spin button. Animated
  result banner. Tracks yes/no counts + percentage bars. Reset button.

- `src/components/tools/utility/name-picker.tsx` — `NamePicker`
  Textarea of names. Pick button runs a ~1.4 s slot-machine flicker reveal
  before announcing the winner. Toggle for "Remove picked name from list"
  (raffle mode). Separate "Remove winner" button. 20-entry recent-picks
  history.

- `src/components/tools/utility/random-number-generator.tsx` — `RandomNumberGenerator`
  Min/max range inputs, quantity 1–1000, unique-only toggle, sort mode
  (none/asc/desc). Single numbers shown huge; batches shown as a scrollable
  chip grid (max-h-96, overflow-y-auto). Copy-all button. Range capped at
  1 billion. For unique draws from small ranges (≤100k) it Fisher–Yates
  shuffles a sequential pool; for huge ranges it uses a Set to dedupe.

- `src/components/tools/utility/dice-roller.tsx` — `DiceRoller`
  Dice type select: D4/D6/D8/D10/D12/D20/D100. Quantity slider 1–20. Roll
  button flickers random faces for ~0.8 s before settling. D6 shows
  traditional pip faces (3×3 grid pip map); other dice show numeric tiles.
  Shows total, average, min/max possible range, and a progress bar.
  12-entry roll history with per-roll totals.

- `src/components/tools/utility/coin-flipper.tsx` — `CoinFlipper`
  Big "Flip" button. CSS 3D flip animation (rotateY with preserve-3d and
  backface-visibility:hidden) over ~2 s with 5–7 full rotations. Heads face
  shows 👑, tails face shows ⭐. Tracks heads/tails counts + percentage bars
  + 20-entry recent-flips emoji history.

- `src/components/tools/utility/random-letter-generator.tsx` — `RandomLetterGenerator`
  Case select (upper / lower / both), quantity 1–100, unique-only toggle,
  output format (joined string vs space-separated list). Generates
  A–Z / a–Z letters via crypto RNG. Shows result as a big monospace string
  and as a 40px square grid. Copy button.

- `src/components/tools/utility/team-generator.tsx` — `TeamGenerator`
  Textarea of names. Mode toggle: "Number of teams" or "Team size". Generate
  button runs `secureShuffle` then distributes round-robin for balanced
  sizes. Teams displayed in coloured columns with palette headers and
  soft backgrounds, numbered list of members inside each. Re-shuffle and
  Copy-teams buttons.

- `src/components/tools/_batch-a-registry.ts`
  Centralised registry exporting `batchAComponents` — a `Record<string,
  ComponentType<{tool: ToolDefinition}>>` mapping the 8 component keys
  (`wheel-spinner`, `yes-no-wheel`, `name-picker`, `random-number-generator`,
  `dice-roller`, `coin-flipper`, `random-letter-generator`, `team-generator`)
  to their components. The main agent will merge this into `tool-router.tsx`
  after all parallel batches complete to avoid git conflicts.

## Key design decisions

- **Randomness quality.** All randomness goes through the shared
  `randomInt(max)` helper, which uses `crypto.getRandomValues` over a
  `Uint32Array` and rejection-samples against `maxUsable = 0xffffffff -
  (0xffffffff % max)` to eliminate modulo bias. The helper falls back to
  `Math.floor(Math.random()*max)` only when WebCrypto is unavailable
  (ancient browsers). Each tool discloses its randomness source in a small
  footer note.

- **Wheel math.** Both the Wheel Spinner and Yes/No Wheel decide the
  winner index *before* the animation starts. They compute a target
  rotation that lands the chosen segment's centre at the fixed top
  pointer, then add several full turns (5–8) so the wheel visibly spins.
  The CSS `transition: transform 4s cubic-bezier(0.17,0.67,0.21,1)`
  produces a satisfying ease-out deceleration. The transition is set to
  `none` when not spinning so resetting the rotation to 0 doesn't visibly
  rewind the wheel.

- **Coin flip 3D.** The coin is a parent `<div>` with
  `transform-style: preserve-3d` and two child faces: heads at
  `rotateY(0)`, tails at `rotateY(180deg)`, both with
  `backface-visibility: hidden`. Each flip adds `(fullTurns*2 + (heads?0:1))
  * 180°` to the cumulative rotation so the chosen face lands facing the
  user. A small `rotateX(12deg)` tilt adds depth.

- **Name-picker reveal.** The chosen name is decided up-front, then a 70 ms
  `setInterval` flickers random names from the list for ~1.4 s before
  settling. The timer is properly cleaned up in `useEffect` return and on
  reset.

- **Dice flicker.** Similar 80 ms `setInterval` flicker for ~0.8 s before
  settling on the final values. The D6 pip face uses a fixed 3×3 grid
  lookup table for the 6 faces.

- **No `tool-router.tsx` edits.** Per the task brief, the central router
  is being modified by parallel subagents. To avoid git conflicts, the
  eight new components are exported from `_batch-a-registry.ts` as a single
  `batchAComponents` map that the main agent can `Object.assign` (or
  spread) into `TOOL_COMPONENTS` after all batches complete.

## Verification

- `bun run lint` → exit 0, no errors or warnings.
- `npx tsc --noEmit --skipLibCheck` → no errors in any of the new files
  (other agents' files in `src/components/games/`, `examples/`, and
  `skills/` have unrelated pre-existing errors that are out of scope).
- `tail dev.log` → only clean `✓ Compiled in` and `GET / 200` lines.
- Each tool uses `ToolLayout` with full `intro / tool / howTo / useCases /
  limitations / faq` content.

## Follow-ups for the main agent

- Merge `batchAComponents` from `src/components/tools/_batch-a-registry.ts`
  into `TOOL_COMPONENTS` in `src/components/tools/tool-router.tsx` (a single
  import + spread is enough). Until then, the 8 tools will fall through to
  the "Component not registered yet" placeholder.
- Optionally delete `_batch-a-registry.ts` once the merge is done (or leave
  it as a historical record).
