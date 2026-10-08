"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/** All chapters ship as HTML. Only an eligible, hydrated desktop gets a sticky stage.
 * Native page scrolling drives it; there is no wheel interception or body scroll lock. */
export function LandingStory({ chapters, presentation }: {
  chapters: { id: string; content: ReactNode }[];
  presentation?: "story" | "document";
}) {
  const root = useRef<HTMLDivElement>(null);
  const [story, setStory] = useState(false);
  const [active, setActive] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const t = useTranslations("story");

  useEffect(() => {
    const node = root.current;
    if (!node || presentation === "document" || chapters.length < 2) return;
    const media = matchMedia("(min-width: 1024px) and (min-height: 700px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const syncMode = () => {
      node.style.setProperty("--story-top", `${document.querySelector("header")?.getBoundingClientRect().height ?? 76}px`);
      setStory(media.matches);
    };
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, [presentation, chapters.length]);

  useEffect(() => {
    const node = root.current;
    if (!node || !story) return;
    const panels = Array.from(node.querySelectorAll<HTMLElement>("[data-story-panel]"));
    setLabels(panels.map((panel) => panel.querySelector("h1,h2")?.textContent ?? ""));
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = node.querySelector<HTMLElement>("[data-story-stage]")!.clientHeight;
      const top = parseFloat(getComputedStyle(node).getPropertyValue("--story-top"));
      const distance = Math.max(0, -node.getBoundingClientRect().top + top);
      const index = Math.min(panels.length - 1, Math.floor(distance / height));
      setActive(index);
      // If scrolling leaves a focused control behind, keep focus in the current chapter.
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && panels.some((p, i) => i !== index && p.contains(focused))) {
        panels[index].focus({ preventScroll: true });
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onHash = () => {
      let id: string;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id)?.closest<HTMLElement>("[data-story-panel]");
      const index = target ? panels.indexOf(target) : -1;
      if (index >= 0) goTo(index);
    };
    const observer = new ResizeObserver(() => {
      node.style.setProperty("--story-top", `${document.querySelector("header")?.getBoundingClientRect().height ?? 76}px`);
      onScroll();
    });
    observer.observe(node);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onHash);
    update();
    onHash();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onHash);
    };
  }, [story, chapters.length]);

  function goTo(index: number) {
    const node = root.current!;
    const height = node.querySelector<HTMLElement>("[data-story-stage]")!.clientHeight;
    const top = parseFloat(getComputedStyle(node).getPropertyValue("--story-top"));
    window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top - top + index * height + 1, behavior: "instant" });
    setActive(index);
  }

  return (
    <div ref={root} data-landing-mode={story ? "story" : "document"}
      style={{ "--chapters": chapters.length } as CSSProperties}
      onClickCapture={(event) => {
        if (!story || !(event.target instanceof Element)) return;
        const anchor = event.target.closest("a");
        if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const url = new URL(anchor.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
        let id: string;
        try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
        const target = document.getElementById(id)?.closest<HTMLElement>("[data-story-panel]");
        const index = target ? chapters.findIndex((c) => c.id === target.dataset.storyPanel) : -1;
        if (index >= 0) {
          event.preventDefault();
          event.stopPropagation();
          history.replaceState(null, "", url.hash);
          goTo(index);
          target!.focus({ preventScroll: true });
        }
      }}>
      <div data-story-stage>
        {chapters.map((chapter, i) => (
          <div key={chapter.id} id={`chapter-${chapter.id}`} data-story-panel={chapter.id}
            data-active={i === active} tabIndex={-1}
            inert={story && i !== active ? true : undefined}
            aria-hidden={story && i !== active ? true : undefined}>
            {chapter.content}
          </div>
        ))}
        {story && <nav data-story-navigation aria-label={t("chapters")}>
          {chapters.map((chapter, i) => (
            <button key={chapter.id} type="button" aria-label={labels[i] || t("chapter", { number: i + 1 })}
              aria-controls={`chapter-${chapter.id}`} aria-current={i === active ? "step" : undefined}
              onClick={() => goTo(i)}>
              <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </nav>}
      </div>
    </div>
  );
}
