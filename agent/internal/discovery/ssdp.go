package discovery

import (
	"bufio"
	"bytes"
	"context"
	"net"
	"net/http"
	"strings"
	"time"
)

// SSDPDevice contains parsed SSDP response metadata.
type SSDPDevice struct {
	IP          string
	Server      string
	Location    string
	DeviceType  string
	FriendlyName string
}

const ssdpSearchPayload = "M-SEARCH * HTTP/1.1\r\n" +
	"HOST: 239.255.255.250:1900\r\n" +
	"MAN: \"ssdp:discover\"\r\n" +
	"MX: 2\r\n" +
	"ST: ssdp:all\r\n\r\n"

// ProbeSSDP sends an SSDP M-SEARCH broadcast to discover UPnP devices.
func ProbeSSDP(ctx context.Context, timeout time.Duration) map[string]SSDPDevice {
	results := make(map[string]SSDPDevice)

	multicastAddr, err := net.ResolveUDPAddr("udp4", "239.255.255.250:1900")
	if err != nil {
		return results
	}

	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: 0})
	if err != nil {
		return results
	}
	defer conn.Close()

	_, _ = conn.WriteToUDP([]byte(ssdpSearchPayload), multicastAddr)
	_ = conn.SetReadDeadline(time.Now().Add(timeout))

	buf := make([]byte, 4096)
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
		respStr := string(buf[:n])

		// Parse HTTP-formatted SSDP headers
		reader := bufio.NewReader(bytes.NewReader(buf[:n]))
		resp, parseErr := http.ReadResponse(reader, nil)
		if parseErr == nil {
			serverHeader := resp.Header.Get("Server")
			locationHeader := resp.Header.Get("Location")
			stHeader := resp.Header.Get("ST")

			dev := results[ip]
			dev.IP = ip
			if serverHeader != "" {
				dev.Server = serverHeader
			}
			if locationHeader != "" {
				dev.Location = locationHeader
			}
			if stHeader != "" {
				dev.DeviceType = stHeader
			}
			results[ip] = dev
		} else {
			// Fallback string matching if standard HTTP parse fails
			dev := results[ip]
			dev.IP = ip
			for _, line := range strings.Split(respStr, "\r\n") {
				lower := strings.ToLower(line)
				if strings.HasPrefix(lower, "server:") {
					dev.Server = strings.TrimSpace(line[7:])
				} else if strings.HasPrefix(lower, "location:") {
					dev.Location = strings.TrimSpace(line[9:])
				}
			}
			results[ip] = dev
		}
	}

	return results
}

