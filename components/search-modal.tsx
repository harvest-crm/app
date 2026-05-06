"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Briefcase,
  CheckSquare,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearch } from "@/app/actions/search";
import type { SearchResultItem, SearchResults } from "@/app/actions/search";

// ── Context ───────────────────────────────────────────────────────────────────

type SearchCtx = { open: boolean; setOpen: (v: boolean) => void };
const SearchContext = createContext<SearchCtx>({ open: false, setOpen: () => {} });

export function useSearch() {
  return useContext(SearchContext);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<SearchResultItem["type"], React.ElementType> = {
  contact:  Users,
  deal:     Briefcase,
  task:     CheckSquare,
  activity: MessageSquare,
};

const TYPE_LABELS: Record<SearchResultItem["type"], string> = {
  contact:  "Contacts",
  deal:     "Deals",
  task:     "Tasks",
  activity: "Activity",
};

const SECTION_ORDER: SearchResultItem["type"][] = ["contact", "deal", "task", "activity"];

// ── Modal ─────────────────────────────────────────────────────────────────────

export function SearchModal() {
  const { open, setOpen } = useSearch();
  const router = useRouter();

  const [query,          setQuery]          = useState("");
  const [results,        setResults]        = useState<SearchResults | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // Reset + focus when opened/closed
  useEffect(() => {
    if (open) {
      // slight delay so the DOM element is mounted
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    } else {
      setQuery("");
      setResults(null);
      setHighlightIndex(-1);
      setLoading(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      setHighlightIndex(-1);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
      setHighlightIndex(-1);
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${highlightIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  // Build flat list in section-render order for keyboard navigation
  const sections = SECTION_ORDER
    .map((type) => {
      const key = `${type}s` as keyof SearchResults;
      const items = results?.[key] ?? [];
      return { type, items };
    })
    .filter((s) => s.items.length > 0);

  // Rebuild flat list matching section render order
  const orderedAll = sections.flatMap((s) => s.items);

  function navigate(item: SearchResultItem) {
    router.push(item.href);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, orderedAll.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && highlightIndex >= 0 && orderedAll[highlightIndex]) {
      navigate(orderedAll[highlightIndex]);
    }
  }

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, deals, tasks, activities…"
            className="flex-1 py-4 text-sm text-stone-800 outline-none placeholder:text-stone-400"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-400" />
          ) : (
            <kbd className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-400">Esc</kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {query.trim().length < 2 ? (
            <p className="px-4 py-10 text-center text-sm text-stone-400">
              Type to search across contacts, deals, tasks, and activities.
            </p>
          ) : results && sections.length === 0 && !loading ? (
            <p className="px-4 py-10 text-center text-sm text-stone-400">
              No results for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            sections.map(({ type, items }) => {
              const Icon = TYPE_ICONS[type];
              return (
                <div key={type}>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {TYPE_LABELS[type]}
                  </p>
                  {items.map((item) => {
                    const idx = globalIdx++;
                    const highlighted = idx === highlightIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={idx}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          highlighted ? "bg-blue-50" : "hover:bg-stone-50",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-stone-400" />
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "truncate text-sm font-medium",
                            highlighted ? "text-blue-700" : "text-stone-800",
                          )}>
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="truncate text-xs text-stone-400">{item.subtitle}</p>
                          )}
                        </div>
                        {highlighted && (
                          <kbd className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-400">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        {results && sections.length > 0 && (
          <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-stone-400">
            <span><kbd className="rounded bg-stone-100 px-1 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="rounded bg-stone-100 px-1 py-0.5">↵</kbd> open</span>
            <span><kbd className="rounded bg-stone-100 px-1 py-0.5">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
