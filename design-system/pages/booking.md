# Booking page override (`/book`, `/zh/book`)

References: `reference/customer-booking-UI.png` (stepper + month calendar + slots), `reference/customer-booking-UI-3.png` (details form). `reference/calendar.png` is a staff view — not built.

## Layout
- Desktop ≥ 1024px: 3 panes inside a `--surface` panel with `--shadow-sm`.
  - **Left rail** (280px, right hairline): circular Abby avatar 72px, small caption "Lash & Nail Artist", name in Playfair, then vertical stepper: ① Service ② Date ③ Time ④ Details. Each step = icon in 36px circle + label; completed steps show the chosen value (e.g. "Tue 18 Nov 2026") in `--primary`; future steps in `--muted`; dotted connector between steps. Current step marked with a filled dot + "Step 2" caption (as reference).
  - **Middle**: month header "November 2026" with prev/next circular buttons (prev disabled on current month, next disabled beyond max-advance). Weekday row (locale-aware: EN `Sun Mon…`, ZH `日 一 二…`; week starts Monday in en-AU). Day cells 44px circles: available = `--surface-2` fill + `--fg` text; selected = `--primary` fill + `--on-primary`; unavailable/past = `--muted` text at 60%, no fill, `aria-disabled`; today = small dot under the number. Dashed vertical divider to the right pane.
  - **Right**: selected date heading ("Tuesday, 18 November"), vertical list of slot buttons (outline, full width, 48px). Selecting a slot splits it into [time (muted fill)] + [Next (primary)] as in the reference.
- Step 1 (Service) occupies middle+right panes: service cards → option radio list with duration + price.
- Step 4 (Details) occupies middle+right panes: form from reference 3.
- Tablet/mobile < 1024px: left rail collapses to a horizontal progress bar (4 dots + current label); one step visible at a time; "Back" link top-left of each step.

## Calendar behaviour
- Keyboard: grid pattern — arrows move by day/week, Home/End week edges, PageUp/PageDown month, Enter/Space selects. `role="grid"`, each day a `<button>` with full accessible label ("Tuesday 18 November 2026, available").
- Loading: skeleton circles while availability fetches; error state with retry and phone fallback.
- Times displayed in Australia/Sydney, 12-hour en-AU ("10:30 am"), 24-hour ZH ("10:30").

## Details form (step 4)
- Title "Appointment details", subtitle "Fill in your information and we'll get back to you to confirm your appointment."
- Fields (visible labels, never placeholder-only): Full name*, Phone* (AU mobile/landline, `inputmode="tel"`, `autocomplete="tel"`), Email* (`autocomplete="email"`), Service (prefilled, editable select), Option (dependent select), Notes (optional textarea: "Allergies, inspiration, first visit?").
- Summary box above the button: service, option, date, time, duration, price.
- Validate on blur; errors under field in `--danger` with icon; on submit failure focus an error summary (`role="alert"`).
- Inputs: `--surface-2` fill, no border, 0 radius, 48px tall, focus ring `--ring`.
- Submit button full width "Book appointment" → loading state (spinner + disabled) → success view.
- Turnstile widget above the submit button (managed mode).

## Success view
- Heading "Request received" + summary + "We'll confirm by phone or SMS shortly." + buttons: "Add to Google Calendar", "Download .ics", "Back to home". Pending status clearly stated.
