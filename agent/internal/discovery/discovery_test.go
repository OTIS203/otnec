package discovery

import (
	"net"
	"testing"
)

func TestIsPrivateIPv4(t *testing.T) {
	cases := []struct {
		ip       string
		expected bool
	}{
		{"192.168.1.1", true},
		{"10.0.0.1", true},
		{"172.16.0.5", true},
		{"172.31.255.254", true},
		{"127.0.0.1", true},
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"172.32.0.1", false},
		{"200.100.50.25", false},
	}

	for _, c := range cases {
		ip := net.ParseIP(c.ip)
		actual := IsPrivateIPv4(ip)
		if actual != c.expected {
			t.Errorf("IsPrivateIPv4(%s) = %v; expected %v", c.ip, actual, c.expected)
		}
	}
}

func TestGenerateHostIPs(t *testing.T) {
	hosts, err := GenerateHostIPs("192.168.10.0/30")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// /30 has 4 IPs: .0 (net), .1 (host), .2 (host), .3 (broadcast) -> 2 usable hosts
	if len(hosts) != 2 {
		t.Fatalf("expected 2 hosts for /30, got %d (%v)", len(hosts), hosts)
	}
	if hosts[0] != "192.168.10.1" || hosts[1] != "192.168.10.2" {
		t.Errorf("unexpected host list: %v", hosts)
	}

	// Public IP should fail boundary check
	_, err = GenerateHostIPs("8.8.8.0/24")
	if err == nil {
		t.Error("expected error for public IP CIDR, got nil")
	}

	// /8 prefix too large should fail boundary check
	_, err = GenerateHostIPs("10.0.0.0/16")
	if err == nil {
		t.Error("expected error for /16 prefix, got nil")
	}
}

func TestNormalizeMAC(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"00-1A-11-2B-3C-4D", "00:1a:11:2b:3c:4d"},
		{"AA:BB:CC:DD:EE:FF", "aa:bb:cc:dd:ee:ff"},
		{"  001122.334455  ", "001122334455"},
	}

	for _, c := range cases {
		actual := NormalizeMAC(c.input)
		if actual != c.expected {
			t.Errorf("NormalizeMAC(%s) = %s; expected %s", c.input, actual, c.expected)
		}
	}
}

