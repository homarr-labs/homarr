package docker

import (
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
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

func TestDevelopmentEncryptionKeyUsesEnvironmentOverride(t *testing.T) {
	want := strings.Repeat("a", 64)
	t.Setenv(developmentEncryptionKeyEnv, want)
	got, err := developmentEncryptionKey()
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("key = %q, want environment value", got)
	}
}

func TestPersistedDevelopmentEncryptionKeyIsReused(t *testing.T) {
	configDir := t.TempDir()
	first, err := persistedDevelopmentEncryptionKey(configDir)
	if err != nil {
		t.Fatal(err)
	}
	second, err := persistedDevelopmentEncryptionKey(configDir)
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatal("persisted key changed between reads")
	}
	decoded, err := hex.DecodeString(first)
	if err != nil || len(decoded) != 32 {
		t.Fatalf("generated key is not 32 bytes: %q", first)
	}
	info, err := os.Stat(filepath.Join(configDir, "homarr-dev", "secret-encryption-key"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("key permissions = %o, want 600", info.Mode().Perm())
	}
}

func TestPersistedDevelopmentEncryptionKeyRejectsInvalidValue(t *testing.T) {
	configDir := t.TempDir()
	dir := filepath.Join(configDir, "homarr-dev")
	if err := os.Mkdir(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "secret-encryption-key"), []byte("invalid\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := persistedDevelopmentEncryptionKey(configDir); err == nil {
		t.Fatal("expected invalid persisted key to fail")
	}
}

func TestPersistedDevelopmentEncryptionKeyConcurrentCreation(t *testing.T) {
	configDir := t.TempDir()
	type result struct {
		key string
		err error
	}
	results := make(chan result, 20)
	for range 20 {
		go func() {
			key, err := persistedDevelopmentEncryptionKey(configDir)
			results <- result{key: key, err: err}
		}()
	}
	var first string
	for range 20 {
		result := <-results
		if result.err != nil {
			t.Fatal(result.err)
		}
		if first == "" {
			first = result.key
		} else if result.key != first {
			t.Fatal("concurrent callers received different keys")
		}
	}
}
