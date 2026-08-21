package docker

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const developmentEncryptionKeyEnv = "HOMARR_DEV_SECRET_ENCRYPTION_KEY"

type Container struct {
	ID     string
	Name   string
	Image  string
	Status string
	Ports  string
	State  string
}

func (c Container) HostPort() string {
	for _, mapping := range strings.Split(c.Ports, ", ") {
		if strings.HasSuffix(mapping, "->7575/tcp") {
			parts := strings.Split(mapping, "->")
			left := parts[0]
			if i := strings.LastIndex(left, ":"); i >= 0 {
				return left[i+1:]
			}
			return left
		}
	}
	return ""
}

func (c Container) Running() bool {
	return c.State == "running"
}

func List() ([]Container, error) {
	out, err := exec.Command("docker", "ps", "-a",
		"--filter", "name=homarr",
		"--format", "{{json .}}").Output()
	if err != nil {
		return nil, err
	}

	var containers []Container
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		var raw struct {
			ID     string
			Names  string
			Image  string
			Status string
			Ports  string
			State  string
		}
		if err := json.Unmarshal([]byte(line), &raw); err != nil {
			continue
		}
		containers = append(containers, Container{
			ID:     raw.ID,
			Name:   raw.Names,
			Image:  raw.Image,
			Status: raw.Status,
			Ports:  raw.Ports,
			State:  raw.State,
		})
	}
	filtered := containers[:0]
	for _, c := range containers {
		if c.Name == "homarr" || strings.HasPrefix(c.Name, "homarr_") {
			filtered = append(filtered, c)
		}
	}
	return filtered, nil
}

func FindFreePort(start int) int {
	if start > 65535 {
		return 0
	}
	used := usedDockerPorts()
	start = max(start, 1)
	for port := start; port <= 65535; port++ {
		if used[port] {
			continue
		}
		listener, err := net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%d", port))
		if err == nil {
			_ = listener.Close()
			return port
		}
	}
	return 0
}

func usedDockerPorts() map[int]bool {
	out, err := exec.Command("docker", "ps", "--format", "{{.Ports}}").Output()
	if err != nil {
		return make(map[int]bool)
	}
	return parseUsedDockerPorts(out)
}

func parseUsedDockerPorts(out []byte) map[int]bool {
	used := make(map[int]bool)
	for _, line := range strings.Split(string(out), "\n") {
		for _, mapping := range strings.Split(line, ",") {
			left, _, found := strings.Cut(mapping, "->")
			if !found {
				continue
			}
			colon := strings.LastIndex(left, ":")
			if colon < 0 {
				continue
			}
			ports := strings.SplitN(strings.TrimSpace(left[colon+1:]), "-", 2)
			first, err := strconv.Atoi(ports[0])
			if err != nil {
				continue
			}
			last := first
			if len(ports) == 2 {
				if parsed, err := strconv.Atoi(ports[1]); err == nil {
					last = parsed
				}
			}
			for port := first; port <= last; port++ {
				used[port] = true
			}
		}
	}
	return used
}

func IsRunning(name string) bool {
	containers, _ := List()
	for _, c := range containers {
		if c.Name == name && c.Running() {
			return true
		}
	}
	return false
}

type StartOptions struct {
	Name       string
	Image      string
	Volume     string
	HostPort   int
	Env        []string
	Platform   string
	PullAlways bool
	Daemon     bool
}

func Start(opts StartOptions) error {
	encryptionKey, err := developmentEncryptionKey()
	if err != nil {
		return err
	}

	if opts.PullAlways {
		cmd := PullCommand(opts.Image, opts.Platform)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("pull %s: %w", opts.Image, err)
		}
	}

	_ = exec.Command("docker", "rm", "-f", opts.Name).Run()

	args := []string{"run", "--rm", "--name", opts.Name,
		"-e", "SECRET_ENCRYPTION_KEY=" + encryptionKey,
	}
	if opts.Platform != "" {
		args = append(args, "--platform", opts.Platform)
	}
	if opts.Daemon {
		args = append(args, "-d")
	} else {
		args = append(args, "-it")
	}
	for _, env := range opts.Env {
		args = append(args, "-e", env)
	}
	args = append(args,
		"-v", opts.Volume+":/appdata",
		"-v", "/var/run/docker.sock:/var/run/docker.sock:ro",
		"-p", fmt.Sprintf("%d:7575", opts.HostPort),
		opts.Image,
	)

	cmd := exec.Command("docker", args...)
	if opts.Daemon {
		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("%w: %s", err, cleanOutput(out))
		}
		return nil
	}
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	stderr := &tailBuffer{}
	cmd.Stderr = io.MultiWriter(os.Stderr, stderr)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%w: %s", err, cleanOutput(stderr.data))
	}
	return nil
}

func developmentEncryptionKey() (string, error) {
	if key := os.Getenv(developmentEncryptionKeyEnv); key != "" {
		return validateDevelopmentEncryptionKey(key)
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate user config directory: %w", err)
	}
	return persistedDevelopmentEncryptionKey(configDir)
}

