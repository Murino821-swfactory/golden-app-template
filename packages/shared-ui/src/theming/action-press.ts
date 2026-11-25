/**
 * action-press.ts — a click on the page's action plays the look's answer, then goes through.
 *
 * Founder, 2026-11-25: "an animation after the click on the CTA." The action is a link, and a
 * link leaves the page the moment it is clicked — a ripple that starts with the click would be
 * replaced by the next page before anyone saw it. So a plain click is held for a moment
 * (`PRESS_HOLD_MS`), the action wears `data-pressed` — every look in `buttons.css` has its own
 * answer to that — and then the same click is let through, untouched, to whatever handles the
 * link (the host's router, or the browser).
 *
 * What is never held:
 *   - a click with a modifier key or another mouse button — a new tab or window is the browser's;
 *   - a click something above already took (the template's "Change texts" turns links into lines);
 *   - any click when the visitor asked for reduced motion — there is nothing to wait for;
 *   - a page whose host has not turned the looks on (`html[data-button]`).
 *
 * No React and no host import: the header installs it when it is given a `button`. While it
 * is installed the document carries `html[data-shared-press]` — before that (a page still
 * loading its scripts) a click is an ordinary click, which is how a link should fail.
 */

/** How long a click waits for the look's answer. Short of a third of a second, where a page
 * starts to feel slow; long enough for every answer's first, legible beat. */
export const PRESS_HOLD_MS = 260;

/** How long the action stays pressed — the longest answer of the five. An anchor on the same
 * page keeps the action on screen, so the answer plays to its end there. */
export const PRESS_SETTLE_MS = 680;

const ACTION = "[data-cta]";

export function installActionPress(root: Document = document): () => void {
  const held = new WeakSet<Element>();

  const onClick = (event: MouseEvent) => {
    const action = event.target instanceof Element ? event.target.closest<HTMLElement>(ACTION) : null;
    if (!action) return;
    // The click this function sends on once the hold is over: let it pass, once.
    if (action.dataset.ctaThrough !== undefined) {
      delete action.dataset.ctaThrough;
      return;
    }
    // A second press while the first is held would go through twice.
    if (held.has(action)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (root.documentElement.dataset.button === undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    // Where it was pressed, for a look that answers from that point (the ripple). A click from
    // the keyboard has no place: the answer starts from the middle.
    const box = action.getBoundingClientRect();
    const pointed = event.detail > 0;
    action.style.setProperty("--shared-cta-x", pointed ? `${event.clientX - box.left}px` : "50%");
    action.style.setProperty("--shared-cta-y", pointed ? `${event.clientY - box.top}px` : "50%");
    action.setAttribute("data-pressed", "");
    held.add(action);

    window.setTimeout(() => {
      held.delete(action);
      // The page may have changed under a held click; a link that is gone leads nowhere.
      if (!action.isConnected) return;
      action.dataset.ctaThrough = "";
      action.click();
    }, PRESS_HOLD_MS);
    window.setTimeout(() => action.removeAttribute("data-pressed"), PRESS_SETTLE_MS);
  };

  // Capture phase on the document: above the host's own click handling (React listens at its
  // root), below a listener on `window` — which is where the template's text editing stands.
  root.addEventListener("click", onClick, true);
  root.documentElement.setAttribute("data-shared-press", "");
  return () => {
    root.removeEventListener("click", onClick, true);
    root.documentElement.removeAttribute("data-shared-press");
  };
}
