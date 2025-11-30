package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"home-finder/internal/types"
)

type SearchFilters struct {
	MinPrice         int
	MaxPrice         int
	MinBeds          int
	MaxBeds          int
	MinBaths         float64
	MaxBaths         float64
	MinSqft          int
	MaxSqft          int
	MinLotSqft       int
	MaxLotSqft       int
	MinYearBuilt     int
	MaxYearBuilt     int
	MinStories       int
	MinGarage        int
	MaxHOA           int
	MinHOA           int
	PropertyTypes    []string
	Tags             []string
	ExcludeTags      []string
	City             string
	State            string
	Zip              string
	Query            string
	UseVision        bool
	RequirePool      bool
	RequireWater     bool
	RequireView      bool
	RequireBasement  bool
	RequireFireplace bool
	RequireADU       bool
	RequireRVParking bool
	RequireNew       bool
	RequireFixer     bool
}

// In-memory demo data; swap out with provider/DB later.
var sampleListings = []types.Listing{
	{
		ID:            "demo-001",
		Title:         "Bright Modern Loft",
		Price:         489000,
		Address:       "123 Mint Ave",
		City:          "Portland",
		State:         "OR",
		Zip:           "97204",
		Beds:          2,
		Baths:         2,
		Sqft:          1200,
		LotSqft:       0,
		YearBuilt:     2016,
		Stories:       1,
		GarageSpaces:  1,
		HasRVParking:  false,
		HasPool:       false,
		HasWaterfront: false,
		HasView:       true,
		HasBasement:   false,
		HasFireplace:  true,
		IsNewBuild:    false,
		IsFixer:       false,
		HasADU:        false,
		HOAFee:        320,
		PropertyType:  "Condo",
		PhotoURL:      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80",
		Tags:          []string{"open layout", "city view", "hardwood", "floor-to-ceiling windows", "modern kitchen"},
		VisionTags:    []string{"city view", "open layout", "modern kitchen", "loft"},
		Source:        "demo",
	},
	{
		ID:            "demo-002",
		Title:         "Calm Charcoal Craftsman",
		Price:         729000,
		Address:       "456 Grove St",
		City:          "Seattle",
		State:         "WA",
		Zip:           "98101",
		Beds:          3,
		Baths:         2.5,
		Sqft:          1850,
		LotSqft:       4000,
		YearBuilt:     1928,
		Stories:       2,
		GarageSpaces:  2,
		HasRVParking:  true,
		HasPool:       false,
		HasWaterfront: false,
		HasView:       false,
		HasBasement:   true,
		HasFireplace:  true,
		IsNewBuild:    false,
		IsFixer:       false,
		HasADU:        true,
		HOAFee:        0,
		PropertyType:  "Single Family",
		PhotoURL:      "https://images.unsplash.com/photo-1616594039964-c2c5bea0b2f9?auto=format&fit=crop&w=1600&q=80",
		Tags:          []string{"front porch", "garden", "detached garage", "original trim", "updated kitchen", "rv parking"},
		VisionTags:    []string{"front porch", "rv garage", "two-story", "garden", "detached garage"},
		Source:        "demo",
	},
	{
		ID:            "demo-003",
		Title:         "Mint Courtyard Townhome",
		Price:         615000,
		Address:       "789 Courtyard Ln",
		City:          "Denver",
		State:         "CO",
		Zip:           "80205",
		Beds:          3,
		Baths:         2,
		Sqft:          1500,
		LotSqft:       1800,
		YearBuilt:     2012,
		Stories:       2,
		GarageSpaces:  1,
		HasRVParking:  false,
		HasPool:       false,
		HasWaterfront: false,
		HasView:       true,
		HasBasement:   false,
		HasFireplace:  false,
		IsNewBuild:    false,
		IsFixer:       false,
		HasADU:        false,
		HOAFee:        210,
		PropertyType:  "Townhouse",
		PhotoURL:      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
		Tags:          []string{"patio", "attached garage", "natural light", "mountain glimpse", "two-story"},
		VisionTags:    []string{"patio", "two-story", "attached garage"},
		Source:        "demo",
	},
	{
		ID:            "demo-004",
		Title:         "Minimal Lakeview Flat",
		Price:         540000,
		Address:       "12 Shoreline Dr",
		City:          "Chicago",
		State:         "IL",
		Zip:           "60601",
		Beds:          2,
		Baths:         1.5,
		Sqft:          1100,
		LotSqft:       0,
		YearBuilt:     2004,
		Stories:       1,
		GarageSpaces:  1,
		HasRVParking:  false,
		HasPool:       true,
		HasWaterfront: true,
		HasView:       true,
		HasBasement:   false,
		HasFireplace:  false,
		IsNewBuild:    false,
		IsFixer:       false,
		HasADU:        false,
		HOAFee:        580,
		PropertyType:  "Condo",
		PhotoURL:      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
		Tags:          []string{"lake view", "balcony", "doorman", "fitness center"},
		VisionTags:    []string{"lake view", "balcony", "high-rise"},
		Source:        "demo",
	},
	{
		ID:            "demo-005",
		Title:         "Soft Mint Bungalow",
		Price:         455000,
		Address:       "22 Fern St",
		City:          "Austin",
		State:         "TX",
		Zip:           "78704",
		Beds:          2,
		Baths:         1,
		Sqft:          980,
		LotSqft:       5200,
		YearBuilt:     1974,
		Stories:       1,
		GarageSpaces:  0,
		HasRVParking:  true,
		HasPool:       false,
		HasWaterfront: false,
		HasView:       false,
		HasBasement:   false,
		HasFireplace:  true,
		IsNewBuild:    false,
		IsFixer:       true,
		HasADU:        false,
		HOAFee:        0,
		PropertyType:  "Single Family",
		PhotoURL:      "https://images.unsplash.com/photo-1501127122-f385ca6ddd9d?auto=format&fit=crop&w=1600&q=80",
		Tags:          []string{"back deck", "fenced yard", "mature trees", "carport"},
		VisionTags:    []string{"single story", "back yard", "deck", "fenced yard", "carport"},
		Source:        "demo",
	},
}

