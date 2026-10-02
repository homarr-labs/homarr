package docker

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/x/ansi"
)

// Layer is the download and extraction state of a single image layer.
type Layer struct {
	ID      string
	Status  string
	Current int64
	Total   int64
}

// Fraction reports how far this layer is towards being usable, treating
// download and extraction as two halves of the work. Docker restarts the byte
// counters between the two phases, so they are weighted rather than summed.
func (l Layer) Fraction() float64 {
	switch normalizeLayerStatus(l.Status) {
	case "already exists", "pull complete":
		return 1
	case "downloading":
		return 0.5 * ratio(l.Current, l.Total)
	case "verifying checksum", "download complete":
		return 0.5
	case "extracting":
		return 0.5 + 0.5*ratio(l.Current, l.Total)
	default:
		return 0
	}
}

func (l Layer) Done() bool {
	status := normalizeLayerStatus(l.Status)
	return status == "pull complete" || status == "already exists"
}

func ratio(current, total int64) float64 {
	if total <= 0 {
		return 0
	}
	if current >= total {
		return 1
	}
	return float64(current) / float64(total)
}

func normalizeLayerStatus(status string) string {
	return strings.ToLower(strings.TrimSpace(status))
}

// PullTracker folds a pull progress stream into stable, ordered per-layer
// state so the UI can redraw it every frame without flicker.
type PullTracker struct {
	order    []string
	layers   map[string]*Layer
	status   string
	started  time.Time
	sampleAt time.Time
	sampled  int64
	rate     float64
}

func NewPullTracker() *PullTracker {
	now := time.Now()
	return &PullTracker{layers: make(map[string]*Layer), started: now, sampleAt: now}
}

// Apply folds one Engine API record into the tracker.
func (t *PullTracker) Apply(message PullMessage) {
	if message.ID == "" {
		if message.Status != "" {
			t.status = message.Status
		}
		return
	}
	// Digest and manifest records reuse the ID field but are not layers.
	if strings.HasPrefix(message.ID, "sha256:") || len(message.ID) > 24 {
		t.status = message.Status
		return
	}
	layer, exists := t.layers[message.ID]
	if !exists {
		layer = &Layer{ID: message.ID}
		t.layers[message.ID] = layer
		t.order = append(t.order, message.ID)
	}
	if message.Status != "" {
		layer.Status = message.Status
	}
	if message.Detail.Total > 0 {
		layer.Total = message.Detail.Total
	}
	if message.Detail.Current > 0 || message.Detail.Total > 0 {
		layer.Current = message.Detail.Current
	}
	if layer.Done() {
		layer.Current = layer.Total
	}
	t.sample()
}

var plainPullPattern = regexp.MustCompile(`^([0-9a-zA-Z_-]{4,64}):\s+(.+)$`)

// ApplyLine folds a line of plain `docker pull` output into the tracker. It is
// the fallback used when the Engine API is unreachable; the resulting progress
// is coarser because the CLI omits byte counters when stdout is not a TTY.
func (t *PullTracker) ApplyLine(line string) {
	line = strings.TrimSpace(ansi.Strip(line))
	if line == "" {
		return
	}
	match := plainPullPattern.FindStringSubmatch(line)
	if match == nil {
		t.status = line
		return
	}
	status, current, total := parsePlainProgress(match[2])
	t.Apply(PullMessage{
		ID:     match[1],
		Status: status,
		Detail: struct {
			Current int64 `json:"current"`
			Total   int64 `json:"total"`
		}{Current: current, Total: total},
	})
}

var plainSizePattern = regexp.MustCompile(`([0-9.]+\s*[A-Za-z]*B)\s*/\s*([0-9.]+\s*[A-Za-z]*B)`)

func parsePlainProgress(rest string) (status string, current, total int64) {
	status = rest
	if bracket := strings.Index(rest, "["); bracket >= 0 {
		status = strings.TrimSpace(rest[:bracket])
	}
	if match := plainSizePattern.FindStringSubmatch(rest); match != nil {
		current = ParseSize(match[1])
		total = ParseSize(match[2])
	}
	return status, current, total
}

