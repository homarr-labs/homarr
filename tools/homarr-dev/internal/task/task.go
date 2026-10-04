// Package task runs the CLI's slow work — image pulls, local builds, container
// actions — on background goroutines and exposes it as immutable snapshots.
//
// Nothing in this package blocks the caller. A Manager owns every running job,
// coalesces their updates into a single wake-up channel, and hands the UI a
// consistent view whenever it asks for one. That separation is what keeps the
// terminal responsive while a fifteen minute Docker build streams output.
package task

import (
	"context"
	"sync"
	"time"
)

// Kind classifies a job so the UI can pick an icon and a detail renderer.
type Kind int

const (
	KindPull Kind = iota
	KindBuild
	KindAction
)

var kindNames = map[Kind]string{
	KindPull:   "pull",
	KindBuild:  "build",
	KindAction: "action",
}

func (k Kind) String() string {
	if name, found := kindNames[k]; found {
		return name
	}
	return "action"
}

// State is the lifecycle stage of a job.
type State int

const (
	StateRunning State = iota
	StateSucceeded
	StateFailed
	StateCanceled
)

func (s State) Done() bool { return s != StateRunning }

var stateNames = map[State]string{
	StateRunning:   "running",
	StateSucceeded: "succeeded",
	StateFailed:    "failed",
	StateCanceled:  "canceled",
}

func (s State) String() string {
	if name, found := stateNames[s]; found {
		return name
	}
	return "canceled"
}

// Step is one unit of progress inside a job: a Docker layer during a pull, or a
// BuildKit vertex during a build.
type Step struct {
	ID      string
	Label   string
	Status  string
	Current int64
	Total   int64
	Percent float64
	Done    bool
	Failed  bool
	Note    string
}

// Snapshot is an immutable view of a job. The UI only ever sees snapshots, so
// it can render without holding a lock or racing the worker goroutine.
type Snapshot struct {
	ID          int
	Kind        Kind
	Title       string
	Target      string
	Detail      string
	State       State
	Err         error
	Percent     float64
	Steps       []Step
	Lines       []string
	Started     time.Time
	Ended       time.Time
	Cancellable bool
}

// Elapsed reports how long the job ran, or has been running.
func (s Snapshot) Elapsed() time.Duration {
	if s.Ended.IsZero() {
		return time.Since(s.Started)
	}
	return s.Ended.Sub(s.Started)
}

// Reporter is the handle a job body uses to publish progress. Every method is
// safe to call from any goroutine and never blocks on the UI.
type Reporter struct {
	task *Task
}

// Log appends a line of output. Only the most recent lines are retained.
func (r *Reporter) Log(line string) {
	r.task.mutate(func(t *Task) { t.lines = appendLine(t.lines, line) })
}

// SetSteps replaces the job's progress breakdown.
func (r *Reporter) SetSteps(steps []Step) {
	r.task.mutate(func(t *Task) { t.steps = steps })
}

// SetPercent records overall progress in the range [0,1].
func (r *Reporter) SetPercent(percent float64) {
	r.task.mutate(func(t *Task) { t.percent = clamp(percent) })
}

// SetDetail replaces the single-line summary shown next to the job.
func (r *Reporter) SetDetail(detail string) {
	r.task.mutate(func(t *Task) { t.detail = detail })
}

// Lines returns the retained output, newest last.
func (r *Reporter) Lines() []string {
	r.task.mu.Lock()
	defer r.task.mu.Unlock()
	return append([]string(nil), r.task.lines...)
}

// Body is the work a job performs. Returning an error fails the job; returning
// ctx.Err() after cancellation marks it canceled instead.
type Body func(ctx context.Context, report *Reporter) error

// Task is a single background job.
type Task struct {
	mu      sync.Mutex
	manager *Manager

	id      int
	kind    Kind
	title   string
	target  string
	detail  string
	state   State
	err     error
	percent float64
	steps   []Step
	lines   []string
	started time.Time
	ended   time.Time
	cancel  context.CancelFunc
}

const retainedLines = 500

func appendLine(lines []string, line string) []string {
	lines = append(lines, line)
	if len(lines) > retainedLines {
		lines = lines[len(lines)-retainedLines:]
	}
	return lines
}

