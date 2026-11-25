/**
 * "Change texts" on the whole page (founder, 2026-11-24: the button "must give the possibility to
 * edit any text that is shown on the whole landing page"). The golden demo is where a visitor from
 * a social network lands; with their own hands on the page they retype the headline — and, since
 * this file, every other line too: the eyebrow, the actions, the product frame, the cards, the
 * questions and their answers, the offers, the form's labels, the footer.
 *
 * It is read off the page, not off a list of sections: every run of words the document shows is
 * found in the DOM and the element that lays it out becomes a line to type into
 * (`contenteditable="plaintext-only"`). No section opts in, so a section added later is covered
 * the day it renders. Everything stays in the visitor's browser — no request, nothing saved.
 *
 * The lines belong to React, and a browser that edits text removes nodes: an emptied text node
 * leaves the document, a new one arrives with the next letter. React keeps pointing at the old
 * one — a label that later changes would write into a node nobody sees, and a node React removes
 * by reference would no longer be a child (the Google Translate crash). So each line remembers
 * its nodes when the editing starts, and when the caret leaves it the page's own nodes are put
 * back where they stood, carrying the visitor's words (`restore`). Not while they type: a phone's
 * keyboard composes in the node it is typing into.
 */

/* ── The one state: both "Change texts" buttons and the dock show and switch the same editing ── */

export type TextEdit = {
  editing: boolean;
  /** The section whose button started it: its first line takes the caret. */
  origin: string | null;
};

const OFF: TextEdit = { editing: false, origin: null };
let state = OFF;
const watchers = new Set<() => void>();

function set(next: TextEdit) {
  state = next;
  for (const watcher of watchers) watcher();
}

/** A store for `useSyncExternalStore`: the sections are siblings under a server page, so there is
 * no component above them to hold the state. */
export const textEdit = {
  subscribe(watcher: () => void) {
    watchers.add(watcher);
    return () => {
      watchers.delete(watcher);
    };
  },
  get: () => state,
  off: () => OFF,
  toggle(origin: string) {
    set(state.editing ? OFF : { editing: true, origin });
  },
  stop() {
    if (state.editing) set(OFF);
  },
};

/* ── Which elements are lines ── */

/** The try-it keys: those that start and end the editing, and a feature card's own "Change image"
 * (`data-try-key`). A line never holds them, or they could not be pressed. */
const KEYS = "[data-try-bar], [data-try-key], [data-try-dock]";

/** What stays a control while the visitor edits: those keys, the header's tools (colour, font,
 * language, sign-in), dialogs, the map (its attribution is not the page's to rewrite), form
 * fields — and what is not shown as words at all. */
const CONTROLS = `${KEYS}, [data-shared-control], header button, [role='dialog'], [data-pattern='map-base'], input, textarea, select, script, style, noscript, svg, .sr-only`;

const MARK = "data-try-text";
const EDITABLE = "[contenteditable='plaintext-only']";

function blockOfWords(element: Element): boolean {
  return getComputedStyle(element).display !== "inline" && !element.matches("svg") && Boolean(element.textContent?.trim());
}

/**
 * The line a run of words belongs to: the box that lays it out — the nearest ancestor that is not
 * inline (a heading, a paragraph, a button, a link drawn as a pill, a cell). When that box also
 * holds other blocks of words (a card whose numeral is an inline span beside its heading), it is a
 * container, and the line is the inline run itself. `null` for words in a control, words that
 * are not rendered, and a line React already made editable (`EditableText`).
 */
export function lineOf(text: Text): HTMLElement | null {
  let box = text.parentElement;
  if (!box || !text.data.trim() || box.closest(CONTROLS)) return null;
  const taken = box.closest<HTMLElement>("[contenteditable]");
  if (taken) return taken.hasAttribute(MARK) ? taken : null;
  let display = getComputedStyle(box).display;
  if (display !== "contents" && box.getClientRects().length === 0) return null;
  let run: HTMLElement | null = null;
  while (box.parentElement && (display === "inline" || display === "contents")) {
    if (display === "inline") run = box;
    box = box.parentElement;
    display = getComputedStyle(box).display;
  }
  const container =
    box === document.body ||
    box.querySelector(KEYS) !== null ||
    (run !== null && Array.from(box.children).some((child) => child !== run && blockOfWords(child)));
  return container ? run : box;
}

/* ── The page's own nodes ── */

type Line = {
  /** Every node under the line when the editing started, by parent, in order. */
  kept: [parent: Node, children: ChildNode[]][];
  /** The words each text node carried then: an emptied line gets them back. */
  words: [node: Text, configured: string][];
};

