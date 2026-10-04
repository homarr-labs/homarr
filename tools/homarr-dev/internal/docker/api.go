package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// engineAPIVersion is the oldest Engine API version that supports every
// endpoint this CLI relies on. The daemon negotiates downwards on its own.
const engineAPIVersion = "v1.41"

// PullMessage is one record of the JSON progress stream returned by the Docker
// Engine when an image is pulled. Unlike the plain-text output of `docker
// pull`, this stream carries per-layer byte counters even when stdout is not a
// terminal, which is what makes a real progress animation possible.
type PullMessage struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Detail struct {
		Current int64 `json:"current"`
		Total   int64 `json:"total"`
	} `json:"progressDetail"`
	Error string `json:"error"`
}

type engineEndpoint struct {
	client *http.Client
	base   string
	err    error
}

var engineOnce struct {
	sync.Once
	endpoint engineEndpoint
}

// EngineHost reports the Docker endpoint this machine talks to, honouring
// DOCKER_HOST and the active `docker context` (OrbStack, Colima, and Docker
// Desktop all install their own socket).
func EngineHost() string {
	if host := strings.TrimSpace(os.Getenv("DOCKER_HOST")); host != "" {
		return host
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, "docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}").Output()
	if err == nil {
		if host := strings.TrimSpace(string(out)); host != "" {
			return host
		}
	}
	return "unix:///var/run/docker.sock"
}

func engine() (*http.Client, string, error) {
	engineOnce.Do(func() { engineOnce.endpoint = dialEngine(EngineHost()) })
	e := engineOnce.endpoint
	return e.client, e.base, e.err
}

func dialEngine(host string) engineEndpoint {
	switch {
	case strings.HasPrefix(host, "unix://"):
		path := strings.TrimPrefix(host, "unix://")
		transport := &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", path)
			},
		}
		return engineEndpoint{client: &http.Client{Transport: transport}, base: "http://docker/" + engineAPIVersion}
	case strings.HasPrefix(host, "tcp://"), strings.HasPrefix(host, "http://"):
		authority := host
		for _, scheme := range []string{"tcp://", "http://"} {
			authority = strings.TrimPrefix(authority, scheme)
		}
		return engineEndpoint{client: &http.Client{}, base: "http://" + authority + "/" + engineAPIVersion}
	default:
		return engineEndpoint{err: fmt.Errorf("unsupported Docker endpoint %q", host)}
	}
}

// SplitImageReference separates a reference into its repository and tag,
// tolerating registries that carry an explicit port.
func SplitImageReference(reference string) (repository, tag string) {
	slash := strings.LastIndex(reference, "/")
	colon := strings.LastIndex(reference, ":")
	if colon > slash {
		return reference[:colon], reference[colon+1:]
	}
	return reference, "latest"
}

// PullStream starts an image pull against the Engine API and returns its
// progress records. The channel closes when the pull finishes; a message
// carrying Error describes a failure. Cancelling ctx aborts the pull.
func PullStream(ctx context.Context, image, platform string) (<-chan PullMessage, error) {
	client, base, err := engine()
	if err != nil {
		return nil, err
	}
	repository, tag := SplitImageReference(image)
	query := url.Values{"fromImage": {repository}, "tag": {tag}}
	if platform != "" {
		query.Set("platform", platform)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/images/create?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("contact Docker engine: %w", err)
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		_ = response.Body.Close()
		return nil, fmt.Errorf("pull %s: %s", image, engineErrorMessage(response.Status, body))
	}

	messages := make(chan PullMessage, 64)
	go func() {
		defer close(messages)
		defer response.Body.Close()
		decoder := json.NewDecoder(response.Body)
		for {
			var message PullMessage
			if err := decoder.Decode(&message); err != nil {
				if err != io.EOF && ctx.Err() == nil {
					select {
					case messages <- PullMessage{Error: err.Error()}:
					case <-ctx.Done():
					}
				}
				return
			}
			select {
			case messages <- message:
			case <-ctx.Done():
				return
			}
		}
	}()
	return messages, nil
}

func engineErrorMessage(status string, body []byte) string {
	var payload struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &payload); err == nil && payload.Message != "" {
		return payload.Message
	}
	if trimmed := strings.TrimSpace(string(body)); trimmed != "" {
		return trimmed
	}
	return status
}

// EngineAvailable reports whether the Engine API answers, so callers can fall
// back to the `docker` binary instead of failing outright.
func EngineAvailable(ctx context.Context) bool {
	client, base, err := engine()
	if err != nil {
		return false
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/_ping", nil)
	if err != nil {
		return false
	}
	response, err := client.Do(request)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)
	return response.StatusCode >= 200 && response.StatusCode < 300
}
