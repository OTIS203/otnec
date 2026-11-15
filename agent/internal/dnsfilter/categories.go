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
	{"TikTok", "tiktokcdn-us.com"},
	{"TikTok", "tiktokv.us"},
	{"TikTok", "byteoversea.com"},
	{"TikTok", "byteoversea.net"},
	{"TikTok", "ibytedtos.com"},
	{"TikTok", "ibyteimg.com"},
	{"TikTok", "bytegecko.com"},
	{"TikTok", "musical.ly"},
	{"TikTok", "ttwstatic.com"},

	// Meta / Instagram / Facebook / Threads / Messenger
	{"Instagram", "instagram.com"},
	{"Instagram", "cdninstagram.com"},
	{"Instagram", "ig.me"},
	{"Facebook", "facebook.com"},
	{"Facebook", "fbcdn.net"},
	{"Facebook", "fbsbx.com"},
	{"Facebook", "meta.com"},
	{"Facebook", "fb.com"},
	{"Facebook", "fb.me"},
	{"Facebook", "facebook.net"},
	{"Facebook", "messenger.com"},
	{"Threads", "threads.net"},

	// X / Twitter
	{"X (Twitter)", "twitter.com"},
	{"X (Twitter)", "x.com"},
	{"X (Twitter)", "t.co"},
	{"X (Twitter)", "twimg.com"},
	{"X (Twitter)", "twitterstat.us"},

	// Snapchat
	{"Snapchat", "snapchat.com"},
	{"Snapchat", "sc-cdn.net"},
	{"Snapchat", "snap-dev.net"},
	{"Snapchat", "snapkit.com"},

	// Reddit
	{"Reddit", "reddit.com"},
	{"Reddit", "redd.it"},
	{"Reddit", "redditmedia.com"},
	{"Reddit", "redditstatic.com"},

	// Pinterest
	{"Pinterest", "pinterest.com"},
	{"Pinterest", "pinimg.com"},

	// LinkedIn
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
	{"YouTube", "youtubei.googleapis.com"},
	{"YouTube", "yt3.ggpht.com"},
	{"Netflix", "netflix.com"},
	{"Netflix", "nflxext.com"},
	{"Netflix", "nflxvideo.net"},
	{"Netflix", "nflximg.net"},
	{"Netflix", "nflxso.net"},
	{"Twitch", "twitch.tv"},
	{"Twitch", "ttvnw.net"},
	{"Twitch", "jtvnw.net"},
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

// SetCustomBlacklist updates the active custom blacklisted domains.
func (fe *FilterEngine) SetCustomBlacklist(domains []string) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.customBlacklist = make(map[string]bool, len(domains))
	for _, d := range domains {
		clean := strings.ToLower(strings.Trim(d, "."))
		if clean != "" {
			fe.customBlacklist[clean] = true
		}
	}
}

// SetCustomWhitelist updates the active custom whitelisted domains.
func (fe *FilterEngine) SetCustomWhitelist(domains []string) {
	fe.mu.Lock()
	defer fe.mu.Unlock()
	fe.customWhitelist = make(map[string]bool, len(domains))
	for _, d := range domains {
		clean := strings.ToLower(strings.Trim(d, "."))
		if clean != "" {
			fe.customWhitelist[clean] = true
		}
	}
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

	// 2b. Apple iCloud Private Relay bypass protection (per official Apple enterprise spec:
	// returning 0.0.0.0 for mask.icloud.com signals iOS to disable Private Relay on this Wi-Fi)
	if clean == "mask.icloud.com" || clean == "mask-h2.icloud.com" ||
		strings.HasSuffix(clean, ".mask.icloud.com") || strings.HasSuffix(clean, ".mask-h2.icloud.com") {
		return MatchResult{
			Category:    CategoryGeneral,
			ServiceName: "iCloud Private Relay Bypass Guard",
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

