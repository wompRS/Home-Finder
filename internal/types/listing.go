package types

type Listing struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Price        int      `json:"price"`
	Address      string   `json:"address"`
	City         string   `json:"city"`
	State        string   `json:"state"`
	Zip          string   `json:"zip"`
	Beds         int      `json:"beds"`
	Baths        float64  `json:"baths"`
	Sqft         int      `json:"sqft"`
	LotSqft      int      `json:"lotSqft"`
	PropertyType string   `json:"propertyType"`
	PhotoURL     string   `json:"photoUrl"`
	Tags         []string `json:"tags"`
	Source       string   `json:"source"`
}
