package vision

// Client defines the contract for vision feature extraction.
// In production, implement using a hosted vision model (e.g., GPT-4o mini vision).
type Client interface {
	ExtractFeatures(photoURL string) (Features, error)
}

// Features represents detected tags with confidences.
type Features struct {
	Tags map[string]float64
}

// StubClient is a no-op vision client for local/demo use.
type StubClient struct {
	DefaultTags map[string]float64
}

func (s StubClient) ExtractFeatures(_ string) (Features, error) {
	return Features{Tags: s.DefaultTags}, nil
}
