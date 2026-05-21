# Accessibility Checklist — Restaurant Voting App

This document covers manual accessibility verification items that complement the automated `jest-axe` tests.

## Keyboard Navigation

- [ ] **Arrow keys for swipe**: Left arrow rejects, right arrow accepts the active restaurant card
- [ ] **Tab navigation**: All interactive elements (buttons, links, form inputs) are reachable via Tab key
- [ ] **Enter/Space activation**: All buttons and links activate on Enter or Space keypress
- [ ] **Focus trapping**: No focus traps exist; users can always Tab out of any component
- [ ] **Skip to content**: Consider adding a skip link for screen reader users (future enhancement)

## Visible Focus Indicator

- [ ] **RestaurantCard**: Shows a visible ring (`focus-visible:ring-4 ring-zinc-900`) when focused via keyboard
- [ ] **Accept/Reject buttons**: Show colored focus rings (green/red) when focused
- [ ] **Submit button**: Shows `focus-visible:outline` when focused
- [ ] **All links**: Show visible focus indicators on keyboard focus
- [ ] **Focus not visible on mouse click**: `focus-visible` ensures rings only appear on keyboard navigation

## Screen Reader Announcements

- [ ] **Match event**: The match screen heading "It's a match!" is announced when the screen renders
- [ ] **Error states**: All error messages use `role="alert"` for immediate announcement
- [ ] **Live participant count**: Uses `aria-live="polite"` to announce count changes
- [ ] **Loading states**: Use `aria-busy="true"` on loading indicators
- [ ] **Restaurant card**: Has `role="article"` and `aria-label` containing the restaurant name
- [ ] **Photo alt text**: All images have descriptive alt text containing the restaurant name

## Color Contrast Verification

- [ ] **Normal text (14px)**: All text meets 4.5:1 contrast ratio against its background
  - `text-zinc-600` on white: ~5.7:1 ✓
  - `text-zinc-700` on white: ~8.6:1 ✓
  - `text-zinc-900` on white: ~17.4:1 ✓
  - `text-red-600` on white: ~4.5:1 ✓
  - `text-green-600` on white: ~4.5:1 ✓
- [ ] **Large text (18px+ or 14px bold)**: Meets 3:1 contrast ratio
  - All headings use `text-zinc-900` ✓
- [ ] **Interactive elements**: Button text meets contrast requirements in all states (default, hover, disabled)
- [ ] **Disabled state**: `text-zinc-400` on `bg-zinc-200` is acceptable for disabled elements (not required to meet contrast)

## Touch and Mobile

- [ ] **Touch drag**: Swipe gestures work on iOS Safari and Android Chrome
- [ ] **Touch targets**: All buttons are at least 44x44px (h-12 w-12 = 48px ✓)
- [ ] **No horizontal scroll**: Verified at 320px, 375px, 768px, and 1440px viewports
- [ ] **Text scaling**: Content remains readable at 200% browser zoom

## Testing Tools Used

- **Automated**: `jest-axe` (axe-core) for all page states
- **Manual**: Browser DevTools accessibility panel, keyboard-only navigation testing
- **Recommended**: VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android)

## Notes

- Full WCAG 2.1 Level AA compliance requires manual testing with assistive technologies and expert accessibility review
- The automated tests catch structural issues (missing labels, roles, contrast) but cannot verify the full user experience
- Touch gesture testing requires real devices or device emulators
