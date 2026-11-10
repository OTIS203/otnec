package dnsfilter

import (
	"context"
	"fmt"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

// QueryLog represents a single logged DNS lookup from an internal device.
type QueryLog struct {
	ID          string    `json:"id"`
	ClientIP    string    `json:"client_ip"`
	Domain      string    `json:"domain"`
	Category    Category  `json:"category"`
	ServiceName string    `json:"service_name"`
	IsBlocked   bool      `json:"is_blocked"`
	QueryType   string    `json:"query_type"`
	Timestamp   time.Time `json:"timestamp"`
}

// StatsSnapshot contains aggregate metrics for the DNS guard.
type StatsSnapshot struct {
	TotalQueries   uint64            `json:"total_queries"`
	BlockedQueries uint64            `json:"blocked_queries"`
	SocialQueries  uint64            `json:"social_queries"`
	TopDomains     map[string]uint64 `json:"top_domains"`
	TopClients     map[string]uint64 `json:"top_clients"`
}

// DNSServer provides DNS filtering, logging, and sinkholing.
type DNSServer struct {
	listenAddr string
	upstream   string
	engine     *FilterEngine

	conn net.PacketConn

	mu          sync.RWMutex
	logs        []QueryLog
	maxLogs     int
	topDomains  map[string]uint64
	topClients  map[string]uint64

	totalQueries   uint64
	blockedQueries uint64
	socialQueries  uint64

	logCallback func(QueryLog)
}

// NewDNSServer creates a DNS proxy/filter server instance.
func NewDNSServer(listenAddr, upstream string, engine *FilterEngine) *DNSServer {
	if upstream == "" {
		upstream = "1.1.1.1:53"
	}
	return &DNSServer{
		listenAddr: listenAddr,
		upstream:   upstream,
		engine:     engine,
		maxLogs:    500,
		logs:       make([]QueryLog, 0, 500),
		topDomains: make(map[string]uint64),
		topClients: make(map[string]uint64),
	}
}

// SetLogCallback registers a listener for real-time query events.
func (s *DNSServer) SetLogCallback(cb func(QueryLog)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.logCallback = cb
}

// Start begins listening for DNS UDP queries.
func (s *DNSServer) Start(ctx context.Context) error {
	conn, err := net.ListenPacket("udp", s.listenAddr)
	if err != nil {
		return fmt.Errorf("failed to bind dns listener on %s: %w", s.listenAddr, err)
	}
	s.conn = conn

	go func() {
		<-ctx.Done()
		s.conn.Close()
	}()

	buf := make([]byte, 4096)
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

		reqBytes := make([]byte, n)
		copy(reqBytes, buf[:n])

		go s.handlePacket(reqBytes, clientAddr)
	}
}

func (s *DNSServer) handlePacket(raw []byte, clientAddr net.Addr) {
	atomic.AddUint64(&s.totalQueries, 1)

	clientIP, _, _ := net.SplitHostPort(clientAddr.String())
	if clientIP == "" {
		clientIP = clientAddr.String()
	}

	query, err := ParseDNSQuery(raw)
	if err != nil || len(query.Questions) == 0 {
		return
	}

	q := query.Questions[0]
	qtypeStr := "A"
	if q.Type == TypeAAAA {
		qtypeStr = "AAAA"
	}

	classification := s.engine.Classify(q.Name)

	if classification.Category == CategorySocialMedia {
		atomic.AddUint64(&s.socialQueries, 1)
	}

	logEntry := QueryLog{
		ID:          fmt.Sprintf("dns-%d", time.Now().UnixNano()),
		ClientIP:    clientIP,
		Domain:      q.Name,
		Category:    classification.Category,
		ServiceName: classification.ServiceName,
		IsBlocked:   classification.IsBlocked,
		QueryType:   qtypeStr,
		Timestamp:   time.Now().UTC(),
	}

	s.recordLog(logEntry)

	// If blocked, synthesize 0.0.0.0 sinkhole response
	if classification.IsBlocked {
		atomic.AddUint64(&s.blockedQueries, 1)
		sinkhole := BuildSinkholeResponse(query)
		if sinkhole != nil {
			_, _ = s.conn.WriteTo(sinkhole, clientAddr)
		}
		return
	}

	// Allowed: Forward to upstream resolver
	resp, err := s.forwardUpstream(raw)
	if err == nil && resp != nil {
		_, _ = s.conn.WriteTo(resp, clientAddr)
	}
}

func (s *DNSServer) forwardUpstream(queryBytes []byte) ([]byte, error) {
	uConn, err := net.DialTimeout("udp", s.upstream, 2*time.Second)
	if err != nil {
		return nil, err
	}
	defer uConn.Close()

	_ = uConn.SetDeadline(time.Now().Add(2 * time.Second))
	if _, err := uConn.Write(queryBytes); err != nil {
		return nil, err
	}

	resp := make([]byte, 4096)
	n, err := uConn.Read(resp)
	if err != nil {
		return nil, err
	}

	return resp[:n], nil
}

func (s *DNSServer) recordLog(entry QueryLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.logs) >= s.maxLogs {
		s.logs = s.logs[1:]
	}
	s.logs = append(s.logs, entry)

	s.topDomains[entry.Domain]++
	s.topClients[entry.ClientIP]++

	if s.logCallback != nil {
		cb := s.logCallback
		go cb(entry)
	}
}

// GetRecentLogs returns the latest logged DNS queries.
func (s *DNSServer) GetRecentLogs(limit int) []QueryLog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	n := len(s.logs)
	if limit <= 0 || limit > n {
		limit = n
	}

	result := make([]QueryLog, limit)
	for i := 0; i < limit; i++ {
		result[i] = s.logs[n-1-i]
	}
	return result
}

// GetStats returns aggregated counters and top statistics.
func (s *DNSServer) GetStats() StatsSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domainsCopy := make(map[string]uint64, len(s.topDomains))
	for k, v := range s.topDomains {
		domainsCopy[k] = v
	}

	clientsCopy := make(map[string]uint64, len(s.topClients))
	for k, v := range s.topClients {
		clientsCopy[k] = v
	}

	return StatsSnapshot{
		TotalQueries:   atomic.LoadUint64(&s.totalQueries),
		BlockedQueries: atomic.LoadUint64(&s.blockedQueries),
		SocialQueries:  atomic.LoadUint64(&s.socialQueries),
		TopDomains:     domainsCopy,
		TopClients:     clientsCopy,
	}
}
