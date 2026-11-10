package discovery

import (
	"encoding/binary"
	"fmt"
	"net"
	"strings"

	"github.com/netscope/netscope/agent/internal/models"
)

// IsPrivateIPv4 checks whether an IP belongs to RFC 1918 private space.
func IsPrivateIPv4(ip net.IP) bool {
	ip4 := ip.To4()
	if ip4 == nil {
		return false
	}
	// 10.0.0.0/8
	if ip4[0] == 10 {
		return true
	}
	// 172.16.0.0/12
	if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
		return true
	}
	// 192.168.0.0/16
	if ip4[0] == 192 && ip4[1] == 168 {
		return true
	}
	// 127.0.0.0/8 loopback (allowed for local tests)
	if ip4[0] == 127 {
		return true
	}
	return false
}

// DetectActiveSubnets returns all active IPv4 private network interfaces.
func DetectActiveSubnets() ([]models.SubnetInfo, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to list network interfaces: %w", err)
	}

	var results []models.SubnetInfo

	for _, iface := range interfaces {
		// Skip down and loopback interfaces for production discovery
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			ip4 := ipNet.IP.To4()
			if ip4 == nil || !IsPrivateIPv4(ip4) {
				continue
			}

			mask := ipNet.Mask
			ones, bits := mask.Size()
			// Only allow subnets between /16 and /30 to prevent accidental /8 sweeps
			if ones < 16 || ones > 30 {
				continue
			}

			netIP := ip4.Mask(mask)
			broadcastIP := make(net.IP, 4)
			for i := 0; i < 4; i++ {
				broadcastIP[i] = netIP[i] | ^mask[i]
			}

			totalHosts := (1 << (bits - ones)) - 2
			if totalHosts < 1 {
				totalHosts = 1
			}

			// Typical default gateway is first usable IP (.1)
			gatewayIP := make(net.IP, 4)
			copy(gatewayIP, netIP)
			gatewayIP[3]++

			results = append(results, models.SubnetInfo{
				InterfaceName:  iface.Name,
				IPAddress:      ip4.String(),
				SubnetCIDR:     fmt.Sprintf("%s/%d", netIP.String(), ones),
				NetworkAddress: netIP.String(),
				BroadcastIP:    broadcastIP.String(),
				GatewayIP:      gatewayIP.String(),
				TotalHosts:     totalHosts,
				DNSServers:     []string{"1.1.1.1", "8.8.8.8"},
			})
		}
	}

	return results, nil
}

// GenerateHostIPs returns all usable host IP strings in the specified CIDR.
func GenerateHostIPs(cidr string) ([]string, error) {
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, fmt.Errorf("invalid CIDR %s: %w", cidr, err)
	}

	ip4 := ip.To4()
	if ip4 == nil || !IsPrivateIPv4(ip4) {
		return nil, fmt.Errorf("CIDR %s is not a valid private RFC 1918 IPv4 network", cidr)
	}

	ones, _ := ipNet.Mask.Size()
	// Boundary check: max /22 (1022 hosts) for single scan burst to guarantee <30s target
	if ones < 22 {
		return nil, fmt.Errorf("CIDR prefix /%d too large (must be /22 to /30)", ones)
	}

	mask := binary.BigEndian.Uint32(ipNet.Mask)
	start := binary.BigEndian.Uint32(ipNet.IP)
	finish := (start & mask) | (0xffffffff & ^mask)

	var hosts []string
	// Exclude network address (start) and broadcast address (finish)
	for i := start + 1; i < finish; i++ {
		hostIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(hostIP, i)
		hosts = append(hosts, hostIP.String())
	}

	return hosts, nil
}

// NormalizeMAC standardizes MAC strings to lowercase colon-separated format.
func NormalizeMAC(mac string) string {
	clean := strings.ToLower(strings.TrimSpace(mac))
	clean = strings.ReplaceAll(clean, "-", ":")
	clean = strings.ReplaceAll(clean, ".", "")
	return clean
}

