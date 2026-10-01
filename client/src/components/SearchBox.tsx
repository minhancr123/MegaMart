"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchSuggestions, type ProductSuggestion } from "@/lib/productApi";
import { formatPrice } from "@/lib/utils";

const DEBOUNCE_MS = 300;
const SUGGEST_LIMIT = 6;
const MIN_CHARS = 2;

/** Từ khóa được tìm nhiều, hiện khi ô search focus mà chưa gõ đủ ký tự. */
const POPULAR_SEARCHES = [
  "tivi samsung",
  "máy lạnh",
  "tủ lạnh",
  "máy giặt",
  "iphone",
  "nồi chiên không dầu",
];

interface SearchBoxProps {
  formClassName?: string;
  inputClassName?: string;
  /** Kiểu nút submit: icon tròn (desktop) hoặc thanh cam (mobile). */
  submitVariant?: "icon" | "bar";
  autoFocus?: boolean;
  /** Gọi sau khi chuyển trang (để Header đóng menu mobile). */
  onNavigate?: () => void;
}

/** In đậm đoạn khớp từ khóa trong tên sản phẩm. */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  const i = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <span className="text-[#ff4d00]">{name.slice(i, i + q.length)}</span>
      {name.slice(i + q.length)}
    </>
  );
}

export default function SearchBox({
  formClassName,
  inputClassName,
  submitVariant = "icon",
  autoFocus,
  onNavigate,
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Debounce: gõ xong 300ms mới gọi API, request cũ về sau bị bỏ.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      setActiveIdx(-1);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      const res = await fetchSuggestions(q, SUGGEST_LIMIT);
      if (requestId.current !== id) return;
      setItems(res);
      setActiveIdx(-1);
      setLoading(false);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Click ra ngoài thì đóng dropdown.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Giữ dòng đang chọn luôn hiện trong khung cuộn.
  useEffect(() => {
    if (activeIdx >= 0) itemRefs.current[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const goProduct = (item: ProductSuggestion) => {
    setOpen(false);
    onNavigate?.();
    router.push(`/product/${item.id}`);
  };

  const submitAll = (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    // Không setQuery(q): vừa navigate là unmount, set state chỉ kích
    // debounce gọi thêm một request gợi ý vô ích.
    setOpen(false);
    onNavigate?.();
    router.push(`/search?query=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        if (items.length) setOpen(true);
        return;
      }
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        if (items.length) setOpen(true);
        return;
      }
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (open && activeIdx >= 0 && items[activeIdx]) {
        e.preventDefault();
        goProduct(items[activeIdx]);
      }
      // Không có dòng nào active thì để form submit thường (xem tất cả).
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open;
  const hasQuery = query.trim().length >= MIN_CHARS;

  return (
    <div ref={boxRef} className={`relative ${formClassName ?? ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitAll();
        }}
        className="flex w-full"
        role="search"
      >
        <Input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm kiếm sản phẩm..."
          aria-expanded={showDropdown}
          aria-label="Tìm kiếm sản phẩm"
          className={inputClassName}
        />
        {submitVariant === "icon" ? (
          <Button
            type="submit"
            size="icon"
            aria-label="Tìm kiếm"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-transparent text-zinc-500 shadow-none hover:bg-orange-50 hover:text-[#ff4d00]"
          >
            <Search className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button type="submit" className="h-10 shrink-0 rounded-r-full bg-[#ff4d00] text-white hover:bg-[#d94100]">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          {hasQuery ? (
            <>
              {loading && (
                <div className="space-y-2 px-3 py-3" aria-label="Đang tải gợi ý">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-3/4 rounded bg-zinc-100" />
                        <div className="h-3 w-1/3 rounded bg-zinc-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && items.length === 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitAll()}
                  className="block w-full px-4 py-3 text-left text-sm text-zinc-500 hover:bg-orange-50"
                >
                  Không thấy gợi ý cho “{query.trim()}” — nhấn Enter để tìm tất cả
                </button>
              )}

              {!loading && items.length > 0 && (
                <ul role="listbox" className="max-h-[60vh] overflow-y-auto py-1.5">
                  {items.map((item, i) => (
                    <li key={item.id} role="option" aria-selected={i === activeIdx}>
                      <button
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goProduct(item)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                          i === activeIdx ? "bg-orange-50" : "hover:bg-orange-50/60"
                        }`}
                      >
                        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-zinc-100">
                          <Search className="h-4 w-4 text-zinc-300" />
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900">
                            <HighlightedName name={item.name} query={query} />
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {item.brand ?? "MegaMart"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-[#ff4d00]">
                          {formatPrice(item.price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!loading && items.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitAll()}
                  className="flex w-full items-center justify-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-[#c53b00] hover:bg-orange-50"
                >
                  <Search className="h-4 w-4" /> Xem tất cả kết quả cho “{query.trim()}”
                </button>
              )}
            </>
          ) : (
            <div className="py-1.5">
              <p className="flex items-center gap-1.5 px-4 pb-1.5 pt-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
                <Flame className="h-3.5 w-3.5" /> Tìm kiếm phổ biến
              </p>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitAll(term)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-orange-50"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
