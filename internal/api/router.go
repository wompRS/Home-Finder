package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"home-finder/internal/types"
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
	sample := []types.Listing{
		{
			ID:           "demo-001",
			Title:        "Bright Modern Loft",
			Price:        489000,
			Address:      "123 Mint Ave",
			City:         "Portland",
			State:        "OR",
			Zip:          "97204",
			Beds:         2,
			Baths:        2,
			Sqft:         1200,
			LotSqft:      0,
			PropertyType: "Condo",
			PhotoURL:     "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
			Tags:         []string{"open layout", "city view", "hardwood"},
			Source:       "demo",
		},
		{
			ID:           "demo-002",
			Title:        "Calm Charcoal Craftsman",
			Price:        729000,
			Address:      "456 Grove St",
			City:         "Seattle",
			State:        "WA",
			Zip:          "98101",
			Beds:         3,
			Baths:        2.5,
			Sqft:         1850,
			LotSqft:      4000,
			PropertyType: "Single Family",
			PhotoURL:     "https://images.unsplash.com/photo-1616594039964-c2c5bea0b2f9?auto=format&fit=crop&w=1200&q=80",
			Tags:         []string{"front porch", "garden", "detached garage"},
			Source:       "demo",
		},
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"results": sample,
		"total":   len(sample),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
