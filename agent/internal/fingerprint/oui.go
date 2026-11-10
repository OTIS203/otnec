package fingerprint

import (
	"strings"
)

// Embedded OUI prefix table for high-accuracy local lookup without external network dependency.
var ouiDatabase = map[string]string{
	// Apple
	"00:03:93": "Apple",
	"00:05:02": "Apple",
	"00:0a:27": "Apple",
	"00:0a:95": "Apple",
	"00:0d:93": "Apple",
	"00:10:fa": "Apple",
	"00:11:24": "Apple",
	"00:14:51": "Apple",
	"00:16:cb": "Apple",
	"00:17:f2": "Apple",
	"00:19:e3": "Apple",
	"00:1b:63": "Apple",
	"00:1c:b3": "Apple",
	"00:1d:4f": "Apple",
	"00:1e:52": "Apple",
	"00:1f:5b": "Apple",
	"00:1f:f3": "Apple",
	"00:21:e9": "Apple",
	"00:22:41": "Apple",
	"00:23:12": "Apple",
	"00:23:df": "Apple",
	"00:24:36": "Apple",
	"00:25:00": "Apple",
	"00:25:bc": "Apple",
	"00:26:08": "Apple",
	"00:26:4a": "Apple",
	"00:26:b0": "Apple",
	"3c:06:30": "Apple",
	"40:6c:8f": "Apple",
	"a4:83:e7": "Apple",
	"f4:f5:d8": "Apple",
	"ac:de:48": "Apple",

	// Google / Alphabet / Nest
	"00:1a:11": "Google",
	"20:df:b9": "Google",
	"30:fd:38": "Google",
	"54:60:09": "Google",
	"64:16:66": "Google",
	"94:eb:2c": "Google",
	"d8:6c:63": "Google",
	"f8:8f:ca": "Google",
	"18:b4:30": "Nest Labs",
	"64:16:7f": "Nest Labs",

	// Samsung
	"00:00:f0": "Samsung",
	"00:07:ab": "Samsung",
	"00:0d:ae": "Samsung",
	"00:12:47": "Samsung",
	"00:15:99": "Samsung",
	"00:16:32": "Samsung",
	"00:17:c9": "Samsung",
	"00:1d:25": "Samsung",
	"00:21:19": "Samsung",
	"00:23:39": "Samsung",
	"00:26:37": "Samsung",
	"30:cd:a7": "Samsung",
	"48:44:f7": "Samsung",

	// Amazon / Ring / Eero
	"00:fc:8b": "Amazon Technologies",
	"40:b4:cd": "Amazon Technologies",
	"44:65:0d": "Amazon Technologies",
	"50:dc:e7": "Amazon Technologies",
	"68:37:e9": "Amazon Technologies",
	"74:c2:46": "Amazon Technologies",
	"84:d6:d0": "Amazon Technologies",
	"fc:65:de": "Amazon Technologies",
	"9c:76:13": "Ring LLC",

	// Raspberry Pi Foundation
	"b8:27:eb": "Raspberry Pi Foundation",
	"dc:a6:32": "Raspberry Pi Trading",
	"e4:5f:01": "Raspberry Pi Trading",
	"28:cd:c1": "Raspberry Pi Trading",

	// Espressif (ESP8266 / ESP32 smart home devices)
	"18:fe:34": "Espressif Inc.",
	"24:0a:c4": "Espressif Inc.",
	"24:6f:28": "Espressif Inc.",
	"30:ae:a4": "Espressif Inc.",
	"84:0d:8e": "Espressif Inc.",
	"84:f3:eb": "Espressif Inc.",
	"a4:cf:12": "Espressif Inc.",
	"bc:dd:c2": "Espressif Inc.",
	"cc:50:e3": "Espressif Inc.",

	// Networking & Infrastructure (Cisco, TP-Link, Netgear, Ubiquiti, MikroTik)
	"00:00:0c": "Cisco Systems",
	"00:01:42": "Cisco Systems",
	"00:14:f6": "Cisco Systems",
	"00:1e:13": "Cisco Systems",
	"50:06:04": "Cisco Systems",
	"00:0a:eb": "TP-Link Technologies",
	"14:cc:20": "TP-Link Technologies",
	"50:c7:bf": "TP-Link Technologies",
	"98:48:27": "TP-Link Technologies",
	"ec:08:6b": "TP-Link Technologies",
	"00:09:5b": "Netgear",
	"00:14:6c": "Netgear",
	"20:e5:2a": "Netgear",
	"c0:ff:d4": "Netgear",
	"00:27:22": "Ubiquiti Networks",
	"04:18:d6": "Ubiquiti Networks",
	"24:a4:3c": "Ubiquiti Networks",
	"68:d7:9a": "Ubiquiti Networks",
	"78:8a:20": "Ubiquiti Networks",
	"dc:9f:db": "Ubiquiti Networks",
	"00:0c:42": "MikroTik",
	"48:8f:5a": "MikroTik",
	"6c:3b:6b": "MikroTik",

	// Intel, Dell, HP, Microsoft (PCs & Servers)
	"00:02:b3": "Intel",
	"00:03:47": "Intel",
	"00:04:23": "Intel",
	"00:0e:0c": "Intel",
	"00:13:e8": "Intel",
	"00:1b:21": "Intel",
	"00:14:22": "Dell",
	"00:18:8b": "Dell",
	"00:1e:4f": "Dell",
	"00:21:70": "Dell",
	"00:01:e6": "HP Inc.",
	"00:08:02": "HP Inc.",
	"00:11:0a": "HP Inc.",
	"00:15:60": "HP Inc.",
	"00:12:5a": "Microsoft",
	"00:15:5d": "Microsoft (Hyper-V)",
	"00:1d:d8": "Microsoft",
	"28:18:78": "Microsoft",

	// Smart TVs & Audio (Sony, LG, Philips, Roku, Sonos)
	"00:01:4a": "Sony",
	"00:04:1f": "Sony",
	"00:13:15": "Sony",
	"00:15:c1": "Sony",
	"00:05:cd": "LG Electronics",
	"00:1c:62": "LG Electronics",
	"00:1e:75": "LG Electronics",
	"00:0d:4b": "Roku Inc.",
	"b0:a7:37": "Roku Inc.",
	"00:0e:58": "Sonos Inc.",
	"5c:aa:fd": "Sonos Inc.",

	// IP Cameras (Hikvision, Dahua, Axis, Reolink)
	"00:40:8c": "Axis Communications",
	"44:19:b6": "Hangzhou Hikvision",
	"bc:ba:e1": "Hangzhou Hikvision",
	"38:af:29": "Zhejiang Dahua",
	"48:ea:63": "Shenzhen Reolink",
}

// LookupOUI returns the hardware vendor string for a given MAC address.
func LookupOUI(mac string) string {
	clean := strings.ToLower(strings.TrimSpace(mac))
	clean = strings.ReplaceAll(clean, "-", ":")
	if len(clean) < 8 {
		return "Unknown"
	}

	prefix := clean[:8] // "xx:xx:xx"
	if vendor, ok := ouiDatabase[prefix]; ok {
		return vendor
	}

	return "Unknown Vendor"
}

