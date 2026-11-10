package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/netscope/netscope/agent/internal/discovery"
	"github.com/netscope/netscope/agent/internal/health"
	"github.com/netscope/netscope/agent/internal/portscan"
	"github.com/netscope/netscope/agent/internal/transport"
)

const AppVersion = "1.0.0"

func main() {
	var (
		cidrFlag        = flag.String("cidr", "", "Target private subnet CIDR (e.g. 192.168.1.0/24). Auto-detected if omitted.")
		serverFlag      = flag.String("server", "http://localhost:8000", "NetScope backend API server URL")
		tokenFlag       = flag.String("token", "", "Agent enrollment token")
		rateLimitMs     = flag.Int("rate-limit", 10, "Delay in milliseconds between packet bursts for polite scanning")
		jsonOutput      = flag.Bool("json", false, "Output results as formatted JSON")
		daemonMode      = flag.Bool("daemon", false, "Run continuously as a background monitoring service")
		pollIntervalSec = flag.Int("interval", 60, "Interval in seconds between scan cycles in daemon mode")
		noPortScan      = flag.Bool("no-portscan", false, "Skip TCP port scanning (fast L2/L3 discovery only)")
		healthOnly      = flag.Bool("health-only", false, "Run latency, jitter and DNS health checks only and exit")
		versionFlag     = flag.Bool("version", false, "Print NetScope agent version and exit")
	)
	flag.Parse()

	if *versionFlag {
		fmt.Printf("NetScope Agent v%s (Production Grade Network Discovery & Monitoring)\n", AppVersion)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Fprintln(os.Stderr, "\nReceived shutdown signal. Stopping NetScope Agent...")
		cancel()
	}()

	// 1. Health-Only Mode
	if *healthOnly {
		fmt.Println("Running NetScope network health diagnostics...")
		metrics := health.CheckNetworkHealth(ctx, "")
		data, _ := json.MarshalIndent(metrics, "", "  ")
		fmt.Println(string(data))
		return
	}

	// 2. Configure Discovery Engine
	opts := discovery.DefaultEngineOptions()
	opts.TargetCIDR = *cidrFlag
	opts.ScanPorts = !*noPortScan
	opts.RateLimitDelay = time.Duration(*rateLimitMs) * time.Millisecond
	opts.PortsToScan = portscan.CommonPorts

	hostname, _ := os.Hostname()
	opts.AgentUUID = fmt.Sprintf("agent-%s", hostname)

	engine := discovery.NewDiscoveryEngine(opts)

	// Configure Transport Client
	transClient := transport.NewTransportClient(transport.ClientOptions{
		ServerURL:       *serverFlag,
		EnrollmentToken: *tokenFlag,
		AgentUUID:       opts.AgentUUID,
		Hostname:        hostname,
		ClientTimeout:   10 * time.Second,
	})

	if *tokenFlag != "" {
		fmt.Printf("Enrolling NetScope Agent with %s...\n", *serverFlag)
		if err := transClient.Enroll(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "Enrollment failed: %v (continuing offline)\n", err)
		} else {
			fmt.Println("Agent enrollment successful.")
		}
	}

	runCycle := func() {
		fmt.Fprintf(os.Stderr, "[%s] Starting NetScope network scan cycle...\n", time.Now().Format("15:04:05"))
		report, err := engine.Run(ctx)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error during network scan: %v\n", err)
			return
		}

		if *jsonOutput {
			data, _ := json.MarshalIndent(report, "", "  ")
			fmt.Println(string(data))
		} else {
			fmt.Printf("\n=== NetScope Discovery Report (%s) ===\n", report.Subnet)
			fmt.Printf("Scan Duration: %d ms | Total Scanned: %d | Alive Hosts Found: %d\n",
				report.DurationMs, report.TotalHosts, report.ActiveHosts)
			fmt.Printf("Network Security Score: %d / 100\n", report.SecurityScore)
			fmt.Printf("Gateway Latency: %.2f ms | Internet Latency: %.2f ms | Jitter: %.2f ms | Packet Loss: %.1f%%\n\n",
				report.HealthMetrics.GatewayLatency, report.HealthMetrics.InternetLatency,
				report.HealthMetrics.JitterMs, report.HealthMetrics.PacketLossPct)

			fmt.Println("DISCOVERED HOSTS:")
			for i, dev := range report.Devices {
				fmt.Printf("[%2d] %-15s | %-17s | %-10s | %-20s | %s\n",
					i+1, dev.IPAddress, dev.MACAddress, dev.DeviceType, dev.Vendor, dev.Hostname)
				for _, p := range dev.OpenPorts {
					riskTag := ""
					if p.IsRisky {
						riskTag = " [RISKY]"
					}
					fmt.Printf("     -> Port %d/%s (%s)%s\n", p.Port, p.Protocol, p.ServiceName, riskTag)
				}
			}

			if len(report.Findings) > 0 {
				fmt.Println("\nSECURITY FINDINGS:")
				for _, f := range report.Findings {
					fmt.Printf(" [!] [%s] %s (%s) - %s\n", f.Severity, f.Title, f.TargetIP, f.Remediation)
				}
			}
			fmt.Println()
		}

		// Transmit or Queue Report
		if *serverFlag != "" {
			err := transClient.QueueOrSend(ctx, report)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Telemetry transmission note: %v\n", err)
			} else {
				fmt.Fprintf(os.Stderr, "Telemetry successfully uploaded to %s\n", *serverFlag)
			}
		}
	}

	// Single run or daemon loop
	if !*daemonMode {
		runCycle()
		return
	}

	fmt.Printf("NetScope Agent running in daemon mode (polling every %ds)...\n", *pollIntervalSec)
	ticker := time.NewTicker(time.Duration(*pollIntervalSec) * time.Second)
	defer ticker.Stop()

	runCycle()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runCycle()
		}
	}
}

