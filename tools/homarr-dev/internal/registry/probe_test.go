package registry

import (
	"context"
	"testing"
	"time"
)

func TestPublishedTagsIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("network test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	start := time.Now()
	tags, err := PublishedTags(ctx, true)
	if err != nil {
		t.Skipf("GHCR unreachable: %v", err)
	}
	t.Logf("fetched %d tags in %s", len(tags), time.Since(start))
	if len(tags) == 0 {
		t.Fatal("expected at least one published tag")
	}
	found := 0
	for tag := range tags {
		if found < 5 {
			t.Log(" ", tag)
			found++
		}
	}
}
