package dnsfilter

import (
	"strings"
	"sync"
)

// Category represents a content category.
type Category string

const (
	CategorySocialMedia Category = "Social Media"
	CategoryStreaming   Category = "Streaming Video"
	CategoryGaming      Category = "Gaming"
	CategoryGeneral     Category = "General / Allowed"
)

// MatchResult contains classification details for a domain query.
type MatchResult struct {
	Category    Category `json:"category"`
	ServiceName string   `json:"service_name"`
	IsBlocked   bool     `json:"is_blocked"`
}

// FilterEngine matches domain queries against known platforms and configurable rules.
type FilterEngine struct {
	mu                sync.RWMutex
	blockSocialMedia  bool
	blockStreaming    bool
	blockGaming       bool
	customBlacklist   map[string]bool
	customWhitelist   map[string]bool
}

// NewFilterEngine returns a filter engine with default policy options.
func NewFilterEngine(blockSocialMedia bool) *FilterEngine {
	return &FilterEngine{
		blockSocialMedia: blockSocialMedia,
		blockStreaming:   false,
		blockGaming:      false,
		customBlacklist:  make(map[string]bool),
		customWhitelist:  make(map[string]bool),
	}
}

// Known social media domain suffixes and keywords.
var socialMediaDomains = []struct {
	service string
	pattern string
}{
	// TikTok / ByteDance
	{"TikTok", "tiktok.com"},
	{"TikTok", "tiktokv.com"},
	{"TikTok", "tiktokcdn.com"},
	{"TikTok", "byteoversea.com"},
	{"TikTok", "musical.ly"},

	// Meta / Instagram / Facebook / Threads / WhatsApp Web
	{"Instagram", "instagram.com"},
	{"Instagram", "cdninstagram.com"},
	{"Facebook", "facebook.com"},
	{"Facebook", "fbcdn.net"},
	{"Facebook", "fbsbx.com"},
	{"Facebook", "meta.com"},
	{"Threads", "threads.net"},

	// X / Twitter
	{"X (Twitter)", "twitter.com"},
	{"X (Twitter)", "x.com"},
	{"X (Twitter)", "t.co"},
	{"X (Twitter)", "twimg.com"},

	// Snapchat
	{"Snapchat", "snapchat.com"},
	{"Snapchat", "sc-cdn.net"},

	// Reddit
	{"Reddit", "reddit.com"},
	{"Reddit", "redd.it"},
	{"Reddit", "redditmedia.com"},

	// Pinterest
	{"Pinterest", "pinterest.com"},
	{"Pinterest", "pinimg.com"},

	// LinkedIn (if classified under social)
	{"LinkedIn", "linkedin.com"},
	{"LinkedIn", "licdn.com"},
}

// Known video streaming domain suffixes.
var streamingDomains = []struct {
	service string
	pattern string
}{
	{"YouTube", "youtube.com"},
	{"YouTube", "youtu.be"},
	{"YouTube", "googlevideo.com"},
	{"YouTube", "ytimg.com"},
	{"Netflix", "netflix.com"},
	{"Netflix", "nflxext.com"},
	{"Netflix", "nflxvideo.net"},
	{"Twitch", "twitch.tv"},
	{"Twitch", "ttvnw.net"},
}

// SetBlockSocialMedia toggles blocking for social media platforms.
func (fe *FilterEngine) SetBlockSocialMedia(enabled bool) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.blockSocialMedia = enabled
}

// SetBlockStreaming toggles blocking for streaming platforms.
func (fe *FilterEngine) SetBlockStreaming(enabled bool) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.blockStreaming = enabled
}

// AddCustomBlacklist adds a domain rule to block.
func (fe *FilterEngine) AddCustomBlacklist(domain string) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.customBlacklist[strings.ToLower(strings.Trim(domain, "."))] = true
}

// AddCustomWhitelist adds a domain rule to exempt.
func (fe *FilterEngine) AddCustomWhitelist(domain string) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.customWhitelist[strings.ToLower(strings.Trim(domain, "."))] = true
}

// Classify inspects a domain name and evaluates whether it should be sinkholed.
func (fe *FilterEngine) Classify(domain string) MatchResult {
	fe.mu.RLock()
	defer fe.mu.RUnlock()

	clean := strings.ToLower(strings.Trim(domain, "."))

	// 1. Whitelist override
	if fe.customWhitelist[clean] {
		return MatchResult{
			Category:    CategoryGeneral,
			ServiceName: "Whitelisted",
			IsBlocked:   false,
		}
	}

	// 2. Custom Blacklist check
	if fe.customBlacklist[clean] {
		return MatchResult{
			Category:    CategorySocialMedia,
			ServiceName: "Custom Blocklist",
			IsBlocked:   true,
		}
	}

	// 3. Social Media checks
	for _, entry := range socialMediaDomains {
		if clean == entry.pattern || strings.HasSuffix(clean, "."+entry.pattern) {
			return MatchResult{
				Category:    CategorySocialMedia,
				ServiceName: entry.service,
				IsBlocked:   fe.blockSocialMedia,
			}
		}
	}

	// 4. Video Streaming checks
	for _, entry := range streamingDomains {
		if clean == entry.pattern || strings.HasSuffix(clean, "."+entry.pattern) {
			return MatchResult{
				Category:    CategoryStreaming,
				ServiceName: entry.service,
				IsBlocked:   fe.blockStreaming,
			}
		}
	}

	// 5. Default allowed
	return MatchResult{
		Category:    CategoryGeneral,
		ServiceName: "Standard Web",
		IsBlocked:   false,
	}
}

