package portscan

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestIsRiskyPort(t *testing.T) {
	risky := []int{21, 23, 445, 1900, 3389, 5000, 5900}
	for _, p := range risky {
		if !IsRiskyPort(p) {
			t.Errorf("expected port %d to be marked risky", p)
		}
	}

	safe := []int{80, 443, 22, 53, 8080}
	for _, p := range safe {
		if IsRiskyPort(p) {
			t.Errorf("expected port %d to be marked safe", p)
		}
	}
}

func TestScanHostPortsWithDialer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	mockDialer := func(ctx context.Context, network, addr string) (net.Conn, error) {
		if addr == "127.0.0.1:22" {
			clientConn, serverConn := net.Pipe()
			go func() {
				_, _ = serverConn.Write([]byte("SSH-2.0-OpenSSH_9.0\r\n"))
				_ = serverConn.Close()
			}()
			return clientConn, nil
		}
		return nil, net.ErrClosed
	}

	results := ScanHostPortsWithDialer(ctx, "127.0.0.1", []int{22, 80}, 5, 200*time.Millisecond, 0, mockDialer)

	foundSSH := false
	for _, p := range results {
		if p.Port == 22 {
			foundSSH = true
			if p.Banner != "SSH-2.0-OpenSSH_9.0" {
				t.Errorf("expected banner 'SSH-2.0-OpenSSH_9.0', got '%s'", p.Banner)
			}
			if p.ServiceName != "ssh" {
				t.Errorf("expected service 'ssh', got '%s'", p.ServiceName)
			}
		}
	}

	if !foundSSH {
		t.Fatal("expected port 22 to be discovered by mock dialer")
	}
}

