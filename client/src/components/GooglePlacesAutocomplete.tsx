"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Search, MapPin, Loader2, X, Store, Check } from "lucide-react";

interface PlaceResult {
  formattedAddress: string;
  streetAddress: string;
  province: string;
  district: string;
  ward: string;
  lat: number;
  lng: number;
}

interface MapboxAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

interface MapboxSuggestion {
  mapbox_id: string;
  name: string;
  place_formatted?: string;
  full_address?: string;
  feature_type?: string;
  maki?: string;
  _feature?: any;
  _rawHouseNumber?: string;
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Tìm địa điểm, cửa hàng, địa chỉ...",
}: MapboxAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<string>("");
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  const listboxId = useId();

  // Create session token once per mount
  useEffect(() => {
    sessionTokenRef.current = "session-" + Math.random().toString(36).substring(2, 9);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced search via Mapbox Search Box BFF API
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || isSelecting) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: trimmed,
            sessionToken: sessionTokenRef.current,
          }),
        });

        if (!res.ok) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }

        const data = await res.json();
        const items: MapboxSuggestion[] = data?.suggestions || [];

        setSuggestions(items);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Mapbox search error:", err);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isSelecting]);

  const handleSelectSuggestion = async (item: MapboxSuggestion) => {
    setIsSelecting(true);
    setIsOpen(false);
    const displayText = item.name || item.full_address || "";
    setQuery(displayText);
    setLoading(true);

    try {
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapboxId: item.mapbox_id,
          sessionToken: sessionTokenRef.current,
          cachedFeature: item._feature,
          fallbackFullText: displayText,
        }),
      });

      if (!res.ok) {
        throw new Error("Cannot retrieve place details from Mapbox");
      }

      const placeDetails: PlaceResult = await res.json();
      const finalAddress = placeDetails.formattedAddress || displayText;
      setQuery(finalAddress);
      onPlaceSelectRef.current(placeDetails);
    } catch (err) {
      console.error("Mapbox retrieve failed:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsSelecting(false), 200);
    }
  };

  // Allow using exact typed text when user's exact address isn't in Mapbox
  const handleUseTypedAddress = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSelecting(true);
    setIsOpen(false);
    onPlaceSelectRef.current({
      formattedAddress: trimmed,
      streetAddress: trimmed,
      province: "",
      district: "",
      ward: "",
      lat: 0,
      lng: 0,
    });
    setTimeout(() => setIsSelecting(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else if (isOpen && selectedIndex === suggestions.length) {
        handleUseTypedAddress();
      } else if (query.trim()) {
        handleUseTypedAddress();
      }
      return;
    }

    if (!isOpen) return;

    const maxIndex = suggestions.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setIsSelecting(false);
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />

        {loading ? (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isPoi = item.feature_type === "poi";

            return (
              <li
                key={item.mapbox_id || index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleSelectSuggestion(item)}
                className={`flex cursor-pointer items-start gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors select-none ${
                  isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/70"
                }`}
              >
                {isPoi ? (
                  <Store className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                ) : (
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  {item.place_formatted && (
                    <span className="text-xs text-muted-foreground truncate">
                      {item.place_formatted}
                    </span>
                  )}
                </div>
              </li>
            );
          })}

          {/* Option to use exact typed text directly */}
          {query.trim().length >= 2 && (
            <li
              role="option"
              aria-selected={selectedIndex === suggestions.length}
              onMouseEnter={() => setSelectedIndex(suggestions.length)}
              onClick={handleUseTypedAddress}
              className={`flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-xs border-t mt-1 transition-colors select-none ${
                selectedIndex === suggestions.length
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
              <span className="truncate">
                Sử dụng chính xác địa chỉ: <strong className="text-foreground">"{query.trim()}"</strong>
              </span>
            </li>
          )}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground">
        Nhập địa chỉ, cửa hàng hoặc landmark để tự động ghim tọa độ và điền nhanh.
      </p>
    </div>
  );
}
