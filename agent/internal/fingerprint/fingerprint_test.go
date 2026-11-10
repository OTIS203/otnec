package fingerprint

import (
	"testing"

	"github.com/netscope/netscope/agent/internal/models"
)

func TestLookupOUI(t *testing.T) {
	tests := []struct {
		mac      string
		expected string
	}{
		{"b8:27:eb:12:34:56", "Raspberry Pi Foundation"},
		{"00:1a:11:99:aa:bb", "Google"},
		{"24:0a:c4:00:11:22", "Espressif Inc."},
		{"00:00:0c:12:34:56", "Cisco Systems"},
		{"00:40:8c:aa:bb:cc", "Axis Communications"},
		{"ff:ff:ff:ff:ff:ff", "Unknown Vendor"},
	}

	for _, tc := range tests {
		actual := LookupOUI(tc.mac)
		if actual != tc.expected {
			t.Errorf("LookupOUI(%s) = %s, expected %s", tc.mac, actual, tc.expected)
		}
	}
}

func TestClassifyDevice(t *testing.T) {
	// Router test
	devType, _ := ClassifyDevice("Cisco Systems", "gateway.home", []int{53, 80}, nil, "", true)
	if devType != models.DeviceTypeRouter {
		t.Errorf("expected router, got %s", devType)
	}

	// Printer test
	devType, _ = ClassifyDevice("HP Inc.", "HP-LaserJet-M404", []int{9100}, nil, "", false)
	if devType != models.DeviceTypePrinter {
		t.Errorf("expected printer, got %s", devType)
	}

	// IP Camera test
	devType, _ = ClassifyDevice("Hangzhou Hikvision", "cam-front-door", []int{554, 80}, nil, "", false)
	if devType != models.DeviceTypeCamera {
		t.Errorf("expected camera, got %s", devType)
	}

	// Smart TV test
	devType, _ = ClassifyDevice("Roku Inc.", "living-room-roku", nil, []string{"_googlecast._tcp"}, "", false)
	if devType != models.DeviceTypeSmartTV {
		t.Errorf("expected smart_tv, got %s", devType)
	}

	// IoT Smart home test
	devType, _ = ClassifyDevice("Espressif Inc.", "smart-plug-01", nil, nil, "", false)
	if devType != models.DeviceTypeIoT {
		t.Errorf("expected iot, got %s", devType)
	}

	// Phone test
	devType, _ = ClassifyDevice("Apple", "Alice's iPhone", nil, nil, "", false)
	if devType != models.DeviceTypePhone {
		t.Errorf("expected phone, got %s", devType)
	}
}

