package dhcpserver

import (
	"context"
	"encoding/binary"
	"fmt"
	"net"
	"sync"
	"time"
)

// Lease tracks an active IP assignment to a MAC address.
type Lease struct {
	MAC       string    `json:"mac"`
	IP        net.IP    `json:"ip"`
	Hostname  string    `json:"hostname"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Config defines the DHCP server parameters.
type Config struct {
	ServerIP   net.IP
	GatewayIP  net.IP
	DNSIP      net.IP
	SubnetMask net.IPMask
	StartIP    net.IP
	EndIP      net.IP
	LeaseTime  time.Duration
}

// Server is a lightweight DHCP server for NetScope.
type Server struct {
	cfg        Config
	mu         sync.Mutex
	leases     map[string]*Lease
	ipToMAC    map[string]string
	onNewLease func(Lease)
}

// New creates a new DHCP Server instance.
func New(cfg Config, onNewLease func(Lease)) *Server {
	if cfg.LeaseTime == 0 {
		cfg.LeaseTime = 2 * time.Hour
	}
	return &Server{
		cfg:        cfg,
		leases:     make(map[string]*Lease),
		ipToMAC:    make(map[string]string),
		onNewLease: onNewLease,
	}
}

// Start listens for DHCP broadcast requests on UDP port 67.
func (s *Server) Start(ctx context.Context) error {
	addr := &net.UDPAddr{
		IP:   net.IPv4zero,
		Port: 67,
	}

	conn, err := net.ListenUDP("udp4", addr)
	if err != nil {
		return fmt.Errorf("dhcp listen error on port 67: %w", err)
	}
	defer conn.Close()

	go func() {
		<-ctx.Done()
		conn.Close()
	}()

	fmt.Printf("[DHCP] NetScope DHCP Server active on %s (Pool: %s - %s, DNS: %s, GW: %s)\n",
		s.cfg.ServerIP, s.cfg.StartIP, s.cfg.EndIP, s.cfg.DNSIP, s.cfg.GatewayIP)

	buf := make([]byte, 1500)
	for {
		n, clientAddr, err := conn.ReadFrom(buf)
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				return err
			}
		}

		req := make([]byte, n)
		copy(req, buf[:n])

		go s.handlePacket(conn, clientAddr, req)
	}
}

func (s *Server) handlePacket(conn *net.UDPConn, clientAddr net.Addr, raw []byte) {
	if len(raw) < 240 {
		return
	}

	// BOOTREQUEST is op 1
	if raw[0] != 1 {
		return
	}

	// Verify magic cookie: 0x63, 0x82, 0x53, 0x63
	if raw[236] != 0x63 || raw[237] != 0x82 || raw[238] != 0x53 || raw[239] != 0x63 {
		return
	}

	xid := raw[4:8]
	macBytes := raw[28:34]
	macStr := fmt.Sprintf("%02X:%02X:%02X:%02X:%02X:%02X",
		macBytes[0], macBytes[1], macBytes[2], macBytes[3], macBytes[4], macBytes[5])

	options := parseOptions(raw[240:])
	msgType := options[53] // Option 53: DHCP Message Type
	if len(msgType) == 0 {
		return
	}

	hostname := ""
	if hn, ok := options[12]; ok { // Option 12: Host Name
		hostname = string(hn)
	}

	switch msgType[0] {
	case 1: // DHCPDISCOVER
		s.handleDiscover(conn, xid, macBytes, macStr, hostname, raw)
	case 3: // DHCPREQUEST
		s.handleRequest(conn, xid, macBytes, macStr, hostname, raw, options)
	}
}

func (s *Server) handleDiscover(conn *net.UDPConn, xid, macBytes []byte, macStr, hostname string, req []byte) {
	s.mu.Lock()
	assignedIP := s.assignIP(macStr, hostname)
	s.mu.Unlock()

	if assignedIP == nil {
		fmt.Printf("[DHCP] No available IP for MAC %s\n", macStr)
		return
	}

	fmt.Printf("[DHCP] DHCPOFFER -> %s (%s) for MAC %s\n", assignedIP, hostname, macStr)
	resp := s.buildReply(2, xid, assignedIP, macBytes) // 2 = DHCPOFFER
	s.sendBroadcast(conn, resp)
}

func (s *Server) handleRequest(conn *net.UDPConn, xid, macBytes []byte, macStr, hostname string, req []byte, opts map[byte][]byte) {
	s.mu.Lock()
	assignedIP := s.assignIP(macStr, hostname)
	lease := &Lease{
		MAC:       macStr,
		IP:        assignedIP,
		Hostname:  hostname,
		ExpiresAt: time.Now().Add(s.cfg.LeaseTime),
	}
	s.leases[macStr] = lease
	s.ipToMAC[assignedIP.String()] = macStr
	s.mu.Unlock()

	if s.onNewLease != nil {
		go s.onNewLease(*lease)
	}

	fmt.Printf("[DHCP] DHCPACK -> %s (%s) for MAC %s [DNS -> %s]\n", assignedIP, hostname, macStr, s.cfg.DNSIP)
	resp := s.buildReply(5, xid, assignedIP, macBytes) // 5 = DHCPACK
	s.sendBroadcast(conn, resp)
}

func (s *Server) assignIP(macStr, hostname string) net.IP {
	if existing, ok := s.leases[macStr]; ok {
		return existing.IP
	}

	// Scan through start to end IP
	cur := make(net.IP, 4)
	copy(cur, s.cfg.StartIP.To4())
	end := s.cfg.EndIP.To4()

	for {
		ipStr := cur.String()
		if _, taken := s.ipToMAC[ipStr]; !taken && !cur.Equal(s.cfg.ServerIP) && !cur.Equal(s.cfg.GatewayIP) {
			result := make(net.IP, 4)
			copy(result, cur)
			return result
		}
		if cur.Equal(end) {
			break
		}
		cur[3]++
		if cur[3] == 0 {
			break
		}
	}

	return nil
}

func (s *Server) buildReply(msgType byte, xid []byte, yiaddr net.IP, macBytes []byte) []byte {
	resp := make([]byte, 300)
	resp[0] = 2 // BOOTREPLY
	resp[1] = 1 // Ethernet
	resp[2] = 6 // MAC length
	resp[3] = 0 // hops

	copy(resp[4:8], xid)
	binary.BigEndian.PutUint16(resp[10:12], 0x8000) // Broadcast flag

	copy(resp[16:20], yiaddr.To4())         // Your IP
	copy(resp[20:24], s.cfg.ServerIP.To4()) // Server IP
	copy(resp[28:34], macBytes)             // Client MAC

	// Magic Cookie
	resp[236] = 0x63
	resp[237] = 0x82
	resp[238] = 0x53
	resp[239] = 0x63

	// Options
	opts := resp[240:]
	idx := 0

	// Option 53: Message Type (1 byte)
	opts[idx] = 53
	opts[idx+1] = 1
	opts[idx+2] = msgType
	idx += 3

	// Option 54: Server Identifier (4 bytes)
	opts[idx] = 54
	opts[idx+1] = 4
	copy(opts[idx+2:idx+6], s.cfg.ServerIP.To4())
	idx += 6

	// Option 51: Lease Time (4 bytes)
	opts[idx] = 51
	opts[idx+1] = 4
	binary.BigEndian.PutUint32(opts[idx+2:idx+6], uint32(s.cfg.LeaseTime.Seconds()))
	idx += 6

	// Option 1: Subnet Mask (4 bytes)
	opts[idx] = 1
	opts[idx+1] = 4
	copy(opts[idx+2:idx+6], []byte(s.cfg.SubnetMask))
	idx += 6

	// Option 3: Router / Gateway (4 bytes)
	opts[idx] = 3
	opts[idx+1] = 4
	copy(opts[idx+2:idx+6], s.cfg.GatewayIP.To4())
	idx += 6

	// Option 6: DNS Server (4 bytes) -> ONLY 192.168.0.102!
	opts[idx] = 6
	opts[idx+1] = 4
	copy(opts[idx+2:idx+6], s.cfg.DNSIP.To4())
	idx += 6

	// Option 255: End
	opts[idx] = 255
	idx++

	return resp[:240+idx]
}

func (s *Server) sendBroadcast(conn *net.UDPConn, data []byte) {
	dst := &net.UDPAddr{
		IP:   net.IPv4bcast, // 255.255.255.255
		Port: 68,
	}
	_, _ = conn.WriteTo(data, dst)
}

func parseOptions(data []byte) map[byte][]byte {
	opts := make(map[byte][]byte)
	i := 0
	for i < len(data) {
		tag := data[i]
		if tag == 255 { // End
			break
		}
		if tag == 0 { // Pad
			i++
			continue
		}
		if i+1 >= len(data) {
			break
		}
		length := int(data[i+1])
		if i+2+length > len(data) {
			break
		}
		opts[tag] = data[i+2 : i+2+length]
		i += 2 + length
	}
	return opts
}

