// Package registry queries GHCR for the pull-request test images Homarr's CI
// publishes.
package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TestImageRepository is where CI pushes one image per open pull request.
const TestImageRepository = "homarr-labs/homarr-test"

// ImageReference returns the GHCR reference for a pull request's test image.
func ImageReference(pr int) string {
	return fmt.Sprintf("ghcr.io/%s:pr-%d", TestImageRepository, pr)
}

const (
	tagCacheTTL = 2 * time.Minute
	httpTimeout = 20 * time.Second
)

var tagCache struct {
	sync.Mutex
	tags      map[string]bool
	fetchedAt time.Time
}

var client = &http.Client{Timeout: httpTimeout}

// PublishedTags lists every tag in the test image repository in a single
// request. Checking availability one pull request at a time with `docker
// manifest inspect` costs one network round trip per row, which dominates
// startup on a busy repository; the registry's own tag listing answers the same
// question for every row at once.
func PublishedTags(ctx context.Context, refresh bool) (map[string]bool, error) {
	tagCache.Lock()
	cached, fetchedAt := tagCache.tags, tagCache.fetchedAt
	tagCache.Unlock()
	if !refresh && cached != nil && time.Since(fetchedAt) < tagCacheTTL {
		return cached, nil
	}

	token, err := anonymousToken(ctx)
	if err != nil {
		return nil, err
	}
	tags, err := listTags(ctx, token)
	if err != nil {
		if cached != nil {
			return cached, err
		}
		return nil, err
	}

	tagCache.Lock()
	tagCache.tags, tagCache.fetchedAt = tags, time.Now()
	tagCache.Unlock()
	return tags, nil
}

// HasPRImage reports whether CI has published an image for a pull request.
func HasPRImage(tags map[string]bool, pr int) bool {
	return tags["pr-"+strconv.Itoa(pr)]
}

func anonymousToken(ctx context.Context) (string, error) {
	url := fmt.Sprintf("https://ghcr.io/token?scope=repository:%s:pull&service=ghcr.io", TestImageRepository)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	response, err := client.Do(request)
	if err != nil {
		return "", fmt.Errorf("request GHCR token: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("request GHCR token: %s", response.Status)
	}
	var payload struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("decode GHCR token: %w", err)
	}
	return payload.Token, nil
}

func listTags(ctx context.Context, token string) (map[string]bool, error) {
	tags := make(map[string]bool)
	next := fmt.Sprintf("https://ghcr.io/v2/%s/tags/list?n=1000", TestImageRepository)
	for page := 0; next != "" && page < 20; page++ {
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, next, nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("Authorization", "Bearer "+token)
		response, err := client.Do(request)
		if err != nil {
			return nil, fmt.Errorf("list GHCR tags: %w", err)
		}
		if response.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(io.LimitReader(response.Body, 2048))
			_ = response.Body.Close()
			return nil, fmt.Errorf("list GHCR tags: %s: %s", response.Status, strings.TrimSpace(string(body)))
		}
		var payload struct {
			Tags []string `json:"tags"`
		}
		err = json.NewDecoder(response.Body).Decode(&payload)
		linkHeader := response.Header.Get("Link")
		_ = response.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("decode GHCR tags: %w", err)
		}
		for _, tag := range payload.Tags {
			tags[tag] = true
		}
		next = nextPageURL(linkHeader)
	}
	return tags, nil
}

// nextPageURL follows the RFC 5988 Link header the registry uses for paging.
func nextPageURL(link string) string {
	for _, part := range strings.Split(link, ",") {
		if !strings.Contains(part, `rel="next"`) {
			continue
		}
		start := strings.Index(part, "<")
		end := strings.Index(part, ">")
		if start < 0 || end <= start {
			continue
		}
		target := part[start+1 : end]
		if strings.HasPrefix(target, "/") {
			return "https://ghcr.io" + target
		}
		return target
	}
	return ""
}

// ManifestExists falls back to the Docker CLI for a single reference, which
// also works for private repositories where the anonymous listing is refused.
func ManifestExists(ctx context.Context, reference string) (bool, error) {
	out, err := exec.CommandContext(ctx, "docker", "manifest", "inspect", reference).CombinedOutput()
	if err == nil {
		return true, nil
	}
	message := strings.ToLower(string(out))
	if strings.Contains(message, "manifest unknown") || strings.Contains(message, "no such manifest") {
		return false, nil
	}
	return false, fmt.Errorf("check %s: %w: %s", reference, err, strings.TrimSpace(string(out)))
}
