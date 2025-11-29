package api

import (
	"encoding/json"
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
	results := filterListings(filters)

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

	tagsRaw := q.Get("tags")
	var tags []string
	if tagsRaw != "" {
		parts := strings.Split(tagsRaw, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				tags = append(tags, p)
			}
		}
	}

	return SearchFilters{
		MinPrice:     toInt("min_price"),
		MaxPrice:     toInt("max_price"),
		MinBeds:      toInt("min_beds"),
		MinBaths:     toFloat("min_baths"),
		PropertyType: q.Get("property_type"),
		Tags:         tags,
		City:         q.Get("city"),
		State:        q.Get("state"),
		Zip:          q.Get("zip"),
		Query:        q.Get("q"),
	}
}
