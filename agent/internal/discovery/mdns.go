package discovery

import (
	"context"
	"net"
	"strings"
	"time"
)

// MDNSDevice carries discovered mDNS details.
type MDNSDevice struct {
	IP       string
	Hostname string
	Services []string
}

// ProbeMDNS sends an mDNS PTR query for _services._dns-sd._udp.local to 224.0.0.251:5353
func ProbeMDNS(ctx context.Context, timeout time.Duration) map[string]MDNSDevice {
	results := make(map[string]MDNSDevice)

	addr, err := net.ResolveUDPAddr("udp4", "224.0.0.251:5353")
	if err != nil {
		return results
	}

	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: 0})
	if err != nil {
		return results
	}
	defer conn.Close()

	// Standard DNS query packet for "_services._dns-sd._udp.local" PTR
	queryPacket := []byte{
		0x00, 0x00, // Transaction ID
		0x00, 0x00, // Flags: standard query
		0x00, 0x01, // Questions: 1
		0x00, 0x00, // Answer RRs: 0
		0x00, 0x00, // Authority RRs: 0
		0x00, 0x00, // Additional RRs: 0
		// Query: _services._dns-sd._udp.local
		0x09, '_', 's', 'e', 'r', 'v', 'i', 'c', 'e', 's',
		0x07, '_', 'd', 'n', 's', '-', 's', 'd',
		0x04, '_', 'u', 'd', 'p',
		0x05, 'l', 'o', 'c', 'a', 'l',
		0x00,       // End of name
		0x00, 0x0c, // Type: PTR (12)
		0x00, 0x01, // Class: IN (1)
	}

	_, _ = conn.WriteToUDP(queryPacket, addr)
	_ = conn.SetReadDeadline(time.Now().Add(timeout))

	buf := make([]byte, 2048)
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return results
		default:
		}

		n, src, err := conn.ReadFromUDP(buf)
		if err != nil {
			break
		}

		ip := src.IP.String()
		raw := string(buf[:n])

		// Basic extraction of readable service identifiers and hostnames
		var foundServices []string
		candidates := []string{
			"_googlecast._tcp", "_airplay._tcp", "_raop._tcp",
			"_spotify-connect._tcp", "_printer._tcp", "_ipp._tcp",
			"_http._tcp", "_smb._tcp", "_companion-link._tcp",
		}

		for _, cand := range candidates {
			if strings.Contains(raw, cand) {
				foundServices = append(foundServices, cand)
			}
		}

		dev := results[ip]
		dev.IP = ip
		if dev.Hostname == "" {
			// Extract possible .local hostname if found in payload
			if idx := strings.Index(raw, ".local"); idx > 0 {
				start := idx - 1
				for start > 0 && (raw[start] >= 'a' && raw[start] <= 'z' || raw[start] >= 'A' && raw[start] <= 'Z' || raw[start] >= '0' && raw[start] <= '9' || raw[start] == '-') {
					start--
				}
				name := raw[start+1 : idx]
				if len(name) > 1 {
					dev.Hostname = name + ".local"
				}
			}
		}
		dev.Services = append(dev.Services, foundServices...)
		results[ip] = dev
	}

	return results
}

