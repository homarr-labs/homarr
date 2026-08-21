package task

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

// Pull downloads an image, preferring the Docker Engine API because it reports
// per-layer byte progress even when the CLI would not. If the socket is
// unreachable the plain `docker pull` output is parsed instead, which still
// yields per-layer state, just without byte counters.
func (m *Manager) Pull(title, target, image, platform string) *Task {
	return m.Start(KindPull, title, target, func(ctx context.Context, report *Reporter) error {
		return PullImage(ctx, report, image, platform)
	})
}

// PullImage is the body of a pull, exported so callers can compose it with
// follow-up work — pulling and then starting a container reads better as one
// job than as two.
func PullImage(ctx context.Context, report *Reporter, image, platform string) error {
	tracker := docker.NewPullTracker()
	publish := throttled(report, func() {
		report.SetSteps(pullSteps(tracker))
		report.SetPercent(tracker.Percent())
		report.SetDetail(pullDetail(tracker))
	})

	messages, err := docker.PullStream(ctx, image, platform)
	if err != nil {
		report.Log("engine API unavailable (" + err.Error() + "), falling back to docker pull")
		return pullWithCLI(ctx, report, tracker, publish, image, platform)
	}
	for message := range messages {
		if message.Error != "" {
			return fmt.Errorf("pull %s: %s", image, message.Error)
		}
		tracker.Apply(message)
		if message.ID == "" && message.Status != "" {
			report.Log(message.Status)
		}
		publish(false)
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	publish(true)
	return nil
}

func pullWithCLI(ctx context.Context, report *Reporter, tracker *docker.PullTracker, publish func(bool), image, platform string) error {
	command := docker.PullCommandContext(ctx, image, platform)
	command.Cancel = func() error { return command.Process.Kill() }
	lines, err := docker.StreamCommand(command)
	if err != nil {
		return err
	}
	for line := range lines {
		if line.Done {
			if line.Err != nil {
				return line.Err
			}
			break
		}
		tracker.ApplyLine(line.Text)
		publish(false)
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	publish(true)
	return nil
}

func pullSteps(tracker *docker.PullTracker) []Step {
	layers := tracker.Layers()
	steps := make([]Step, 0, len(layers))
	for _, layer := range layers {
		note := ""
		if layer.Total > 0 && !layer.Done() {
			note = docker.FormatSize(layer.Current) + "/" + docker.FormatSize(layer.Total)
		} else if layer.Total > 0 {
			note = docker.FormatSize(layer.Total)
		}
		steps = append(steps, Step{
			ID:      layer.ID,
			Label:   layer.ID,
			Status:  layer.Status,
			Current: layer.Current,
			Total:   layer.Total,
			Percent: layer.Fraction(),
			Done:    layer.Done(),
			Note:    note,
		})
	}
	return steps
}

func pullDetail(tracker *docker.PullTracker) string {
	complete, total := tracker.Complete()
	parts := []string{fmt.Sprintf("%d/%d layers", complete, total)}
	if current, size := tracker.Bytes(); size > 0 {
		parts = append(parts, docker.FormatSize(current)+"/"+docker.FormatSize(size))
	}
	if rate := tracker.Rate(); rate > 0 {
		parts = append(parts, docker.FormatSize(int64(rate))+"/s")
	}
	return strings.Join(parts, " · ")
}

// Build compiles an image, streaming BuildKit's plain progress so the UI can
// show which Dockerfile step is running and what it is printing.
func (m *Manager) Build(title, target string, options docker.BuildOptions) *Task {
	return m.Start(KindBuild, title, target, func(ctx context.Context, report *Reporter) error {
		return BuildImage(ctx, report, options)
	})
}

// BuildFrom runs a caller-supplied preparation step (cloning a pull request,
// for example) before building. Preparation output is reported the same way as
// build output so the job reads as one continuous stream.
func (m *Manager) BuildFrom(title, target string, prepare func(ctx context.Context, report *Reporter) (docker.BuildOptions, error)) *Task {
	return m.Start(KindBuild, title, target, func(ctx context.Context, report *Reporter) error {
		options, err := prepare(ctx, report)
		if err != nil {
			return err
		}
		return BuildImage(ctx, report, options)
	})
}

// BuildImage is the body of a build, exported for the same reason as PullImage.
func BuildImage(ctx context.Context, report *Reporter, options docker.BuildOptions) error {
	command, err := docker.BuildCommandStreaming(ctx, options)
	if err != nil {
		return err
	}
	command.Cancel = func() error { return command.Process.Kill() }
	lines, err := docker.StreamCommand(command)
	if err != nil {
		return err
	}

	tracker := docker.NewBuildTracker()
	publish := throttled(report, func() {
		report.SetSteps(buildSteps(tracker))
		report.SetPercent(tracker.Percent())
		report.SetDetail(buildDetail(tracker))
	})
	for line := range lines {
		if line.Done {
			if line.Err != nil {
				if detail := tracker.LastMessage(); detail != "" && !strings.Contains(line.Err.Error(), detail) {
					return fmt.Errorf("%w: %s", line.Err, detail)
				}
				return line.Err
			}
			break
		}
		tracker.ApplyLine(line.Text)
		report.Log(line.Text)
		publish(false)
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	publish(true)
	return nil
}

func buildSteps(tracker *docker.BuildTracker) []Step {
	steps := tracker.Steps()
	converted := make([]Step, 0, len(steps))
	for _, step := range steps {
		label := step.Label
		if label == "" {
			label = "#" + step.ID
		}
		percent := 0.0
		if step.Done && !step.Canceled && !step.Failed {
			percent = 1
		}
		note := step.Elapsed
		if step.Cached {
			note = "cached"
		}
		converted = append(converted, Step{
			ID:      step.ID,
			Label:   label,
			Status:  step.Status,
			Percent: percent,
			Done:    step.Done && !step.Canceled,
			Failed:  step.Failed,
			Note:    note,
		})
	}
	return converted
}

func buildDetail(tracker *docker.BuildTracker) string {
	complete, total := tracker.Complete()
	detail := fmt.Sprintf("%d/%d steps", complete, total)
	if active, running := tracker.Active(); running {
		detail += " · " + active.Label
	}
	return detail
}

// Action runs a short operation such as stopping a container. It still goes
// through the manager so a slow daemon can never freeze the interface.
func (m *Manager) Action(title, target string, body func(ctx context.Context) error) *Task {
	return m.Start(KindAction, title, target, func(ctx context.Context, report *Reporter) error {
		return body(ctx)
	})
}

// throttled limits how often a progress publisher runs. Docker emits progress
// far faster than a terminal can redraw, and every publish copies slices, so
// coalescing here keeps the cost proportional to the frame rate instead of to
// the daemon's chattiness. Passing force publishes regardless, which the caller
// does once at the end so the final state is never dropped.
func throttled(report *Reporter, publish func()) func(force bool) {
	const interval = 80 * time.Millisecond
	last := time.Time{}
	return func(force bool) {
		now := time.Now()
		if !force && now.Sub(last) < interval {
			return
		}
		last = now
		publish()
	}
}