func filterListings(filters SearchFilters, listings []types.Listing) []types.Listing {
	var out []types.Listing
	for _, l := range listings {
		if filters.MinPrice > 0 && l.Price < filters.MinPrice {
			continue
		}
		if filters.MaxPrice > 0 && l.Price > filters.MaxPrice {
			continue
		}
		if filters.MinBeds > 0 && l.Beds < filters.MinBeds {
			continue
		}
		if filters.MaxBeds > 0 && l.Beds > filters.MaxBeds {
			continue
		}
		if filters.MinBaths > 0 && l.Baths < filters.MinBaths {
			continue
		}
		if filters.MaxBaths > 0 && l.Baths > filters.MaxBaths {
			continue
		}
		if filters.MinSqft > 0 && l.Sqft < filters.MinSqft {
			continue
		}
		if filters.MaxSqft > 0 && l.Sqft > filters.MaxSqft {
			continue
		}
		if filters.MinLotSqft > 0 && l.LotSqft < filters.MinLotSqft {
			continue
		}
		if filters.MaxLotSqft > 0 && l.LotSqft > filters.MaxLotSqft {
			continue
		}
		if filters.MinYearBuilt > 0 && l.YearBuilt < filters.MinYearBuilt {
			continue
		}
		if filters.MaxYearBuilt > 0 && l.YearBuilt > filters.MaxYearBuilt {
			continue
		}
		if filters.MinStories > 0 && l.Stories < filters.MinStories {
			continue
		}
		if filters.MinGarage > 0 && l.GarageSpaces < filters.MinGarage {
			continue
		}
		if filters.MinHOA > 0 && l.HOAFee < filters.MinHOA {
			continue
		}
		if filters.MaxHOA > 0 && l.HOAFee > filters.MaxHOA {
			continue
		}
		if len(filters.PropertyTypes) > 0 && !matchesAnyPropertyType(l.PropertyType, filters.PropertyTypes) {
			continue
		}
		tagPool := l.Tags
		if filters.UseVision && len(l.VisionTags) > 0 {
			tagPool = append(tagPool, l.VisionTags...)
		}
		if len(filters.Tags) > 0 && !hasAllTags(tagPool, filters.Tags) {
			continue
		}
		if len(filters.ExcludeTags) > 0 && hasAnyTag(tagPool, filters.ExcludeTags) {
			continue
		}
		if filters.City != "" && !strings.Contains(strings.ToLower(l.City), strings.ToLower(filters.City)) {
			continue
		}
		if filters.State != "" && !strings.EqualFold(l.State, filters.State) {
			continue
		}
		if filters.Zip != "" && !strings.HasPrefix(l.Zip, filters.Zip) {
			continue
		}
		if filters.Query != "" && !matchesQuery(l, filters.Query) {
			continue
		}
		if filters.RequirePool && !l.HasPool {
			continue
		}
		if filters.RequireWater && !l.HasWaterfront {
			continue
		}
		if filters.RequireView && !l.HasView {
			continue
		}
		if filters.RequireBasement && !l.HasBasement {
			continue
		}
		if filters.RequireFireplace && !l.HasFireplace {
			continue
		}
		if filters.RequireADU && !l.HasADU {
			continue
		}
		if filters.RequireRVParking && !l.HasRVParking {
			continue
		}
		if filters.RequireNew && !l.IsNewBuild {
			continue
		}
		if filters.RequireFixer && !l.IsFixer {
			continue
		}
		out = append(out, l)
	}
	return out
}