function remember(line: HTMLElement): Line {
  const kept: Line["kept"] = [];
  const words: Line["words"] = [];
  const visit = (parent: Node) => {
    const children = Array.from(parent.childNodes);
    kept.push([parent, children]);
    for (const child of children) {
      if (child instanceof Text) words.push([child, child.data]);
      else if (child instanceof HTMLElement) visit(child);
    }
  };
  visit(line);
  return { kept, words };
}

function blank(node: Node) {
  if (node instanceof Text) {
    node.data = "";
    return;
  }
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) (text as Text).data = "";
}

/**
 * Put the page's own nodes back where the typing removed them. A text node the browser typed
 * into in place of one of ours hands its words over and leaves; whatever else went missing — an
 * icon deleted with the words, a span the visitor typed over — returns where it stood, empty if
 * its words were deleted. A line left with no words at all gets the configured ones back, so it
 * can be found and typed into again (as `EditableText` does).
 */
function restore(line: HTMLElement, { kept, words }: Line) {
  const emptied = !line.textContent?.trim();
  for (const [parent, children] of kept) {
    const own = new Set<Node>(children);
    for (const typed of Array.from(parent.childNodes)) {
      if (own.has(typed)) continue;
      const home =
        typed instanceof Text && !emptied
          ? children.find((child): child is Text => child instanceof Text && child.parentNode !== parent)
          : undefined;
      if (home) {
        home.data = typed.textContent ?? "";
        parent.replaceChild(home, typed);
      } else if (emptied || typed.nodeName === "BR") {
        // The browser's placeholder for an empty line; Enter ends a line, so no break is the visitor's.
        typed.remove();
      }
    }
    // Right to left: the node after a missing one is back in place by the time it is needed.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.parentNode === parent) continue;
      if (!emptied && !child.isConnected) blank(child);
      parent.insertBefore(child, children[i + 1] ?? null);
    }
  }
  if (emptied) for (const [node, configured] of words) node.data = configured;
}

/* ── The editing ── */

/**
 * Open every text under `root` for typing, until the returned function is called. While it is
 * open a line is words, not a control: a click puts the caret in it instead of following the link
 * or pressing the button (nor does the rest of that link or button act), Enter and Escape end the
 * line, and a space typed into a button is a space. Closed `<details>` are opened, so their answers can be reached, and closed again after.
 * The listeners stand on `window` in the capture phase — above React's root, so no handler of the
 * page sees a click that only placed a caret.
 */
export function editTexts(root: HTMLElement): () => void {
  const lines = new Map<HTMLElement, Line>();
  const page = document.documentElement;
  const opened = Array.from(root.querySelectorAll("details")).filter((details) => !details.open && !details.closest(CONTROLS));
  for (const details of opened) details.open = true;
  page.setAttribute("data-try-editing", "");

  // Also before every press: what the page rendered since (a card that came back, a status line).
  const scan = () => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const line = lineOf(node as Text);
      if (!line || lines.has(line)) continue;
      lines.set(line, remember(line));
      line.setAttribute(MARK, "");
      line.setAttribute("contenteditable", "plaintext-only");
    }
  };
  const lineAt = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(EDITABLE) : null);
  // A press on a line, or on the rest of a link or button whose words are lines (a tile's picture
  // above its caption, the gap between a wordmark's letters), acts on nothing.
  const hold = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(EDITABLE) && !target.closest("a, button, summary, label")?.querySelector(EDITABLE)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const key = (event: KeyboardEvent) => {
    const line = lineAt(event.target);
    if (!line || !lines.has(line) || event.isComposing) return;
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      line.blur();
    } else if (event.key === " " && line.closest("button, summary")) {
      // A button takes the space bar as a press. `execCommand` is deprecated and has no successor:
      // it is still the one way to type through the browser's own editing, undo included.
      event.preventDefault();
      document.execCommand("insertText", false, " ");
    }
  };
  const settle = (event: Event) => {
    const line = lineAt(event.target);
    const known = line && lines.get(line);
    if (line && known) restore(line, known);
  };
  const listeners: [type: string, listener: EventListener][] = [
    ["pointerdown", scan],
    ["click", hold],
    ["dragstart", hold],
    ["keydown", key as EventListener],
    ["focusout", settle],
  ];
  for (const [type, listener] of listeners) window.addEventListener(type, listener, true);
  scan();

  return () => {
    for (const [type, listener] of listeners) window.removeEventListener(type, listener, true);
    for (const [line, known] of lines) {
      restore(line, known);
      line.removeAttribute("contenteditable");
      line.removeAttribute(MARK);
    }
    for (const details of opened) details.open = false;
    page.removeAttribute("data-try-editing");
  };
}
