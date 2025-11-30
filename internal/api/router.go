package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(10 * time.Second))
	r.Use(cors)

	r.Get("/health", healthHandler)
	r.Get("/search", searchHandler)

	return r
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	filters := parseFilters(r)
	source := sampleListings
	if base, key := listingsConfigFromEnv(); base != "" {
		if remote, err := fetchListingsFromAPI(r.Context(), base, key, filters); err != nil {
			log.Printf("remote listings fetch failed, using demo data: %v", err)
		} else if len(remote) > 0 {
			source = remote
		}
	}

	results := filterListings(filters, source)

	writeJSON(w, http.StatusOK, map[string]any{
		"results": results,
		"total":   len(results),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func parseFilters(r *http.Request) SearchFilters {
	q := r.URL.Query()

	toInt := func(key string) int {
		val := q.Get(key)
		if val == "" {
			return 0
		}
		n, _ := strconv.Atoi(val)
		return n
	}
	toFloat := func(key string) float64 {
		val := q.Get(key)
		if val == "" {
			return 0
		}
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	parseList := func(raw string) []string {
		if raw == "" {
			return nil
		}
		parts := strings.Split(raw, ",")
		var out []string
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		return out
	}

	return SearchFilters{
		MinPrice:         toInt("min_price"),
		MaxPrice:         toInt("max_price"),
		MinBeds:          toInt("min_beds"),
		MaxBeds:          toInt("max_beds"),
		MinBaths:         toFloat("min_baths"),
		MaxBaths:         toFloat("max_baths"),
		MinSqft:          toInt("min_sqft"),
		MaxSqft:          toInt("max_sqft"),
		MinLotSqft:       toInt("min_lot_sqft"),
		MaxLotSqft:       toInt("max_lot_sqft"),
		MinYearBuilt:     toInt("min_year_built"),
		MaxYearBuilt:     toInt("max_year_built"),
		MinStories:       toInt("min_stories"),
		MinGarage:        toInt("min_garage"),
		MinHOA:           toInt("min_hoa"),
		MaxHOA:           toInt("max_hoa"),
		PropertyTypes:    mergePropertyTypes(q.Get("property_type"), q.Get("property_types")),
		Tags:             parseList(q.Get("tags")),
		ExcludeTags:      parseList(q.Get("exclude_tags")),
		City:             q.Get("city"),
		State:            sanitizeAlpha(q.Get("state"), 2),
		Zip:              sanitizeDigits(q.Get("zip"), 10),
		Query:            q.Get("q"),
		UseVision:        boolFromString(q.Get("use_vision")),
		RequirePool:      boolFromString(q.Get("pool")),
		RequireWater:     boolFromString(q.Get("waterfront")),
		RequireView:      boolFromString(q.Get("view")),
		RequireBasement:  boolFromString(q.Get("basement")),
		RequireFireplace: boolFromString(q.Get("fireplace")),
		RequireADU:       boolFromString(q.Get("adu")),
		RequireRVParking: boolFromString(q.Get("rv_parking")),
		RequireNew:       boolFromString(q.Get("new_build")),
		RequireFixer:     boolFromString(q.Get("fixer")),
	}
}

func mergePropertyTypes(single string, csv string) []string {
	all := append(parseSingle(single), parseSingle(csv)...)
	seen := make(map[string]struct{})
	var out []string
	for _, v := range all {
		key := strings.ToLower(strings.TrimSpace(v))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; !ok {
			seen[key] = struct{}{}
			out = append(out, v)
		}
	}
	return out
}

func parseSingle(val string) []string {
	if val == "" {
		return nil
	}
	parts := strings.Split(val, ",")
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func sanitizeDigits(val string, maxLen int) string {
	if val == "" {
		return ""
	}
	out := make([]rune, 0, len(val))
	for _, r := range val {
		if r >= '0' && r <= '9' {
			out = append(out, r)
			if maxLen > 0 && len(out) >= maxLen {
				break
			}
		}
	}
	return string(out)
}

func sanitizeAlpha(val string, maxLen int) string {
	if val == "" {
		return ""
	}
	out := make([]rune, 0, len(val))
	for _, r := range val {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			out = append(out, r)
			if maxLen > 0 && len(out) >= maxLen {
				break
			}
		}
	}
	return string(out)
}
