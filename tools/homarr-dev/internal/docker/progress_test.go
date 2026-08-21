package docker

import (
	"testing"
)

func TestLayerFraction(t *testing.T) {
	cases := []struct {
		status  string
		current int64
		total   int64
		want    float64
	}{
		{"pull complete", 0, 0, 1.0},
		{"already exists", 0, 0, 1.0},
		{"download complete", 100, 100, 0.5},
		{"verifying checksum", 100, 100, 0.5},
		{"downloading", 50, 100, 0.25},
		{"extracting", 50, 100, 0.75},
		{"waiting", 0, 100, 0.0},
	}

	for _, c := range cases {
		layer := Layer{Status: c.status, Current: c.current, Total: c.total}
		if got := layer.Fraction(); got != c.want {
			t.Errorf("Layer{%q, %d, %d}.Fraction() = %v, want %v", c.status, c.current, c.total, got, c.want)
		}
	}
}

func TestParseSizeAndFormatSize(t *testing.T) {
	if got := ParseSize("12.3MB"); got != 12300000 {
		t.Errorf("ParseSize(12.3MB) = %d, want 12300000", got)
	}
	if got := ParseSize("10MiB"); got != 10*1024*1024 {
		t.Errorf("ParseSize(10MiB) = %d, want %d", got, 10*1024*1024)
	}
	if got := ParseSize("500B"); got != 500 {
		t.Errorf("ParseSize(500B) = %d, want 500", got)
	}
	if got := ParseSize("invalid"); got != 0 {
		t.Errorf("ParseSize(invalid) = %d, want 0", got)
	}

	if got := FormatSize(500); got != "500B" {
		t.Errorf("FormatSize(500) = %q, want 500B", got)
	}
	if got := FormatSize(1500000); got != "1.5MB" {
		t.Errorf("FormatSize(1500000) = %q, want 1.5MB", got)
	}
	if got := FormatSize(2500000000); got != "2.5GB" {
		t.Errorf("FormatSize(2500000000) = %q, want 2.5GB", got)
	}
}

func TestPullTrackerApplyAndProgress(t *testing.T) {
	tracker := NewPullTracker()
	tracker.Apply(PullMessage{
		ID:     "layer1",
		Status: "Downloading",
		Detail: struct {
			Current int64 `json:"current"`
			Total   int64 `json:"total"`
		}{Current: 50, Total: 100},
	})
	tracker.Apply(PullMessage{
		ID:     "layer2",
		Status: "Extracting",
		Detail: struct {
			Current int64 `json:"current"`
			Total   int64 `json:"total"`
		}{Current: 50, Total: 100},
	})

	layers := tracker.Layers()
	if len(layers) != 2 {
		t.Fatalf("expected 2 layers, got %d", len(layers))
	}
	if layers[0].ID != "layer1" || layers[1].ID != "layer2" {
		t.Errorf("unexpected layers order: %v, %v", layers[0].ID, layers[1].ID)
	}

	currentBytes, totalBytes := tracker.Bytes()
	if currentBytes != 100 || totalBytes != 200 {
		t.Errorf("Bytes() = %d, %d; want 100, 200", currentBytes, totalBytes)
	}

	complete, total := tracker.Complete()
	if complete != 0 || total != 2 {
		t.Errorf("Complete() = %d, %d; want 0, 2", complete, total)
	}

	if percent := tracker.Percent(); percent != 0.5 {
		t.Errorf("Percent() = %v, want 0.5", percent)
	}

	tracker.ApplyLine("c0ffee123456: Pull complete")
	if len(tracker.Layers()) != 3 {
		t.Fatalf("expected 3 layers after ApplyLine, got %d", len(tracker.Layers()))
	}
	complete, total = tracker.Complete()
	if complete != 1 || total != 3 {
		t.Errorf("Complete() = %d, %d; want 1, 3", complete, total)
	}
}

func TestBuildTrackerStepsAndProgress(t *testing.T) {
	tracker := NewBuildTracker()

	tracker.ApplyLine("#0 building with \"default\" instance using docker driver")
	if len(tracker.Steps()) != 0 {
		t.Fatalf("expected step #0 to be skipped, got %d steps", len(tracker.Steps()))
	}

	tracker.ApplyLine("#1 [internal] load build definition from Dockerfile")
	tracker.ApplyLine("#1 transferring dockerfile: 3.42kB done")
	tracker.ApplyLine("#1 DONE 0.0s")

	tracker.ApplyLine("#2 [1/3] FROM docker.io/library/alpine:3.20")
	tracker.ApplyLine("#2 CACHED")

	tracker.ApplyLine("#3 [2/3] RUN echo step2")
	tracker.ApplyLine("#3 0.123 hello from build")

	steps := tracker.Steps()
	if len(steps) != 3 {
		t.Fatalf("expected 3 steps, got %d", len(steps))
	}

	if !steps[0].Done {
		t.Errorf("step #1 should be marked Done")
	}
	if !steps[1].Cached || !steps[1].Done {
		t.Errorf("step #2 should be marked Cached and Done")
	}
	if steps[2].Done {
		t.Errorf("step #3 should not be Done yet")
	}

	active, running := tracker.Active()
	if !running || active.ID != "3" {
		t.Errorf("Active() = %+v, %v; want ID 3, true", active, running)
	}

	complete, total := tracker.Complete()
	if complete != 2 || total < 3 {
		t.Errorf("Complete() = %d, %d; want 2, >=3", complete, total)
	}

	if last := tracker.LastMessage(); last != "hello from build" {
		t.Errorf("LastMessage() = %q, want 'hello from build'", last)
	}

	tracker.ApplyLine("#3 CANCELED")
	steps = tracker.Steps()
	if !steps[2].Canceled {
		t.Errorf("step #3 should be marked Canceled")
	}
	complete, _ = tracker.Complete()
	if complete != 2 {
		t.Errorf("Complete() after cancel = %d, want 2", complete)
	}
}
