package docker

import (
	"errors"
	"testing"
)

func TestContainerHostPort(t *testing.T) {
	c := Container{Ports: "0.0.0.0:7576->7575/tcp, [::]:7576->7575/tcp"}
	if got := c.HostPort(); got != "7576" {
		t.Fatalf("HostPort() = %q, want 7576", got)
	}
}

func TestIsPortConflict(t *testing.T) {
	for _, message := range []string{
		"Bind for 0.0.0.0:7575 failed: port is already allocated",
		"driver failed programming external connectivity on endpoint",
	} {
		if !IsPortConflict(errors.New(message)) {
			t.Fatalf("expected port conflict for %q", message)
		}
	}
	if IsPortConflict(errors.New("manifest unknown")) {
		t.Fatal("manifest error classified as port conflict")
	}
}

func TestParseUsedDockerPortsPreservesLineBoundaries(t *testing.T) {
	ports := parseUsedDockerPorts([]byte("6379/tcp\n0.0.0.0:7575->7575/tcp, [::]:7575->7575/tcp\n0.0.0.0:8000-8002->8000-8002/tcp\n"))
	for _, port := range []int{7575, 8000, 8001, 8002} {
		if !ports[port] {
			t.Fatalf("port %d was not detected", port)
		}
	}
}

func TestFindFreePortRejectsOutOfRangeStart(t *testing.T) {
	if port := FindFreePort(65536); port != 0 {
		t.Fatalf("port = %d, want 0", port)
	}
}