func persistedDevelopmentEncryptionKey(configDir string) (string, error) {
	dir := filepath.Join(configDir, "homarr-dev")
	path := filepath.Join(dir, "secret-encryption-key")
	if key, found, err := readDevelopmentEncryptionKey(path); found || err != nil {
		return key, err
	}

	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("create development config directory: %w", err)
	}
	lockPath := path + ".lock"
	for attempts := 0; ; attempts++ {
		if err := os.Mkdir(lockPath, 0o700); err == nil {
			break
		} else if !os.IsExist(err) {
			return "", fmt.Errorf("lock development encryption key: %w", err)
		}
		if key, found, err := readDevelopmentEncryptionKey(path); found || err != nil {
			return key, err
		}
		if attempts == 99 {
			return "", fmt.Errorf("timed out waiting for development encryption key lock %q", lockPath)
		}
		time.Sleep(10 * time.Millisecond)
	}
	defer func() { _ = os.Remove(lockPath) }()

	if key, found, err := readDevelopmentEncryptionKey(path); found || err != nil {
		return key, err
	}
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", fmt.Errorf("generate development encryption key: %w", err)
	}
	key := hex.EncodeToString(keyBytes)
	file, err := os.CreateTemp(dir, "secret-encryption-key-*.tmp")
	if err != nil {
		return "", fmt.Errorf("create development encryption key: %w", err)
	}
	tempPath := file.Name()
	defer func() { _ = os.Remove(tempPath) }()
	if _, err := file.WriteString(key + "\n"); err != nil {
		_ = file.Close()
		return "", fmt.Errorf("write development encryption key: %w", err)
	}
	if err := file.Close(); err != nil {
		return "", fmt.Errorf("close development encryption key: %w", err)
	}
	if err := os.Chmod(tempPath, 0o600); err != nil {
		return "", fmt.Errorf("secure development encryption key: %w", err)
	}
	if err := os.Rename(tempPath, path); err != nil {
		return "", fmt.Errorf("persist development encryption key: %w", err)
	}
	return key, nil
}

func readDevelopmentEncryptionKey(path string) (string, bool, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("read development encryption key: %w", err)
	}
	key, err := validateDevelopmentEncryptionKey(strings.TrimSpace(string(data)))
	return key, true, err
}

func validateDevelopmentEncryptionKey(key string) (string, error) {
	decoded, err := hex.DecodeString(key)
	if err != nil || len(decoded) != 32 {
		return "", fmt.Errorf("development encryption key must contain exactly 64 hexadecimal characters")
	}
	return key, nil
}

type tailBuffer struct {
	data []byte
}

func (b *tailBuffer) Write(p []byte) (int, error) {
	const limit = 32 * 1024
	b.data = append(b.data, p...)
	if len(b.data) > limit {
		b.data = b.data[len(b.data)-limit:]
	}
	return len(p), nil
}

func cleanOutput(out []byte) string {
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	cleaned := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "WARNING: The requested image's platform") || isContainerID(line) {
			continue
		}
		if line != "" {
			cleaned = append(cleaned, line)
		}
	}
	return strings.Join(cleaned, "\n")
}

func isContainerID(value string) bool {
	if len(value) != 64 {
		return false
	}
	for _, r := range value {
		if !(r >= '0' && r <= '9') && !(r >= 'a' && r <= 'f') {
			return false
		}
	}
	return true
}

func PullCommand(image, platform string) *exec.Cmd {
	return PullCommandContext(context.Background(), image, platform)
}

func PullCommandContext(ctx context.Context, image, platform string) *exec.Cmd {
	args := []string{"pull"}
	if platform != "" {
		args = append(args, "--platform", platform)
	}
	args = append(args, image)
	cmd := exec.CommandContext(ctx, "docker", args...)
	if platform != "" {
		cmd.Env = append(os.Environ(), "DOCKER_DEFAULT_PLATFORM="+platform)
	}
	return cmd
}

func IsPortConflict(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "port is already allocated") ||
		strings.Contains(message, "address already in use") ||
		strings.Contains(message, "failed programming external connectivity")
}

func Stop(name string) error { return StopContext(context.Background(), name) }

func Restart(name string) error { return RestartContext(context.Background(), name) }

func Remove(name string) error { return RemoveContext(context.Background(), name) }

// The context-aware variants let a background job be cancelled while the daemon
// is still thinking, which matters when Docker is wedged and the user wants the
// interface back.
func StopContext(ctx context.Context, name string) error {
	return runContainerCommand(ctx, "stop", name)
}

func RestartContext(ctx context.Context, name string) error {
	return runContainerCommand(ctx, "restart", name)
}

func RemoveContext(ctx context.Context, name string) error {
	return runContainerCommand(ctx, "rm", "-f", name)
}

func runContainerCommand(ctx context.Context, args ...string) error {
	out, err := exec.CommandContext(ctx, "docker", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func CheckImage(image string) (bool, error) {
	cmd := exec.Command("docker", "manifest", "inspect", image)
	out, err := cmd.CombinedOutput()
	if err == nil {
		return true, nil
	}
	message := strings.ToLower(string(out))
	if strings.Contains(message, "manifest unknown") || strings.Contains(message, "no such manifest") {
		return false, nil
	}
	return false, fmt.Errorf("check image %s: %w: %s", image, err, strings.TrimSpace(string(out)))
}

func FollowLogs(name string) error {
	cmd := exec.Command("docker", "logs", "-f", "--tail", "100", name)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func ExecInteractive(ctx context.Context, name string, command ...string) error {
	if len(command) == 0 {
		command = []string{"sh"}
	}
	args := append([]string{"exec", "-it", name}, command...)
	cmd := exec.CommandContext(ctx, "docker", args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
