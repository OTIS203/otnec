package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/netscope/netscope/agent/internal/models"
)

// ClientOptions holds configuration for backend transport.
type ClientOptions struct {
	ServerURL       string
	EnrollmentToken string
	AgentUUID       string
	Hostname        string
	ClientTimeout   time.Duration
	MaxQueueSize    int
	HTTPClient      *http.Client
}

// TransportClient manages enrollment, telemetry submission, and offline buffering.
type TransportClient struct {
	opts       ClientOptions
	httpClient *http.Client
	jwtToken   string
	queue      []models.ScanReport
	mu         sync.Mutex
}

// NewTransportClient instantiates the client.
func NewTransportClient(opts ClientOptions) *TransportClient {
	if opts.ClientTimeout <= 0 {
		opts.ClientTimeout = 10 * time.Second
	}
	if opts.MaxQueueSize <= 0 {
		opts.MaxQueueSize = 100
	}

	httpClient := opts.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: opts.ClientTimeout,
		}
	}

	return &TransportClient{
		opts:       opts,
		httpClient: httpClient,
		queue:      make([]models.ScanReport, 0),
	}
}

// Enroll exchanges the one-time enrollment token for an authenticated session token.
func (c *TransportClient) Enroll(ctx context.Context) error {
	if c.opts.EnrollmentToken == "" {
		return fmt.Errorf("no enrollment token provided")
	}

	payload := map[string]string{
		"token":         c.opts.EnrollmentToken,
		"agent_uuid":    c.opts.AgentUUID,
		"hostname":      c.opts.Hostname,
		"agent_version": "1.0.0",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/api/v1/agents/enroll", c.opts.ServerURL)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("enrollment connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("enrollment rejected with status %d", resp.StatusCode)
	}

	var res struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	c.jwtToken = res.AccessToken
	return nil
}

// QueueOrSend transmits the scan report to backend or buffers it locally if offline.
func (c *TransportClient) QueueOrSend(ctx context.Context, report *models.ScanReport) error {
	// First attempt to flush existing offline queue
	c.flushQueue(ctx)

	err := c.sendReport(ctx, report)
	if err != nil {
		c.mu.Lock()
		if len(c.queue) < c.opts.MaxQueueSize {
			c.queue = append(c.queue, *report)
		}
		c.mu.Unlock()
		return fmt.Errorf("backend unreachable (report buffered in offline queue): %w", err)
	}

	return nil
}

// flushQueue drains queued scan reports if connectivity is restored.
func (c *TransportClient) flushQueue(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.queue) == 0 {
		return
	}

	var remaining []models.ScanReport
	for _, r := range c.queue {
		if err := c.sendReport(ctx, &r); err != nil {
			remaining = append(remaining, r)
		}
	}
	c.queue = remaining
}

// sendReport posts the telemetry report to the backend API.
func (c *TransportClient) sendReport(ctx context.Context, report *models.ScanReport) error {
	body, err := json.Marshal(report)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/api/v1/agents/telemetry", c.opts.ServerURL)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.jwtToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.jwtToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("server responded with status %d", resp.StatusCode)
	}

	return nil
}

// GetQueueSize returns count of buffered reports.
func (c *TransportClient) GetQueueSize() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.queue)
}

