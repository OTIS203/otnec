package discovery

import (
	"context"
	"net"
	"os/exec"
	"runtime"
	"sync"
	"time"
)

// PingHost checks if an IP is alive via OS ping command with a short timeout.
func PingHost(ctx context.Context, ip string, timeout time.Duration) (bool, float64) {
	start := time.Now()

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "ping", "-n", "1", "-w", "300", ip)
	} else if runtime.GOOS == "darwin" {
		cmd = exec.CommandContext(ctx, "ping", "-c", "1", "-W", "300", ip)
	} else {
		// Linux: -c 1 (count 1), -W 1 (wait 1s), -n (numeric)
		cmd = exec.CommandContext(ctx, "ping", "-c", "1", "-W", "1", "-n", ip)
	}

	err := cmd.Run()
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	if err == nil {
		return true, durationMs
	}

	// Fallback: If ICMP is blocked by client firewall (common in Windows 10/11),
	// attempt quick TCP connection on common discovery ports (445, 80, 443, 22, 139)
	quickPorts := []int{445, 80, 443, 22, 139}
	for _, port := range quickPorts {
		target := net.JoinHostPort(ip, string(rune(port)))
		d := net.Dialer{Timeout: 150 * time.Millisecond}
		conn, dialErr := d.DialContext(ctx, "tcp", target)
		if dialErr == nil {
			_ = conn.Close()
			return true, float64(time.Since(start).Microseconds()) / 1000.0
		}
	}

	return false, 0
}

// SweepSubnet runs a concurrent ping/TCP sweep across target IPs.
func SweepSubnet(ctx context.Context, ips []string, concurrency int, rateLimitDelay time.Duration) map[string]float64 {
	aliveHosts := make(map[string]float64)
	var mu sync.Mutex

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for _, ip := range ips {
		select {
		case <-ctx.Done():
			break
		default:
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(targetIP string) {
			defer wg.Done()
			defer func() { <-sem }()

			alive, rtt := PingHost(ctx, targetIP, 400*time.Millisecond)
			if alive {
				mu.Lock()
				aliveHosts[targetIP] = rtt
				mu.Unlock()
			}

			if rateLimitDelay > 0 {
				time.Sleep(rateLimitDelay)
			}
		}(ip)
	}

	wg.Wait()
	return aliveHosts
}

