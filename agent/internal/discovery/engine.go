package discovery

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/netscope/netscope/agent/internal/fingerprint"
	"github.com/netscope/netscope/agent/internal/health"
	"github.com/netscope/netscope/agent/internal/models"
	"github.com/netscope/netscope/agent/internal/portscan"
)

// EngineOptions controls scanner behavior and rate limits.
type EngineOptions struct {
	TargetCIDR      string
	ScanPorts       bool
	PortsToScan     []int
	RateLimitDelay  time.Duration
	Concurrency     int
	PerPortTimeout  time.Duration
	AgentUUID       string
}

// DefaultEngineOptions returns safe, polite defaults.
func DefaultEngineOptions() EngineOptions {
	return EngineOptions{
		ScanPorts:      true,
		PortsToScan:    portscan.CommonPorts,
		RateLimitDelay: 10 * time.Millisecond,
		Concurrency:    20,
		PerPortTimeout: 300 * time.Millisecond,
		AgentUUID:      "netscope-agent-local",
	}
}

// DiscoveryEngine orchestrates all discovery, fingerprinting, and health checks.
type DiscoveryEngine struct {
	opts EngineOptions
}

// NewDiscoveryEngine initializes the engine.
func NewDiscoveryEngine(opts EngineOptions) *DiscoveryEngine {
	return &DiscoveryEngine{opts: opts}
}

