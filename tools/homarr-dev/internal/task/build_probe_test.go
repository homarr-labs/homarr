package task

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

// Exercises the real BuildKit streaming and parsing path against a small
// Dockerfile, so the step tracker is validated on genuine output.
func TestBuildImageStreamsRealSteps(t *testing.T) {
	if testing.Short() || os.Getenv("HOMARR_INTEGRATION_TEST") != "1" {
		t.Skip("skipping docker build probe test; set HOMARR_INTEGRATION_TEST=1 to run")
	}
	dir := t.TempDir()
	dockerfile := `FROM alpine:3.20 AS base
RUN echo "hello from step two" && sleep 1
FROM base AS final
RUN echo "third step" > /out.txt
RUN cat /out.txt
`
	if err := os.WriteFile(filepath.Join(dir, "Dockerfile"), []byte(dockerfile), 0o644); err != nil {
		t.Fatal(err)
	}

	manager := NewManager()
	task := manager.Build("build homarr:cli-probe", "homarr:cli-probe", docker.BuildOptions{
		Context: dir, Tag: "cli-probe", Source: dir, Revision: "probe",
	})
	t.Cleanup(func() { _ = docker.RemoveImage(context.Background(), "homarr:cli-probe") })

	for range 600 {
		<-manager.Changed()
		if snapshot, _ := manager.Snapshot(task.ID()); snapshot.State.Done() {
			t.Logf("state=%s percent=%.2f detail=%q err=%v", snapshot.State, snapshot.Percent, snapshot.Detail, snapshot.Err)
			for _, step := range snapshot.Steps {
				t.Logf("  #%-3s done=%-5v %-46s %s", step.ID, step.Done, truncate(step.Label, 46), step.Note)
			}
			if snapshot.State != StateSucceeded {
				t.Fatalf("build did not succeed: %v", snapshot.Err)
			}
			if len(snapshot.Steps) < 4 {
				t.Fatalf("expected several build steps, got %d", len(snapshot.Steps))
			}
			return
		}
	}
	t.Fatal("build did not finish")
}

func truncate(value string, width int) string {
	if len(value) <= width {
		return value
	}
	return value[:width]
}
