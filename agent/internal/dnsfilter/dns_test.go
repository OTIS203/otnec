package dnsfilter

import (
	"encoding/binary"
	"testing"
)

func buildTestQuery(id uint16, domain string, qtype uint16) []byte {
	buf := make([]byte, 12)
	binary.BigEndian.PutUint16(buf[0:2], id)
	binary.BigEndian.PutUint16(buf[2:4], 0x0100) // Standard query, RD=1
	binary.BigEndian.PutUint16(buf[4:6], 1)      // QDCOUNT = 1

	// Encode domain labels
	parts := []string{"api", "tiktokv", "com"}
	if domain == "google.com" {
		parts = []string{"google", "com"}
	} else if domain == "instagram.com" {
		parts = []string{"instagram", "com"}
	}

	for _, p := range parts {
		buf = append(buf, byte(len(p)))
		buf = append(buf, []byte(p)...)
	}
	buf = append(buf, 0x00) // null terminator

	qEnd := make([]byte, 4)
	binary.BigEndian.PutUint16(qEnd[0:2], qtype)
	binary.BigEndian.PutUint16(qEnd[2:4], ClassIN)
	buf = append(buf, qEnd...)

	return buf
}

func TestFilterEngineClassification(t *testing.T) {
	engine := NewFilterEngine(true) // social media blocked

	cases := []struct {
		domain    string
		category  Category
		service   string
		isBlocked bool
	}{
		{"api.tiktokv.com", CategorySocialMedia, "TikTok", true},
		{"v16.tiktokcdn.com", CategorySocialMedia, "TikTok", true},
		{"instagram.com", CategorySocialMedia, "Instagram", true},
		{"static.xx.fbcdn.net", CategorySocialMedia, "Facebook", true},
		{"x.com", CategorySocialMedia, "X (Twitter)", true},
		{"snapchat.com", CategorySocialMedia, "Snapchat", true},
		{"google.com", CategoryGeneral, "Standard Web", false},
	}

	for _, tc := range cases {
		res := engine.Classify(tc.domain)
		if res.Category != tc.category {
			t.Errorf("expected category %s for %s, got %s", tc.category, tc.domain, res.Category)
		}
		if res.IsBlocked != tc.isBlocked {
			t.Errorf("expected blocked=%v for %s, got %v", tc.isBlocked, tc.domain, res.IsBlocked)
		}
	}

	// Disable blocking
	engine.SetBlockSocialMedia(false)
	res := engine.Classify("instagram.com")
	if res.IsBlocked {
		t.Errorf("expected instagram.com to be allowed when blockSocialMedia=false")
	}
}

func TestParseDNSQueryAndSinkhole(t *testing.T) {
	raw := buildTestQuery(0x1234, "api.tiktokv.com", TypeA)

	query, err := ParseDNSQuery(raw)
	if err != nil {
		t.Fatalf("failed to parse DNS query: %v", err)
	}

	if query.ID != 0x1234 {
		t.Errorf("expected ID 0x1234, got 0x%x", query.ID)
	}
	if len(query.Questions) != 1 {
		t.Fatalf("expected 1 question, got %d", len(query.Questions))
	}
	if query.Questions[0].Name != "api.tiktokv.com" {
		t.Errorf("expected api.tiktokv.com, got %s", query.Questions[0].Name)
	}

	sinkhole := BuildSinkholeResponse(query)
	if sinkhole == nil {
		t.Fatal("expected sinkhole response, got nil")
	}

	respID := binary.BigEndian.Uint16(sinkhole[0:2])
	if respID != 0x1234 {
		t.Errorf("sinkhole ID mismatch: expected 0x1234, got 0x%x", respID)
	}

	ancount := binary.BigEndian.Uint16(sinkhole[6:8])
	if ancount != 1 {
		t.Errorf("expected ANCOUNT=1, got %d", ancount)
	}

	// Verify last 4 bytes are 0.0.0.0
	rdata := sinkhole[len(sinkhole)-4:]
	if rdata[0] != 0 || rdata[1] != 0 || rdata[2] != 0 || rdata[3] != 0 {
		t.Errorf("expected 0.0.0.0 in sinkhole answer, got %v", rdata)
	}
}
