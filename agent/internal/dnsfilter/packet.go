package dnsfilter

import (
	"encoding/binary"
	"errors"
	"strings"
)

const (
	TypeA    uint16 = 1
	TypeAAAA uint16 = 28
	ClassIN  uint16 = 1
)

// DNSQuestion represents a parsed question in a DNS query.
type DNSQuestion struct {
	Name  string
	Type  uint16
	Class uint16
}

// ParsedQuery contains details needed to process or sinkhole a DNS message.
type ParsedQuery struct {
	ID        uint16
	Flags     uint16
	Questions []DNSQuestion
	Raw       []byte
}

// ParseDNSQuery extracts DNS header and primary question from raw wire bytes.
func ParseDNSQuery(buf []byte) (*ParsedQuery, error) {
	if len(buf) < 12 {
		return nil, errors.New("dns packet too short")
	}

	id := binary.BigEndian.Uint16(buf[0:2])
	flags := binary.BigEndian.Uint16(buf[2:4])
	qdcount := binary.BigEndian.Uint16(buf[4:6])

	if qdcount == 0 {
		return nil, errors.New("no question in query")
	}

	offset := 12
	var questions []DNSQuestion

	for i := 0; i < int(qdcount); i++ {
		name, newOffset, err := parseDomainName(buf, offset)
		if err != nil {
			return nil, err
		}
		if newOffset+4 > len(buf) {
			return nil, errors.New("truncated question section")
		}

		qtype := binary.BigEndian.Uint16(buf[newOffset : newOffset+2])
		qclass := binary.BigEndian.Uint16(buf[newOffset+2 : newOffset+4])
		offset = newOffset + 4

		questions = append(questions, DNSQuestion{
			Name:  name,
			Type:  qtype,
			Class: qclass,
		})
	}

	return &ParsedQuery{
		ID:        id,
		Flags:     flags,
		Questions: questions,
		Raw:       buf,
	}, nil
}

func parseDomainName(buf []byte, start int) (string, int, error) {
	var parts []string
	curr := start

	for {
		if curr >= len(buf) {
			return "", start, errors.New("malformed domain name offset")
		}
		length := int(buf[curr])
		if length == 0 {
			curr++
			break
		}
		// Pointer compression (0xC0) in query is uncommon, but handle safely
		if length&0xC0 == 0xC0 {
			curr += 2
			break
		}

		curr++
		if curr+length > len(buf) {
			return "", start, errors.New("label length exceeds packet boundary")
		}
		parts = append(parts, string(buf[curr:curr+length]))
		curr += length
	}

	return strings.Join(parts, "."), curr, nil
}

// BuildSinkholeResponse crafts an RFC 1035 response pointing to 0.0.0.0 (or ::).
func BuildSinkholeResponse(query *ParsedQuery) []byte {
	if len(query.Questions) == 0 {
		return nil
	}

	q := query.Questions[0]
	resp := make([]byte, 0, len(query.Raw)+32)

	// Header: 12 bytes
	header := make([]byte, 12)
	binary.BigEndian.PutUint16(header[0:2], query.ID)
	// Flags: QR=1 (response), AA=1 (authoritative), RD=preserved, RA=1 (recursion available)
	flags := uint16(0x8180) | (query.Flags & 0x0100) // preserve RD
	binary.BigEndian.PutUint16(header[2:4], flags)
	binary.BigEndian.PutUint16(header[4:6], 1) // QDCOUNT = 1
	binary.BigEndian.PutUint16(header[6:8], 1) // ANCOUNT = 1
	binary.BigEndian.PutUint16(header[8:10], 0)
	binary.BigEndian.PutUint16(header[10:12], 0)
	resp = append(resp, header...)

	// Append Question section from original query (offset 12 up to question end)
	// Find length of Question section in query
	qEnd := 12
	for qEnd < len(query.Raw) && query.Raw[qEnd] != 0 {
		qEnd += int(query.Raw[qEnd]) + 1
	}
	qEnd += 1 + 4 // null byte + QTYPE (2) + QCLASS (2)
	if qEnd <= len(query.Raw) {
		resp = append(resp, query.Raw[12:qEnd]...)
	}

	// Answer Section:
	// Pointer to question name: 0xC00C
	resp = append(resp, 0xC0, 0x0C)

	if q.Type == TypeAAAA {
		// Type AAAA (IPv6)
		ansHeader := make([]byte, 8)
		binary.BigEndian.PutUint16(ansHeader[0:2], TypeAAAA)
		binary.BigEndian.PutUint16(ansHeader[2:4], ClassIN)
		binary.BigEndian.PutUint32(ansHeader[4:8], 60) // TTL 60 seconds
		resp = append(resp, ansHeader...)

		// RDLENGTH = 16 bytes for ::
		resp = append(resp, 0x00, 0x10)
		resp = append(resp, make([]byte, 16)...)
	} else {
		// Type A (IPv4) or default
		ansHeader := make([]byte, 8)
		binary.BigEndian.PutUint16(ansHeader[0:2], TypeA)
		binary.BigEndian.PutUint16(ansHeader[2:4], ClassIN)
		binary.BigEndian.PutUint32(ansHeader[4:8], 60) // TTL 60 seconds
		resp = append(resp, ansHeader...)

		// RDLENGTH = 4 bytes: 0.0.0.0
		resp = append(resp, 0x00, 0x04)
		resp = append(resp, 0x00, 0x00, 0x00, 0x00)
	}

	return resp
}