var sizeUnits = map[string]int64{
	"b":  1,
	"kb": 1000, "mb": 1000 * 1000, "gb": 1000 * 1000 * 1000, "tb": 1000 * 1000 * 1000 * 1000,
	"kib": 1024, "mib": 1024 * 1024, "gib": 1024 * 1024 * 1024, "tib": 1024 * 1024 * 1024 * 1024,
}

// ParseSize converts a human readable Docker size such as "12.3MB" into bytes.
func ParseSize(value string) int64 {
	value = strings.ToLower(strings.TrimSpace(value))
	index := 0
	for index < len(value) && (value[index] >= '0' && value[index] <= '9' || value[index] == '.') {
		index++
	}
	number, err := strconv.ParseFloat(strings.TrimSpace(value[:index]), 64)
	if err != nil {
		return 0
	}
	unit := strings.TrimSpace(value[index:])
	if unit == "" {
		return int64(number)
	}
	multiplier, known := sizeUnits[unit]
	if !known {
		return int64(number)
	}
	return int64(number * float64(multiplier))
}

// FormatSize renders a byte count the way the Docker CLI does.
func FormatSize(bytes int64) string {
	const unit = 1000
	if bytes < unit {
		return fmt.Sprintf("%dB", bytes)
	}
	value := float64(bytes)
	for _, suffix := range []string{"kB", "MB", "GB", "TB"} {
		value /= unit
		if value < unit {
			return fmt.Sprintf("%.1f%s", value, suffix)
		}
	}
	return fmt.Sprintf("%.1fPB", value/unit)
}

func (t *PullTracker) sample() {
	now := time.Now()
	elapsed := now.Sub(t.sampleAt)
	if elapsed < 500*time.Millisecond {
		return
	}
	current, _ := t.Bytes()
	if delta := current - t.sampled; delta > 0 {
		t.rate = float64(delta) / elapsed.Seconds()
	}
	t.sampled = current
	t.sampleAt = now
}

// Layers returns the layers in the order Docker announced them.
func (t *PullTracker) Layers() []Layer {
	layers := make([]Layer, 0, len(t.order))
	for _, id := range t.order {
		layers = append(layers, *t.layers[id])
	}
	return layers
}

// Bytes reports downloaded and total bytes across every layer that announced a
// size.
func (t *PullTracker) Bytes() (current, total int64) {
	for _, layer := range t.layers {
		if layer.Total <= 0 {
			continue
		}
		total += layer.Total
		if layer.Done() {
			current += layer.Total
			continue
		}
		current += min(layer.Current, layer.Total)
	}
	return current, total
}

// Complete reports how many layers are fully pulled out of how many are known.
func (t *PullTracker) Complete() (complete, total int) {
	for _, layer := range t.layers {
		total++
		if layer.Done() {
			complete++
		}
	}
	return complete, total
}

// Percent is the overall progress of the pull in the range [0,1].
func (t *PullTracker) Percent() float64 {
	if len(t.order) == 0 {
		return 0
	}
	sum := 0.0
	for _, id := range t.order {
		sum += t.layers[id].Fraction()
	}
	return sum / float64(len(t.order))
}

// Rate is the recent download throughput in bytes per second.
func (t *PullTracker) Rate() float64 { return t.rate }

// Status is the most recent message that was not tied to a single layer.
func (t *PullTracker) Status() string { return t.status }

// Elapsed reports how long the pull has been running.
func (t *PullTracker) Elapsed() time.Duration { return time.Since(t.started) }

// BuildStep is one BuildKit vertex, such as a Dockerfile instruction.
type BuildStep struct {
	ID       string
	Label    string
	Status   string
	Output   []string
	Done     bool
	Cached   bool
	Failed   bool
	Canceled bool
	Elapsed  string
}

// BuildTracker folds `docker build --progress=plain` output into ordered steps.
type BuildTracker struct {
	order   []string
	steps   map[string]*BuildStep
	total   int
	started time.Time
	last    string
}

func NewBuildTracker() *BuildTracker {
	return &BuildTracker{steps: make(map[string]*BuildStep), started: time.Now()}
}

