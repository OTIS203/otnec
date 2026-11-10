package discovery

import (
	"bufio"
	"bytes"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
)

var (
	// Regex for standard ARP table parsing across Windows, Linux, and macOS
	arpRegex = regexp.MustCompile(`([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\s+([0-9a-fA-F:-]{11,17})`)
)

// ReadOSARPCache queries the OS ARP table to extract IP-to-MAC mappings.
func ReadOSARPCache() (map[string]string, error) {
	ipToMAC := make(map[string]string)

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("arp", "-a")
	} else if runtime.GOOS == "darwin" {
		cmd = exec.Command("arp", "-a", "-n")
	} else {
		// Linux: try ip neigh first, fallback to arp -n
		cmd = exec.Command("ip", "neigh", "show")
	}

	output, err := cmd.Output()
	if err != nil {
		// Linux fallback if 'ip neigh' isn't available
		if runtime.GOOS == "linux" {
			fallbackCmd := exec.Command("arp", "-n")
			output, err = fallbackCmd.Output()
			if err != nil {
				return ipToMAC, nil // Return empty map without crashing
			}
		} else {
			return ipToMAC, nil
		}
	}

	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		matches := arpRegex.FindStringSubmatch(line)
		if len(matches) >= 3 {
			ip := matches[1]
			mac := NormalizeMAC(matches[2])
			// Exclude broadcast or multicast MACs
			if mac != "ff:ff:ff:ff:ff:ff" && !strings.HasPrefix(mac, "01:00:5e") && mac != "00:00:00:00:00:00" {
				ipToMAC[ip] = mac
			}
		}
	}

	return ipToMAC, nil
}