func hasAllTags(listingTags []string, required []string) bool {
	tagSet := make(map[string]struct{}, len(listingTags))
	for _, t := range listingTags {
		tagSet[strings.ToLower(strings.TrimSpace(t))] = struct{}{}
	}
	for _, t := range required {
		if t == "" {
			continue
		}
		if _, ok := tagSet[strings.ToLower(strings.TrimSpace(t))]; !ok {
			return false
		}
	}
	return true
}

func boolFromString(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func matchesQuery(l types.Listing, q string) bool {
	q = strings.ToLower(strings.TrimSpace(q))
	if q == "" {
		return true
	}
	fields := []string{
		l.Title,
		l.Address,
		l.City,
		l.State,
		l.Zip,
		l.PropertyType,
		strings.Join(l.Tags, " "),
	}
	for _, f := range fields {
		if strings.Contains(strings.ToLower(f), q) {
			return true
		}
	}
	return false
}

func hasAnyTag(listingTags []string, unwanted []string) bool {
	tagSet := make(map[string]struct{}, len(listingTags))
	for _, t := range listingTags {
		tagSet[strings.ToLower(strings.TrimSpace(t))] = struct{}{}
	}
	for _, t := range unwanted {
		if _, ok := tagSet[strings.ToLower(strings.TrimSpace(t))]; ok {
			return true
		}
	}
	return false
}

func matchesAnyPropertyType(pt string, allowed []string) bool {
	for _, a := range allowed {
		if strings.EqualFold(pt, strings.TrimSpace(a)) {
			return true
		}
	}
	return false
}

// fetchListingsFromAPI calls an external listing API (if configured) and maps results.
// The external API is expected to return JSON shaped as {"results": [ ... listings ... ]}.
func fetchListingsFromAPI(ctx context.Context, baseURL, apiKey string, filters SearchFilters) ([]types.Listing, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	q := url.Values{}
	if filters.MinPrice > 0 {
		q.Set("min_price", fmt.Sprintf("%d", filters.MinPrice))
	}
	if filters.MaxPrice > 0 {
		q.Set("max_price", fmt.Sprintf("%d", filters.MaxPrice))
	}
	if filters.MinBeds > 0 {
		q.Set("min_beds", fmt.Sprintf("%d", filters.MinBeds))
	}
	if filters.MaxBeds > 0 {
		q.Set("max_beds", fmt.Sprintf("%d", filters.MaxBeds))
	}
	if filters.MinBaths > 0 {
		q.Set("min_baths", fmt.Sprintf("%g", filters.MinBaths))
	}
	if filters.MaxBaths > 0 {
		q.Set("max_baths", fmt.Sprintf("%g", filters.MaxBaths))
	}
	if filters.MinSqft > 0 {
		q.Set("min_sqft", fmt.Sprintf("%d", filters.MinSqft))
	}
	if filters.MaxSqft > 0 {
		q.Set("max_sqft", fmt.Sprintf("%d", filters.MaxSqft))
	}
	if filters.MinLotSqft > 0 {
		q.Set("min_lot_sqft", fmt.Sprintf("%d", filters.MinLotSqft))
	}
	if filters.MaxLotSqft > 0 {
		q.Set("max_lot_sqft", fmt.Sprintf("%d", filters.MaxLotSqft))
	}
	if filters.MinYearBuilt > 0 {
		q.Set("min_year_built", fmt.Sprintf("%d", filters.MinYearBuilt))
	}
	if filters.MaxYearBuilt > 0 {
		q.Set("max_year_built", fmt.Sprintf("%d", filters.MaxYearBuilt))
	}
	if filters.MinStories > 0 {
		q.Set("min_stories", fmt.Sprintf("%d", filters.MinStories))
	}
	if filters.MinGarage > 0 {
		q.Set("min_garage", fmt.Sprintf("%d", filters.MinGarage))
	}
	if filters.MinHOA > 0 {
		q.Set("min_hoa", fmt.Sprintf("%d", filters.MinHOA))
	}
	if filters.MaxHOA > 0 {
		q.Set("max_hoa", fmt.Sprintf("%d", filters.MaxHOA))
	}
	if len(filters.PropertyTypes) > 0 {
		q.Set("property_types", strings.Join(filters.PropertyTypes, ","))
	}
	if len(filters.Tags) > 0 {
		q.Set("tags", strings.Join(filters.Tags, ","))
	}
	if len(filters.ExcludeTags) > 0 {
		q.Set("exclude_tags", strings.Join(filters.ExcludeTags, ","))
	}
	if filters.City != "" {
		q.Set("city", filters.City)
	}
	if filters.State != "" {
		q.Set("state", filters.State)
	}
	if filters.Zip != "" {
		q.Set("zip", filters.Zip)
	}
	if filters.Query != "" {
		q.Set("q", filters.Query)
	}
	if filters.UseVision {
		q.Set("use_vision", "1")
	}
	if filters.RequirePool {
		q.Set("pool", "1")
	}
	if filters.RequireWater {
		q.Set("waterfront", "1")
	}
	if filters.RequireView {
		q.Set("view", "1")
	}
	if filters.RequireBasement {
		q.Set("basement", "1")
	}
	if filters.RequireFireplace {
		q.Set("fireplace", "1")
	}
	if filters.RequireADU {
		q.Set("adu", "1")
	}
	if filters.RequireRVParking {
		q.Set("rv_parking", "1")
	}
	if filters.RequireNew {
		q.Set("new_build", "1")
	}
	if filters.RequireFixer {
		q.Set("fixer", "1")
	}

	apiURL := fmt.Sprintf("%s/search", strings.TrimRight(baseURL, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.URL.RawQuery = q.Encode()
	if apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("upstream status %d", resp.StatusCode)
	}
	var payload struct {
		Results []types.Listing `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Results, nil
}

func listingsConfigFromEnv() (string, string) {
	return os.Getenv("LISTINGS_API_BASE"), os.Getenv("LISTINGS_API_KEY")
}
