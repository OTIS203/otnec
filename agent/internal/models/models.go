package models

import "time"

// DeviceType classifies the device function.
type DeviceType string

const (
	DeviceTypeUnknown    DeviceType = "unknown"
	DeviceTypePC         DeviceType = "pc"
	DeviceTypePhone       DeviceType = "phone"
	DeviceTypeIoT        DeviceType = "iot"
	DeviceTypeSmartTV    DeviceType = "smart_tv"
	DeviceTypePrinter    DeviceType = "printer"
	DeviceTypeRouter     DeviceType = "router"
	DeviceTypeServer     DeviceType = "server"
	DeviceTypeCamera     DeviceType = "camera"
)

// TrustLevel denotes security posture tag.
type TrustLevel string

const (
	TrustLevelUnknown    TrustLevel = "unknown"
	TrustLevelTrusted    TrustLevel = "trusted"
	TrustLevelGuest      TrustLevel = "guest"
	TrustLevelQuarantined TrustLevel = "quarantined"
)

// DiscoveredPort represents an open TCP/UDP port on a host.
type DiscoveredPort struct {
	Port        int    `json:"port"`
	Protocol    string `json:"protocol"` // "tcp" | "udp"
	ServiceName string `json:"service_name"`
	Banner      string `json:"banner,omitempty"`
	IsRisky     bool   `json:"is_risky"`
}

// DiscoveredDevice represents an identified host on the local network.
type DiscoveredDevice struct {
	IPAddress      string           `json:"ip_address"`
	MACAddress     string           `json:"mac_address,omitempty"`
	Hostname       string           `json:"hostname,omitempty"`
	Vendor         string           `json:"vendor,omitempty"`
	DeviceType     DeviceType       `json:"device_type"`
	OSGuess        string           `json:"os_guess,omitempty"`
	OpenPorts      []DiscoveredPort `json:"open_ports,omitempty"`
	DiscoveryProtocols []string     `json:"discovery_protocols"` // e.g., ["arp", "mdns", "ssdp"]
	IsAlive        bool             `json:"is_alive"`
	ResponseTimeMs float64          `json:"response_time_ms"`
	FirstSeenAt    time.Time        `json:"first_seen_at"`
	LastSeenAt     time.Time        `json:"last_seen_at"`
}

// SubnetInfo contains details of the local network interface.
type SubnetInfo struct {
	InterfaceName  string   `json:"interface_name"`
	IPAddress      string   `json:"ip_address"`
	SubnetCIDR     string   `json:"subnet_cidr"`
	NetworkAddress string   `json:"network_address"`
	BroadcastIP    string   `json:"broadcast_ip"`
	GatewayIP      string   `json:"gateway_ip,omitempty"`
	GatewayMAC     string   `json:"gateway_mac,omitempty"`
	TotalHosts     int      `json:"total_hosts"`
	DNSServers     []string `json:"dns_servers,omitempty"`
}

// NetworkHealthMetrics contains ping and DNS performance telemetry.
type NetworkHealthMetrics struct {
	Timestamp      time.Time `json:"timestamp"`
	GatewayLatency float64   `json:"gateway_latency_ms"`
	InternetLatency float64  `json:"internet_latency_ms"`
	JitterMs       float64   `json:"jitter_ms"`
	PacketLossPct  float64   `json:"packet_loss_pct"`
	DNSLookupMs    float64   `json:"dns_lookup_ms"`
	DNSServerUsed  string    `json:"dns_server_used"`
	Status         string    `json:"status"` // "excellent" | "fair" | "degraded" | "down"
}

// SecurityAuditFinding holds identified risks for the network or device.
type SecurityAuditFinding struct {
	Type        string `json:"type"`        // "RISKY_PORT" | "ROGUE_DHCP" | "ARP_SPOOF" | "DNS_HIJACK"
	Severity    string `json:"severity"`    // "info" | "warning" | "critical"
	TargetIP    string `json:"target_ip"`
	TargetMAC   string `json:"target_mac,omitempty"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Remediation string `json:"remediation"`
}

// ScanReport encapsulates complete scan execution results.
type ScanReport struct {
	ScanID         string                 `json:"scan_id"`
	AgentID        string                 `json:"agent_id"`
	Subnet         string                 `json:"subnet"`
	StartedAt      time.Time              `json:"started_at"`
	CompletedAt    time.Time              `json:"completed_at"`
	DurationMs     int64                  `json:"duration_ms"`
	TotalHosts     int                    `json:"total_hosts"`
	ActiveHosts    int                    `json:"active_hosts"`
	Devices        []DiscoveredDevice     `json:"devices"`
	Findings       []SecurityAuditFinding `json:"findings"`
	HealthMetrics  NetworkHealthMetrics   `json:"health_metrics"`
	SecurityScore  int                    `json:"security_score"`
}

