package tui

import (
	"context"
	"sync"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/logs"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/registry"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
)

// loadedMsg carries a full refresh. Every source is fetched concurrently and
// each failure is reported separately, so a missing GitHub CLI degrades the
// pull-request list without hiding local images.
type loadedMsg struct {
	generation int
	prs        []gh.PR
	images     []docker.Image
	containers []docker.Container
	volumes    []docker.Volume
	tags       map[string]bool
	prErr      error
	imageErr   error
	tagErr     error
}

// containersMsg is the cheap periodic refresh; it skips GitHub and the registry.
type containersMsg struct {
	generation int
	containers []docker.Container
	volumes    []docker.Volume
}

type (
	tasksChangedMsg struct{}
	logsChangedMsg  struct{}
	ciChecksMsg     struct {
		pr     int
		checks []gh.Check
		err    error
	}
	pollCIChecksMsg struct {
		pr int
	}
	frameMsg   time.Time
	refreshMsg time.Time
	statusMsg  struct {
		text  string
		level statusLevel
	}
)

const (
	loadTimeout    = 45 * time.Second
	refreshEvery   = 3 * time.Second
	frameEvery     = 90 * time.Millisecond
	prListingLimit = 60
)

// loadAll fetches every data source in parallel and reports them as one
// message, so the table is only rebuilt once per refresh.
func loadAll(generation int, includeBots, refresh bool) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), loadTimeout)
		defer cancel()

		var (
			group   sync.WaitGroup
			message = loadedMsg{generation: generation}
		)
		group.Add(3)
		go func() {
			defer group.Done()
			if refresh {
				message.prs, message.prErr = gh.RefreshPRs(ctx, prListingLimit, includeBots)
				return
			}
			message.prs, message.prErr = gh.ListPRs(ctx, prListingLimit, includeBots)
		}()
		go func() {
			defer group.Done()
			message.images, message.imageErr = docker.ListLocalImages(ctx)
		}()
		go func() {
			defer group.Done()
			message.tags, message.tagErr = registry.PublishedTags(ctx, refresh)
		}()
		group.Wait()

		message.containers, _ = docker.List()
		message.volumes, _ = docker.ListVolumes(ctx, true)
		return message
	}
}

// loadContainers is the lightweight poll that keeps running state current
// without paying for GitHub, registry or disk-usage round trips.
func loadContainers(generation int) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		containers, _ := docker.List()
		volumes, _ := docker.ListVolumes(ctx, false)
		return containersMsg{generation: generation, containers: containers, volumes: volumes}
	}
}

// waitForTasks parks a goroutine on the task manager's coalescing wake-up
// channel. Exactly one of these is in flight at a time; each wake-up re-arms
// itself, which is what lets background work drive redraws without polling.
func waitForTasks(manager *task.Manager) tea.Cmd {
	return func() tea.Msg {
		<-manager.Changed()
		return tasksChangedMsg{}
	}
}

// waitForLogs mirrors waitForTasks for the live container log streams.
func waitForLogs(registry *logs.Registry) tea.Cmd {
	return func() tea.Msg {
		<-registry.Changed()
		return logsChangedMsg{}
	}
}

func tickRefresh() tea.Cmd {
	return tea.Tick(refreshEvery, func(now time.Time) tea.Msg { return refreshMsg(now) })
}

// tickFrame drives spinner and progress-bar animation. It only runs while
// something is actually moving, so an idle CLI costs no wake-ups at all.
func tickFrame() tea.Cmd {
	return tea.Tick(frameEvery, func(now time.Time) tea.Msg { return frameMsg(now) })
}

func notify(text string, level statusLevel) tea.Cmd {
	return func() tea.Msg { return statusMsg{text: text, level: level} }
}

func fetchCIChecks(pr int, refresh bool) tea.Cmd {
	if pr <= 0 {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		checks, err := gh.GetPRChecks(ctx, pr, refresh)
		return ciChecksMsg{pr: pr, checks: checks, err: err}
	}
}
