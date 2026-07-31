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
