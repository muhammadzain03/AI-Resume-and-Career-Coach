# Accessibility Compliance Checklist (WCAG-Informed)

## Scope
Core frontend workflows: navigation, resume upload, and job description submission.

## Checklist
- [x] Semantic layout landmarks (`header`, `aside`, `main`, `footer`).
- [x] Keyboard-accessible buttons and links.
- [x] Explicit labels for primary form fields.
- [x] Visible `:focus-visible` indicators for interactive elements.
- [x] Status/error feedback exposed with `aria-live` and `role="alert"/"status"` where needed.
- [x] Theme toggle includes an accessible `aria-label`.
- [x] Basic reduced-motion support via `prefers-reduced-motion`.
- [ ] Automated audit report (Lighthouse/axe) attached.
- [ ] Full screen-reader walkthrough notes attached.

## Implemented Updates
- Labeled form controls in job description flow.
- Upload feedback and progress semantics (`role="progressbar"`, live status updates).
- Shared focus-visible outline styles for keyboard users.

## Testing Notes (Current)
- Manual keyboard tabbing confirms all primary controls are reachable.
- Form validation messages are visible and announced in accessibility tree.
- Dark/light themes preserve readable contrast for key content regions.
