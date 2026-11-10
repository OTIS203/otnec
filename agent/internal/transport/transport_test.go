package transport

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/netscope/netscope/agent/internal/models"
)

type inMemoryTransport struct {
	handler http.Handler
}

func (m *inMemoryTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	rec := httptest.NewRecorder()
	m.handler.ServeHTTP(rec, req)
	return rec.Result(), nil
}

func TestTransportClientEnrollAndSend(t *testing.T) {
	var receivedReport models.ScanReport
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/agents/enroll":
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"access_token": "mock-jwt-token-xyz",
			})
		case "/api/v1/agents/telemetry":
			auth := r.Header.Get("Authorization")
			if auth != "Bearer mock-jwt-token-xyz" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			_ = json.NewDecoder(r.Body).Decode(&receivedReport)
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	mockClient := &http.Client{
		Transport: &inMemoryTransport{handler: handler},
		Timeout:   2 * time.Second,
	}

	ctx := context.Background()
	client := NewTransportClient(ClientOptions{
		ServerURL:       "http://netscope.local",
		EnrollmentToken: "test-token",
		AgentUUID:       "agent-1",
		Hostname:        "testhost",
		ClientTimeout:   2 * time.Second,
		HTTPClient:      mockClient,
	})

	err := client.Enroll(ctx)
	if err != nil {
		t.Fatalf("expected successful enrollment, got: %v", err)
	}

	testReport := &models.ScanReport{
		ScanID:      "scan-123",
		AgentID:     "agent-1",
		Subnet:      "192.168.1.0/24",
		ActiveHosts: 5,
	}

	err = client.QueueOrSend(ctx, testReport)
	if err != nil {
		t.Fatalf("expected successful send, got: %v", err)
	}

	if receivedReport.ScanID != "scan-123" {
		t.Errorf("expected received scan ID 'scan-123', got '%s'", receivedReport.ScanID)
	}
}

func TestTransportOfflineQueueing(t *testing.T) {
	ctx := context.Background()
	// Point to unreachable port to test offline buffer
	client := NewTransportClient(ClientOptions{
		ServerURL:     "http://127.0.0.1:54321",
		AgentUUID:     "agent-1",
		ClientTimeout: 100 * time.Millisecond,
		MaxQueueSize:  10,
	})

	report := &models.ScanReport{
		ScanID: "offline-scan-1",
	}

	err := client.QueueOrSend(ctx, report)
	if err == nil {
		t.Fatal("expected error connecting to offline server, got nil")
	}

	if client.GetQueueSize() != 1 {
		t.Fatalf("expected 1 report buffered in offline queue, got %d", client.GetQueueSize())
	}
}
