package health

import (
	"context"
	"math"
	"net"
	"time"

	"github.com/netscope/netscope/agent/internal/models"
)

// MeasureDNSRTT measures the milliseconds required to resolve a domain using a specific DNS server.
func MeasureDNSRTT(ctx context.Context, dnsServer string, domain string) (float64, error) {
	if dnsServer == "" {
		dnsServer = "1.1.1.1"
	}
	r := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{Timeout: 1 * time.Second}
			return d.DialContext(ctx, "udp", net.JoinHostPort(dnsServer, "53"))
		},
	}

	start := time.Now()
	_, err := r.LookupHost(ctx, domain)
	rttMs := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		return 0, err
	}
	return rttMs, nil
}

// PingSeries sends a burst of count probes to measure RTT, jitter, and packet loss.
func PingSeries(ctx context.Context, target string, count int, timeout time.Duration) (avgRtt float64, jitter float64, packetLossPct float64) {
	if count <= 0 {
		count = 5
	}

	var successfulRTTs []float64
	lostCount := 0

	for i := 0; i < count; i++ {
		select {
		case <-ctx.Done():
			break
		default:
		}

		start := time.Now()
		d := net.Dialer{Timeout: timeout}
		// Probe TCP port 53 or 443 as dependable latency target
		conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(target, "53"))
		if err != nil {
			// Try 443 fallback
			conn, err = d.DialContext(ctx, "tcp", net.JoinHostPort(target, "443"))
		}

		if err == nil {
			rtt := float64(time.Since(start).Microseconds()) / 1000.0
			_ = conn.Close()
			successfulRTTs = append(successfulRTTs, rtt)
		} else {
			lostCount++
		}

		time.Sleep(50 * time.Millisecond)
	}

	totalSent := len(successfulRTTs) + lostCount
	if totalSent == 0 {
		return 0, 0, 100.0
	}

	packetLossPct = (float64(lostCount) / float64(totalSent)) * 100.0

	if len(successfulRTTs) == 0 {
		return 0, 0, 100.0
	}

	// Calculate Average RTT
	sum := 0.0
	for _, rtt := range successfulRTTs {
		sum += rtt
	}
	avgRtt = sum / float64(len(successfulRTTs))

	// Calculate Jitter (average difference between consecutive RTTs)
	if len(successfulRTTs) > 1 {
		diffSum := 0.0
		for i := 1; i < len(successfulRTTs); i++ {
			diffSum += math.Abs(successfulRTTs[i] - successfulRTTs[i-1])
		}
		jitter = diffSum / float64(len(successfulRTTs)-1)
	}

	return avgRtt, jitter, packetLossPct
}

// CheckNetworkHealth evaluates the health of the local network and internet connectivity.
func CheckNetworkHealth(ctx context.Context, gatewayIP string) models.NetworkHealthMetrics {
	metrics := models.NetworkHealthMetrics{
		Timestamp: time.Now(),
		Status:    "excellent",
	}

	// 1. Measure Gateway RTT if available
	if gatewayIP != "" {
		gwRtt, _, gwLoss := PingSeries(ctx, gatewayIP, 3, 200*time.Millisecond)
		if gwLoss < 100 {
			metrics.GatewayLatency = gwRtt
		}
	}

	// 2. Measure Internet RTT & Jitter against 1.1.1.1
	inetRtt, jitter, loss := PingSeries(ctx, "1.1.1.1", 5, 500*time.Millisecond)
	metrics.InternetLatency = inetRtt
	metrics.JitterMs = jitter
	metrics.PacketLossPct = loss

	// 3. Measure DNS Lookup RTT
	dnsRtt, err := MeasureDNSRTT(ctx, "1.1.1.1", "google.com")
	if err == nil {
		metrics.DNSLookupMs = dnsRtt
		metrics.DNSServerUsed = "1.1.1.1 (Cloudflare)"
	} else {
		// Fallback local resolution
		dnsRtt, err = MeasureDNSRTT(ctx, "8.8.8.8", "google.com")
		if err == nil {
			metrics.DNSLookupMs = dnsRtt
			metrics.DNSServerUsed = "8.8.8.8 (Google)"
		}
	}

	// 4. Determine overall health status
	if metrics.PacketLossPct > 50 || (metrics.InternetLatency == 0 && metrics.GatewayLatency == 0) {
		metrics.Status = "down"
	} else if metrics.PacketLossPct > 15 || metrics.InternetLatency > 200 || metrics.JitterMs > 50 {
		metrics.Status = "degraded"
	} else if metrics.PacketLossPct > 5 || metrics.InternetLatency > 100 {
		metrics.Status = "fair"
	} else {
		metrics.Status = "excellent"
	}

	return metrics
}

