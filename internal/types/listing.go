package types

type Listing struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Price         int      `json:"price"`
	Address       string   `json:"address"`
	City          string   `json:"city"`
	State         string   `json:"state"`
	Zip           string   `json:"zip"`
	Beds          int      `json:"beds"`
	Baths         float64  `json:"baths"`
	Sqft          int      `json:"sqft"`
	LotSqft       int      `json:"lotSqft"`
	YearBuilt     int      `json:"yearBuilt"`
	Stories       int      `json:"stories"`
	GarageSpaces  int      `json:"garageSpaces"`
	HasRVParking  bool     `json:"hasRvParking"`
	HasPool       bool     `json:"hasPool"`
	HasWaterfront bool     `json:"hasWaterfront"`
	HasView       bool     `json:"hasView"`
	HasBasement   bool     `json:"hasBasement"`
	HasFireplace  bool     `json:"hasFireplace"`
	IsNewBuild    bool     `json:"isNewBuild"`
	IsFixer       bool     `json:"isFixer"`
	HasADU        bool     `json:"hasAdu"`
	HOAFee        int      `json:"hoaFee"`
	PropertyType  string   `json:"propertyType"`
	PhotoURL      string   `json:"photoUrl"`
	Tags          []string `json:"tags"`
	VisionTags    []string `json:"visionTags,omitempty"`
	Source        string   `json:"source"`
}