// Run executes a complete discovery cycle and returns the aggregated ScanReport.
func (e *DiscoveryEngine) Run(ctx context.Context) (*models.ScanReport, error) {
	startTime := time.Now()

	// 1. Determine Target Subnet
	var targetSubnet models.SubnetInfo
	if e.opts.TargetCIDR != "" {
		targetSubnet = models.SubnetInfo{
			SubnetCIDR: e.opts.TargetCIDR,
		}
	} else {
		subnets, err := DetectActiveSubnets()
		if err != nil || len(subnets) == 0 {
			return nil, fmt.Errorf("no active private IPv4 subnet discovered: %w", err)
		}
		targetSubnet = subnets[0]
	}

	hostIPs, err := GenerateHostIPs(targetSubnet.SubnetCIDR)
	if err != nil {
		return nil, fmt.Errorf("failed to generate host IPs for %s: %w", targetSubnet.SubnetCIDR, err)
	}

	report := &models.ScanReport{
		ScanID:      fmt.Sprintf("scan-%d", time.Now().Unix()),
		AgentID:     e.opts.AgentUUID,
		Subnet:      targetSubnet.SubnetCIDR,
		StartedAt:   startTime,
		TotalHosts:  len(hostIPs),
		SecurityScore: 100, // Starts at 100, decremented by findings
	}

	// 2. Concurrently run L2/L3 discovery and multicast listeners
	var wg sync.WaitGroup
	var alivePingHosts map[string]float64
	var mdnsDevices map[string]MDNSDevice
	var ssdpDevices map[string]SSDPDevice

	// Ping & quick TCP sweep
	wg.Add(1)
	go func() {
		defer wg.Done()
		alivePingHosts = SweepSubnet(ctx, hostIPs, e.opts.Concurrency, e.opts.RateLimitDelay)
	}()

	// mDNS query probe
	wg.Add(1)
	go func() {
		defer wg.Done()
		mdnsDevices = ProbeMDNS(ctx, 2*time.Second)
	}()

	// SSDP query probe
	wg.Add(1)
	go func() {
		defer wg.Done()
		ssdpDevices = ProbeSSDP(ctx, 2*time.Second)
	}()

	wg.Wait()

	// 3. Inspect OS ARP table to extract hardware MAC addresses
	arpCache, _ := ReadOSARPCache()

	// 4. Consolidate discovered active hosts
	uniqueAliveIPs := make(map[string]bool)
	for ip := range alivePingHosts {
		uniqueAliveIPs[ip] = true
	}
	for ip := range arpCache {
		uniqueAliveIPs[ip] = true
	}
	for ip := range mdnsDevices {
		uniqueAliveIPs[ip] = true
	}
	for ip := range ssdpDevices {
		uniqueAliveIPs[ip] = true
	}

	// Ensure gateway is included if available
	if targetSubnet.GatewayIP != "" {
		uniqueAliveIPs[targetSubnet.GatewayIP] = true
	}

	// 5. Deep inspection on each alive host
	var devMu sync.Mutex
	var devWg sync.WaitGroup
	devSem := make(chan struct{}, 8) // Scan up to 8 hosts simultaneously

	macTracker := make(map[string][]string) // For ARP spoofing detection: MAC -> [IPs]

	for ip := range uniqueAliveIPs {
		devWg.Add(1)
		devSem <- struct{}{}

		go func(targetIP string) {
			defer devWg.Done()
			defer func() { <-devSem }()

			mac := arpCache[targetIP]
			vendor := "Unknown Vendor"
			if mac != "" {
				vendor = fingerprint.LookupOUI(mac)
			}

			// Gather mDNS data
			var mdnsServices []string
			hostname := ""
			if m, ok := mdnsDevices[targetIP]; ok {
				if m.Hostname != "" {
					hostname = m.Hostname
				}
				mdnsServices = m.Services
			}

			// Gather SSDP data
			ssdpServer := ""
			if s, ok := ssdpDevices[targetIP]; ok {
				ssdpServer = s.Server
			}

			// Query NetBIOS if hostname is still empty
			if hostname == "" {
				if nb, err := QueryNetBIOS(ctx, targetIP, 400*time.Millisecond); err == nil && nb != nil && nb.NetBIOSName != "" {
					hostname = nb.NetBIOSName
				}
			}

			// Polite Port Scan
			var openPorts []models.DiscoveredPort
			var openPortNums []int
			if e.opts.ScanPorts {
				openPorts = portscan.ScanHostPorts(
					ctx,
					targetIP,
					e.opts.PortsToScan,
					5,
					e.opts.PerPortTimeout,
					e.opts.RateLimitDelay,
				)
				for _, p := range openPorts {
					openPortNums = append(openPortNums, p.Port)
				}
			}

			isGateway := (targetIP == targetSubnet.GatewayIP)
			devType, osGuess := fingerprint.ClassifyDevice(
				vendor,
				hostname,
				openPortNums,
				mdnsServices,
				ssdpServer,
				isGateway,
			)

			rtt := alivePingHosts[targetIP]
			if rtt == 0 {
				rtt = 1.0
			}

			device := models.DiscoveredDevice{
				IPAddress:      targetIP,
				MACAddress:     mac,
				Hostname:       hostname,
				Vendor:         vendor,
				DeviceType:     devType,
				OSGuess:        osGuess,
				OpenPorts:      openPorts,
				IsAlive:        true,
				ResponseTimeMs: rtt,
				FirstSeenAt:    startTime,
				LastSeenAt:     time.Now(),
			}

			devMu.Lock()
			report.Devices = append(report.Devices, device)
			if mac != "" {
				macTracker[mac] = append(macTracker[mac], targetIP)
			}
			devMu.Unlock()
		}(ip)
	}

	devWg.Wait()
	report.ActiveHosts = len(report.Devices)

	// 6. Security Analysis & Deductive Checks
	// Check for Risky Ports
	for _, dev := range report.Devices {
		for _, port := range dev.OpenPorts {
			if port.IsRisky {
				finding := models.SecurityAuditFinding{
					Type:        "RISKY_PORT",
					Severity:    "warning",
					TargetIP:    dev.IPAddress,
					TargetMAC:   dev.MACAddress,
					Title:       fmt.Sprintf("Risky Service (%s) Exposed on Port %d", port.ServiceName, port.Port),
					Description: fmt.Sprintf("Host %s is listening on %s:%d without encryption.", dev.IPAddress, port.ServiceName, port.Port),
					Remediation: fmt.Sprintf("Disable port %d if unnecessary, or restrict access via host firewall or VPN.", port.Port),
				}
				if port.Port == 23 || port.Port == 445 {
					finding.Severity = "critical"
					report.SecurityScore -= 15
				} else {
					report.SecurityScore -= 10
				}
				report.Findings = append(report.Findings, finding)
			}
		}
	}

	// Check for ARP Spoofing (duplicate MAC claiming multiple active distinct IPs, excluding typical multihomed gateways)
	for mac, ips := range macTracker {
		if len(ips) > 1 && mac != targetSubnet.GatewayMAC {
			finding := models.SecurityAuditFinding{
				Type:        "ARP_SPOOF",
				Severity:    "critical",
				TargetMAC:   mac,
				Title:       "Possible ARP Poisoning / Spoofing Detected",
				Description: fmt.Sprintf("MAC %s is claiming multiple IP addresses (%v) on the local subnet.", mac, ips),
				Remediation: "Inspect device with MAC " + mac + " for unauthorized ARP spoofing tools or IP conflict.",
			}
			report.Findings = append(report.Findings, finding)
			report.SecurityScore -= 30
		}
	}

	// Clamp security score between 0 and 100
	if report.SecurityScore < 0 {
		report.SecurityScore = 0
	}

	// 7. Network Health Check
	report.HealthMetrics = health.CheckNetworkHealth(ctx, targetSubnet.GatewayIP)

	report.CompletedAt = time.Now()
	report.DurationMs = time.Since(startTime).Milliseconds()

	return report, nil
}