var (
	buildLinePattern  = regexp.MustCompile(`^#(\d+)\s*(.*)$`)
	buildStagePattern = regexp.MustCompile(`^\[[^\]]*?(\d+)/(\d+)\]`)
	buildTimePattern  = regexp.MustCompile(`^\d+\.\d+\s`)
)

// ApplyLine folds one line of BuildKit plain output into the tracker.
func (t *BuildTracker) ApplyLine(line string) {
	line = strings.TrimRight(line, "\r\n")
	trimmed := strings.TrimSpace(ansi.Strip(line))
	if trimmed == "" {
		return
	}
	match := buildLinePattern.FindStringSubmatch(trimmed)
	if match == nil {
		t.last = trimmed
		return
	}
	id, rest := match[1], strings.TrimSpace(match[2])
	// BuildKit reserves #0 for its own preamble ("building with ... driver").
	// It never completes, so counting it would leave every finished build one
	// step short of done.
	if id == "0" {
		t.last = rest
		return
	}
	step, exists := t.steps[id]
	if !exists {
		step = &BuildStep{ID: id}
		t.steps[id] = step
		t.order = append(t.order, id)
	}

	switch {
	case strings.HasPrefix(rest, "DONE"):
		step.Done = true
		step.Status = "done"
		step.Elapsed = strings.TrimSpace(strings.TrimPrefix(rest, "DONE"))
	case rest == "CACHED":
		step.Done, step.Cached, step.Status = true, true, "cached"
	case strings.HasPrefix(rest, "ERROR"):
		step.Failed, step.Done, step.Status = true, true, "failed"
		step.Output = appendStepOutput(step.Output, rest)
		t.last = rest
	case strings.HasPrefix(rest, "CANCELED"):
		step.Done, step.Status, step.Canceled = true, "canceled", true
	case buildTimePattern.MatchString(rest):
		// `#12 1.234 <output>` — timestamped output from inside the step.
		_, output, _ := strings.Cut(rest, " ")
		if output = strings.TrimSpace(output); output != "" {
			step.Output = appendStepOutput(step.Output, output)
			t.last = output
		}
	case step.Label == "":
		step.Label = rest
		if stage := buildStagePattern.FindStringSubmatch(rest); stage != nil {
			if total, err := strconv.Atoi(stage[2]); err == nil && total > t.total {
				t.total = total
			}
		}
	default:
		step.Output = appendStepOutput(step.Output, rest)
	}
}

func appendStepOutput(output []string, line string) []string {
	const retained = 200
	output = append(output, line)
	if len(output) > retained {
		output = output[len(output)-retained:]
	}
	return output
}

// Steps returns every announced step in declaration order.
func (t *BuildTracker) Steps() []BuildStep {
	steps := make([]BuildStep, 0, len(t.order))
	for _, id := range t.order {
		steps = append(steps, *t.steps[id])
	}
	return steps
}

// Active returns the step BuildKit is currently working on, if any.
func (t *BuildTracker) Active() (BuildStep, bool) {
	for index := len(t.order) - 1; index >= 0; index-- {
		if step := t.steps[t.order[index]]; !step.Done && step.Label != "" {
			return *step, true
		}
	}
	return BuildStep{}, false
}

// Complete reports finished steps out of the best known total. The total grows
// as BuildKit announces stages, so it is never allowed to shrink below what has
// already been seen. A step BuildKit reported as canceled or failed is finished
// but not complete — counting it would report a killed build as fully built.
func (t *BuildTracker) Complete() (complete, total int) {
	for _, step := range t.steps {
		if step.Done && !step.Canceled && !step.Failed {
			complete++
		}
	}
	return complete, max(t.total, len(t.order))
}

// Percent is the overall build progress in the range [0,1].
func (t *BuildTracker) Percent() float64 {
	complete, total := t.Complete()
	if total == 0 {
		return 0
	}
	return ratio(int64(complete), int64(total))
}

// LastMessage is the most recent human readable line, used for error context.
func (t *BuildTracker) LastMessage() string { return t.last }

// Elapsed reports how long the build has been running.
func (t *BuildTracker) Elapsed() time.Duration { return time.Since(t.started) }
