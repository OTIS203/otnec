package fingerprint

import (
	"strings"

	"github.com/netscope/netscope/agent/internal/models"
)

// ClassifyDevice infers device type and OS guess from multi-vector attributes.
func ClassifyDevice(
	vendor string,
	hostname string,
	openPorts []int,
	mdnsServices []string,
	ssdpServer string,
	isGateway bool,
) (models.DeviceType, string) {
	vLower := strings.ToLower(vendor)
	hLower := strings.ToLower(hostname)
	sLower := strings.ToLower(ssdpServer)

	// 1. Gateway / Router detection
	if isGateway || strings.Contains(hLower, "router") || strings.Contains(hLower, "gateway") || strings.Contains(sLower, "gateway") {
		return models.DeviceTypeRouter, "Embedded Linux / Network OS"
	}
	if strings.Contains(vLower, "cisco") || strings.Contains(vLower, "mikrotik") || strings.Contains(vLower, "ubiquiti") || strings.Contains(vLower, "netgear") || strings.Contains(vLower, "tp-link") {
		for _, p := range openPorts {
			if p == 53 || p == 80 || p == 443 || p == 8443 {
				return models.DeviceTypeRouter, "Network OS"
			}
		}
	}

	// 2. Printers
	if strings.Contains(hLower, "printer") || strings.Contains(hLower, "epson") || strings.Contains(hLower, "canon") || strings.Contains(hLower, "brother") || strings.Contains(hLower, "xerox") {
		return models.DeviceTypePrinter, "Embedded RTOS"
	}
	for _, p := range openPorts {
		if p == 9100 || p == 631 || p == 515 {
			return models.DeviceTypePrinter, "Embedded Print Server"
		}
	}
	for _, s := range mdnsServices {
		if strings.Contains(s, "printer") || strings.Contains(s, "ipp") {
			return models.DeviceTypePrinter, "Embedded Print Server"
		}
	}

	// 3. IP Cameras
	if strings.Contains(vLower, "hikvision") || strings.Contains(vLower, "dahua") || strings.Contains(vLower, "reolink") || strings.Contains(vLower, "axis") || strings.Contains(hLower, "cam") {
		return models.DeviceTypeCamera, "Embedded Linux (IP Camera)"
	}
	for _, p := range openPorts {
		if p == 554 || p == 8554 { // RTSP streaming port
			return models.DeviceTypeCamera, "Embedded Linux (IP Camera)"
		}
	}

	// 4. Smart TVs, Streaming Devices, Audio
	if strings.Contains(vLower, "roku") || strings.Contains(vLower, "sonos") || strings.Contains(hLower, "tv") || strings.Contains(hLower, "bravia") || strings.Contains(hLower, "chromecast") || strings.Contains(hLower, "apple-tv") {
		return models.DeviceTypeSmartTV, "Smart TV / Media OS"
	}
	for _, s := range mdnsServices {
		if strings.Contains(s, "googlecast") || strings.Contains(s, "airplay") || strings.Contains(s, "spotify") {
			return models.DeviceTypeSmartTV, "Media Player / Smart TV"
		}
	}

	// 5. IoT / Smart Home Devices
	if strings.Contains(vLower, "espressif") || strings.Contains(vLower, "tuya") || strings.Contains(vLower, "nest") || strings.Contains(vLower, "ring") || strings.Contains(vLower, "philips lighting") {
		return models.DeviceTypeIoT, "Embedded RTOS / FreeRTOS"
	}

	// 6. Mobile Phones / Tablets
	if strings.Contains(hLower, "iphone") || strings.Contains(hLower, "ipad") {
		return models.DeviceTypePhone, "Apple iOS / iPadOS"
	}
	if strings.Contains(hLower, "android") || strings.Contains(hLower, "galaxy") || strings.Contains(hLower, "pixel") {
		return models.DeviceTypePhone, "Android"
	}

	// 7. Workstations, Laptops & PCs
	if strings.Contains(hLower, "macbook") || strings.Contains(hLower, "imac") || (strings.Contains(vLower, "apple") && !strings.Contains(hLower, "iphone")) {
		return models.DeviceTypePC, "macOS"
	}
	if strings.Contains(hLower, "desktop") || strings.Contains(hLower, "laptop") || strings.Contains(hLower, "surface") || strings.Contains(vLower, "dell") || strings.Contains(vLower, "lenovo") {
		return models.DeviceTypePC, "Windows"
	}

	// 8. Port heuristics fallback
	for _, p := range openPorts {
		if p == 3389 {
			return models.DeviceTypePC, "Windows (RDP enabled)"
		}
		if p == 445 || p == 139 {
			return models.DeviceTypePC, "Windows / Samba"
		}
		if p == 22 {
			return models.DeviceTypeServer, "Linux / UNIX (SSH)"
		}
	}

	if strings.Contains(vLower, "raspberry pi") {
		return models.DeviceTypeServer, "Raspberry Pi OS (Linux)"
	}

	return models.DeviceTypeUnknown, "Generic Device"
}

