package discovery

import (
	"context"
	"net"
	"strings"
	"time"
)

// NetBIOSInfo contains extracted NetBIOS host metadata.
type NetBIOSInfo struct {
	IP        string
	NetBIOSName string
	Workgroup string
	MAC       string
}

// NetBIOS wildcard name query packet targeting port 137/UDP
var netbiosQueryPacket = []byte{
	0x80, 0x94, // Transaction ID
	0x00, 0x00, // Flags: 0x0000 (standard query)
	0x00, 0x01, // Questions: 1
	0x00, 0x00, // Answer RRs: 0
	0x00, 0x00, // Authority RRs: 0
	0x00, 0x00, // Additional RRs: 0
	// Encoded name: CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA (wildcard *)
	0x20,
	0x43, 0x4b, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
	0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
	0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
	0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
	0x00,       // Terminator
	0x00, 0x21, // Type: NBSTAT (33)
	0x00, 0x01, // Class: IN (1)
}

// QueryNetBIOS sends a Node Status query to target IP port 137.
func QueryNetBIOS(ctx context.Context, ip string, timeout time.Duration) (*NetBIOSInfo, error) {
	d := net.Dialer{Timeout: timeout}
	conn, err := d.DialContext(ctx, "udp4", net.JoinHostPort(ip, "137"))
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(timeout))
	_, err = conn.Write(netbiosQueryPacket)
	if err != nil {
		return nil, err
	}

	buf := make([]byte, 1024)
	n, err := conn.Read(buf)
	if err != nil || n < 56 {
		return nil, err
	}

	numNames := int(buf[56])
	if numNames == 0 || n < 57+(numNames*18) {
		return nil, nil
	}

	info := &NetBIOSInfo{IP: ip}
	offset := 57

	for i := 0; i < numNames; i++ {
		nameBytes := buf[offset : offset+15]
		nameType := buf[offset+15]
		flags := uint16(buf[offset+16])<<8 | uint16(buf[offset+17])
		isGroup := (flags & 0x8000) != 0

		cleanName := strings.TrimSpace(string(nameBytes))
		if !isGroup && nameType == 0x00 && info.NetBIOSName == "" {
			info.NetBIOSName = cleanName
		} else if isGroup && nameType == 0x00 && info.Workgroup == "" {
			info.Workgroup = cleanName
		}
		offset += 18
	}

	return info, nil
}