func clamp(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func (t *Task) mutate(apply func(*Task)) {
	t.mu.Lock()
	apply(t)
	t.mu.Unlock()
	t.manager.touch()
}

func (t *Task) snapshot() Snapshot {
	t.mu.Lock()
	defer t.mu.Unlock()
	return Snapshot{
		ID:          t.id,
		Kind:        t.kind,
		Title:       t.title,
		Target:      t.target,
		Detail:      t.detail,
		State:       t.state,
		Err:         t.err,
		Percent:     t.percent,
		Steps:       append([]Step(nil), t.steps...),
		Lines:       append([]string(nil), t.lines...),
		Started:     t.started,
		Ended:       t.ended,
		Cancellable: t.cancel != nil && t.state == StateRunning,
	}
}

// ID returns the job's identifier, stable for the lifetime of the process.
func (t *Task) ID() int { return t.id }

// Manager owns every background job and notifies a single listener when any of
// them changes.
type Manager struct {
	mu     sync.Mutex
	tasks  []*Task
	nextID int
	notify chan struct{}
}

func NewManager() *Manager {
	return &Manager{notify: make(chan struct{}, 1)}
}

// Changed is a coalescing wake-up channel. It receives at most one pending
// notification, so a job that emits thousands of progress updates per second
// still costs the UI a single redraw per frame.
func (m *Manager) Changed() <-chan struct{} { return m.notify }

func (m *Manager) touch() {
	select {
	case m.notify <- struct{}{}:
	default:
	}
}

// Start launches a job and returns immediately.
func (m *Manager) Start(kind Kind, title, target string, body Body) *Task {
	ctx, cancel := context.WithCancel(context.Background())
	m.mu.Lock()
	m.nextID++
	task := &Task{
		manager: m,
		id:      m.nextID,
		kind:    kind,
		title:   title,
		target:  target,
		state:   StateRunning,
		started: time.Now(),
		cancel:  cancel,
	}
	m.tasks = append(m.tasks, task)
	m.mu.Unlock()

	go func() {
		err := body(ctx, &Reporter{task: task})
		task.mu.Lock()
		task.ended = time.Now()
		task.cancel = nil
		switch {
		case ctx.Err() != nil:
			task.state = StateCanceled
		case err != nil:
			task.state, task.err = StateFailed, err
		default:
			task.state, task.percent = StateSucceeded, 1
		}
		task.mu.Unlock()
		cancel()
		m.touch()
	}()

	m.touch()
	return task
}

// Snapshots returns every job, oldest first.
func (m *Manager) Snapshots() []Snapshot {
	m.mu.Lock()
	tasks := append([]*Task(nil), m.tasks...)
	m.mu.Unlock()
	snapshots := make([]Snapshot, 0, len(tasks))
	for _, task := range tasks {
		snapshots = append(snapshots, task.snapshot())
	}
	return snapshots
}

// Snapshot returns a single job by identifier.
func (m *Manager) Snapshot(id int) (Snapshot, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, task := range m.tasks {
		if task.id == id {
			return task.snapshot(), true
		}
	}
	return Snapshot{}, false
}

// Cancel asks a running job to stop.
func (m *Manager) Cancel(id int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, task := range m.tasks {
		if task.id != id {
			continue
		}
		task.mu.Lock()
		cancel := task.cancel
		task.mu.Unlock()
		if cancel != nil {
			cancel()
		}
	}
}

// CancelAll stops every running job, used when the program exits.
func (m *Manager) CancelAll() {
	for _, snapshot := range m.Snapshots() {
		if snapshot.State == StateRunning {
			m.Cancel(snapshot.ID)
		}
	}
}

// Running counts jobs that have not finished.
func (m *Manager) Running() int {
	count := 0
	for _, snapshot := range m.Snapshots() {
		if snapshot.State == StateRunning {
			count++
		}
	}
	return count
}

// RunningFor reports whether a job is already working on the given target, so
// the UI can refuse to start a duplicate build or pull.
func (m *Manager) RunningFor(target string) (Snapshot, bool) {
	for _, snapshot := range m.Snapshots() {
		if snapshot.State == StateRunning && snapshot.Target == target {
			return snapshot, true
		}
	}
	return Snapshot{}, false
}

// Prune drops finished jobs, keeping the history short.
func (m *Manager) Prune() {
	m.mu.Lock()
	kept := m.tasks[:0]
	for _, task := range m.tasks {
		if task.snapshot().State == StateRunning {
			kept = append(kept, task)
		}
	}
	m.tasks = kept
	m.mu.Unlock()
	m.touch()
}
