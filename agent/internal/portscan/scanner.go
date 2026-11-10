package portscan

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/netscope/netscope/agent/internal/models"
)

// Standard top common ports for non-intrusive network discovery
var CommonPorts = []int{
	21,   // FTP (Risky)
	22,   // SSH
	23,   // Telnet (Risky)
	25,   // SMTP
	53,   // DNS
	80,   // HTTP
	110,  // POP3
	135,  // MSRPC
	139,  // NetBIOS
	143,  // IMAP
	443,  // HTTPS
	445,  // SMB (Risky)
	554,  // RTSP (Cameras)
	631,  // IPP (Printers)
	993,  // IMAPS
	995,  // POP3S
	1900, // UPnP SSDP (Risky)
	3306, // MySQL
	3389, // RDP (Risky)
	5000, // UPnP / Synology / Flask
	5432, // PostgreSQL
	5900, // VNC (Risky)
	8000, // HTTP Alt
	8080, // HTTP Proxy / Web
	8443, // HTTPS Alt
	9100, // RAW JetDirect (Printers)
}

// WellKnownServices maps standard ports to service names.
var WellKnownServices = map[int]string{
	21:   "ftp",
	22:   "ssh",
	23:   "telnet",
	25:   "smtp",
	53:   "dns",
	80:   "http",
	110:  "pop3",
	135:  "msrpc",
	139:  "netbios-ssn",
	143:  "imap",
	443:  "https",
	445:  "microsoft-ds",
	554:  "rtsp",
	631:  "ipp",
	993:  "imaps",
	995:  "pop3s",
	1900: "upnp",
	3306: "mysql",
	3389: "rdp",
	5000: "upnp-http",
	5432: "postgresql",
	5900: "vnc",
	8000: "http-alt",
	8080: "http-proxy",
	8443: "https-alt",
	9100: "jetdirect",
}

// IsRiskyPort returns true if the port represents an insecure or commonly targeted service.
func IsRiskyPort(port int) bool {
	switch port {
	case 21, 23, 445, 1900, 3389, 5000, 5900:
		return true
	default:
		return false
	}
}

// GrabBanner non-intrusively extracts service version text from an open TCP socket.
func GrabBanner(conn net.Conn, port int) string {
	_ = conn.SetDeadline(time.Now().Add(500 * time.Millisecond))

	// For HTTP/HTTPS ports, send polite HEAD request
	if port == 80 || port == 8080 || port == 8000 {
		_, _ = conn.Write([]byte("HEAD / HTTP/1.0\r\nHost: local\r\n\r\n"))
	}

	reader := bufio.NewReader(conn)
	line, err := reader.ReadString('\n')
	if err == nil {
		clean := strings.TrimSpace(line)
		if len(clean) > 80 {
			clean = clean[:80] + "..."
		}
		return clean
	}

	return ""
}

// DialContextFunc defines the signature for dialing network connections.
type DialContextFunc func(ctx context.Context, network, addr string) (net.Conn, error)

// ScanHostPorts conducts a rate-limited TCP connect scan across specified ports.
func ScanHostPorts(
	ctx context.Context,
	ip string,
	ports []int,
	concurrency int,
	perPortTimeout time.Duration,
	rateLimitDelay time.Duration,
) []models.DiscoveredPort {
	return ScanHostPortsWithDialer(ctx, ip, ports, concurrency, perPortTimeout, rateLimitDelay, nil)
}

// ScanHostPortsWithDialer scans ports using an optional custom dialer.
func ScanHostPortsWithDialer(
	ctx context.Context,
	ip string,
	ports []int,
	concurrency int,
	perPortTimeout time.Duration,
	rateLimitDelay time.Duration,
	dialer DialContextFunc,
) []models.DiscoveredPort {
	if len(ports) == 0 {
		ports = CommonPorts
	}
	if concurrency <= 0 {
		concurrency = 10
	}
	if perPortTimeout <= 0 {
		perPortTimeout = 300 * time.Millisecond
	}

	var results []models.DiscoveredPort
	var mu sync.Mutex

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for _, port := range ports {
		select {
		case <-ctx.Done():
			return results
		default:
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(p int) {
			defer wg.Done()
			defer func() { <-sem }()

			target := fmt.Sprintf("%s:%d", ip, p)
			var conn net.Conn
			var err error

			if dialer != nil {
				conn, err = dialer(ctx, "tcp", target)
			} else {
				d := net.Dialer{Timeout: perPortTimeout}
				conn, err = d.DialContext(ctx, "tcp", target)
			}

			if err == nil {
				banner := GrabBanner(conn, p)
				_ = conn.Close()

				serviceName := WellKnownServices[p]
				if serviceName == "" {
					serviceName = fmt.Sprintf("tcp-%d", p)
				}

				mu.Lock()
				results = append(results, models.DiscoveredPort{
					Port:        p,
					Protocol:    "tcp",
					ServiceName: serviceName,
					Banner:      banner,
					IsRisky:     IsRiskyPort(p),
				})
				mu.Unlock()
			}

			if rateLimitDelay > 0 {
				time.Sleep(rateLimitDelay)
			}
		}(port)
	}

	wg.Wait()
	return results
}

