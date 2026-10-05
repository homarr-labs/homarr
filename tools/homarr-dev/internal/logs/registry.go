// Package logs keeps live `docker logs --follow` streams for running
// containers so the sidebar can show output as it happens instead of polling.
package logs

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

// retainedLines bounds memory per container. Homarr is chatty at boot, so the
// buffer has to be deep enough to still contain the startup banner once the
// app settles.
const retainedLines = 2000

// maxStreams bounds how many containers are followed at once. Each stream is a
// `docker logs --follow` process plus a buffer, which is cheap for the handful
// of instances a developer normally runs but not for thirty. The least recently
// viewed stream is dropped when the cap is reached; re-attaching replays the
// tail, so nothing is lost beyond the scrollback.
const maxStreams = 6

// State describes what a stream is currently doing.
type State int

const (
	StateStarting State = iota
	StateStreaming
	StateStopped
	StateFailed
)

// Stream is the retained output of one container.
type Stream struct {
	mu     sync.Mutex
	name   string
	lines  []string
	state  State
	err    error
	cancel context.CancelFunc
	since  time.Time
	used   time.Time
}

// Registry owns every active log stream and notifies a single listener when new
// output arrives.
type Registry struct {
	mu      sync.Mutex
	streams map[string]*Stream
	notify  chan struct{}
}

func NewRegistry() *Registry {
	return &Registry{streams: make(map[string]*Stream), notify: make(chan struct{}, 1)}
}

// Changed is a coalescing wake-up channel, mirroring task.Manager. A container
// logging a thousand lines a second still costs one redraw per frame.
func (r *Registry) Changed() <-chan struct{} { return r.notify }

func (r *Registry) touch() {
	select {
	case r.notify <- struct{}{}:
	default:
	}
}

// Attach starts following a container's logs if it is not already being
// followed. It returns immediately; output arrives on the Changed channel.
func (r *Registry) Attach(name string) {
	if name == "" {
		return
	}
	r.mu.Lock()
	if _, exists := r.streams[name]; exists {
		r.mu.Unlock()
		return
	}
	now := time.Now()
	ctx, cancel := context.WithCancel(context.Background())
	stream := &Stream{name: name, state: StateStarting, cancel: cancel, since: now, used: now}
	r.streams[name] = stream
	evicted := r.evictLocked()
	r.mu.Unlock()

	for _, stale := range evicted {
		stale.cancel()
	}
	go r.follow(ctx, stream)
	r.touch()
}

// evictLocked drops the least recently viewed streams above the cap. The caller
// holds the lock and cancels the returned streams outside it.
func (r *Registry) evictLocked() []*Stream {
	evicted := make([]*Stream, 0)
	for len(r.streams) > maxStreams {
		var oldest *Stream
		for _, stream := range r.streams {
			if oldest == nil || stream.used.Before(oldest.used) {
				oldest = stream
			}
		}
		if oldest == nil {
			break
		}
		delete(r.streams, oldest.name)
		evicted = append(evicted, oldest)
	}
	return evicted
}

func (r *Registry) follow(ctx context.Context, stream *Stream) {
	lines, err := docker.StreamContainerLogs(ctx, stream.name, 400)
	if err != nil {
		stream.set(StateFailed, err)
		r.touch()
		return
	}
	stream.set(StateStreaming, nil)
	r.touch()
	for line := range lines {
		if line.Done {
			if ctx.Err() != nil {
				stream.set(StateStopped, nil)
			} else if line.Err != nil {
				stream.set(StateFailed, line.Err)
			} else {
				stream.set(StateStopped, nil)
			}
			r.touch()
			return
		}
		stream.append(line.Text)
		r.touch()
	}
}

func (s *Stream) append(line string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lines = append(s.lines, line)
	if len(s.lines) > retainedLines {
		s.lines = s.lines[len(s.lines)-retainedLines:]
	}
}

func (s *Stream) set(state State, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state, s.err = state, err
}

// Detach stops following a container and drops its buffer.
func (r *Registry) Detach(name string) {
	r.mu.Lock()
	stream, exists := r.streams[name]
	delete(r.streams, name)
	r.mu.Unlock()
	if exists && stream.cancel != nil {
		stream.cancel()
	}
	r.touch()
}

// Retain stops streams for containers that no longer exist, so a removed
// instance does not keep a dead `docker logs` process around.
func (r *Registry) Retain(names []string) {
	live := make(map[string]bool, len(names))
	for _, name := range names {
		live[name] = true
	}
	r.mu.Lock()
	stale := make([]*Stream, 0)
	for name, stream := range r.streams {
		if !live[name] {
			stale = append(stale, stream)
			delete(r.streams, name)
		}
	}
	r.mu.Unlock()
	for _, stream := range stale {
		if stream.cancel != nil {
			stream.cancel()
		}
	}
	if len(stale) > 0 {
		r.touch()
	}
}

// Close stops every stream.
func (r *Registry) Close() { r.Retain(nil) }

// Snapshot is an immutable view of one stream.
type Snapshot struct {
	Name  string
	Lines []string
	State State
	Err   error
}

// Text joins the retained lines for rendering into a viewport.
func (s Snapshot) Text() string { return strings.Join(s.Lines, "\n") }

// Snapshot returns the retained output for a container. The second result is
// false when the container is not being followed.
func (r *Registry) Snapshot(name string) (Snapshot, bool) {
	r.mu.Lock()
	stream, exists := r.streams[name]
	if exists {
		// Viewing a stream is what keeps it alive under the cap.
		stream.used = time.Now()
	}
	r.mu.Unlock()
	if !exists {
		return Snapshot{}, false
	}
	stream.mu.Lock()
	defer stream.mu.Unlock()
	return Snapshot{
		Name:  stream.name,
		Lines: append([]string(nil), stream.lines...),
		State: stream.state,
		Err:   stream.err,
	}, true
}

// Attached lists the containers currently being followed.
func (r *Registry) Attached() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	names := make([]string, 0, len(r.streams))
	for name := range r.streams {
		names = append(names, name)
	}
	return names
}
