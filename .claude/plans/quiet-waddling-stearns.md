# Splash-to-Landing Logo Animation

## Context

When the app opens, the user wants a polished boot animation: the TranspiraFund logo appears centered on screen, then animates (shrinks + moves up) to its final position on the landing page, after which the rest of the landing content fades in. This replaces the current instant-render approach where everything fades in at once.

## Approach

Add a **splash phase** directly inside `LandingView.tsx` — no new screens or navigation changes needed.

### Animation Sequence (total ~2.2s)

1. **Phase 1 — Splash (0–1.2s):** Full-screen teal background, logo appears large and centered with a subtle scale-up + fade. App name "TranspiraFund" fades in below.
2. **Phase 2 — Transition (1.2–1.8s):** Logo shrinks from ~160px to ~112px and translates upward to its landing page position. Background stays teal throughout (seamless since landing page is also teal).
3. **Phase 3 — Content reveal (1.8–2.2s):** Badge, features card, and button fade in with staggered animations (existing `FadeInDown`/`FadeInUp` animations, just re-timed).

### Implementation

**File: `src/views/LandingView.tsx`** — sole file modified

- Add `useState` for `splashDone` flag (starts `false`)
- Add `useSharedValue` for logo scale (starts 1.4, animates to 1.0) and translateY (starts at center offset, animates to 0)
- Use `useEffect` with `setTimeout` to trigger transition at 1.2s and set `splashDone=true` at 1.8s
- During splash phase: only render logo + app name, centered via absolute positioning
- After splash: render full landing content, logo is in its normal layout position
- Use `useAnimatedStyle` on the logo container to drive scale + translateY smoothly via `withTiming`

### Why inside LandingView (not a separate SplashScreen)

- No navigation changes needed — `AuthNavigator` already loads `LandingScreen` first
- No extra screen mount/unmount flicker
- The teal background is shared between splash and landing — seamless transition
- Simpler to maintain: one component, one animation timeline

## Verification

1. Open app on emulator — logo should appear centered, then animate up into landing page position
2. Landing page content (badge, features, button) should only appear after logo settles
3. No flicker or jump between splash and landing
4. Tapping "Sign In to Portal" still navigates to Login
