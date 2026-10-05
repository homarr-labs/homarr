package logs

import (
	"fmt"
	"testing"
	"time"
)

func TestRegistryAttachAndSnapshot(t *testing.T) {
	reg := NewRegistry()
	defer reg.Close()

	snap, attached := reg.Snapshot("nonexistent")
	if attached {
		t.Fatalf("expected attached=false for unattached container")
	}

	reg.Attach("test-container")
	snap, attached = reg.Snapshot("test-container")
	if !attached {
		t.Fatalf("expected attached=true after Attach")
	}
	if snap.State != StateStarting && snap.State != StateStreaming {
		t.Fatalf("expected StateStarting or StateStreaming, got %v", snap.State)
	}

	reg.Detach("test-container")
	snap, attached = reg.Snapshot("test-container")
	if attached {
		t.Fatalf("expected attached=false after Detach")
	}
}

func TestRegistryChangedNotification(t *testing.T) {
	reg := NewRegistry()
	defer reg.Close()

	ch := reg.Changed()
	if ch == nil {
		t.Fatal("expected non-nil Changed channel")
	}

	reg.touch()
	select {
	case <-ch:
	case <-time.After(50 * time.Millisecond):
		t.Fatal("expected notification on Changed channel")
	}
}

func TestStreamLineBufferingAndBounds(t *testing.T) {
	s := &Stream{
		name:  "test",
		since: time.Now(),
		used:  time.Now(),
	}

	for i := 0; i < retainedLines+50; i++ {
		s.append(fmt.Sprintf("line %d", i))
	}

	s.mu.Lock()
	lines := make([]string, len(s.lines))
	copy(lines, s.lines)
	s.mu.Unlock()

	if len(lines) != retainedLines {
		t.Fatalf("expected %d retained lines, got %d", retainedLines, len(lines))
	}

	if lines[0] != "line 50" {
		t.Errorf("first retained line = %q, want 'line 50'", lines[0])
	}
}

func TestRegistryRetainAndEviction(t *testing.T) {
	reg := NewRegistry()
	defer reg.Close()

	reg.Attach("c1")
	reg.Attach("c2")
	reg.Attach("c3")

	// Retain only c1 and c3
	reg.Retain([]string{"c1", "c3"})

	if _, attached := reg.Snapshot("c2"); attached {
		t.Errorf("c2 should have been dropped by Retain")
	}
	if _, attached := reg.Snapshot("c1"); !attached {
		t.Errorf("c1 should still be attached")
	}
	if _, attached := reg.Snapshot("c3"); !attached {
		t.Errorf("c3 should still be attached")
	}
}
