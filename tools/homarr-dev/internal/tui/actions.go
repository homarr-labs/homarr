package tui

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/platform"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/registry"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/run"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

// target is everything the actions need to know about the selected row,
// resolved once so the same code can act on a pull request, a local image, or a
// bare container without caring which screen the user is on.
type target struct {
	label      string
	container  string
	localImage string
	volume     string
	pr         int
	running    bool
	port       string
	provenance docker.Image
	buildable  bool
}

func (m Model) currentTarget() (target, bool) {
	if m.screen == screenInstances {
		row, found := m.selectedInstance()
		if !found {
			return target{}, false
		}
		return m.instanceTarget(row), true
	}
	row, found := m.selectedDev()
	if !found {
		return target{}, false
	}
	return m.devTarget(row), true
}

func (m Model) devTarget(row devRow) target {
	result := target{
		label:     row.label(),
		container: row.containerName(),
		volume:    row.volumeName(),
		running:   row.running,
		port:      row.port,
		buildable: true,
	}
	if row.kind == rowLocal {
		result.localImage = row.local.Reference()
		result.provenance = row.local
		result.pr = row.local.PRNumber
		return result
	}
	result.pr = row.pr.Number
	result.localImage = row.localReference()
	// A pull request always has a rebuild recipe even without a local image:
	// clone the head into a temporary checkout and build it as homarr:pr-N.
	result.provenance = docker.Image{Tag: fmt.Sprintf("pr-%d", row.pr.Number), PRNumber: row.pr.Number}
	if row.local.Tag != "" {
		result.provenance = row.local
	}
	return result
}

func (m Model) instanceTarget(row instanceRow) target {
	result := target{
		label:     row.container.Name,
		container: row.container.Name,
		volume:    row.volume,
		running:   row.container.Running(),
		port:      row.container.HostPort(),
	}
	if strings.HasPrefix(row.container.Image, "homarr:") {
		result.localImage = row.container.Image
		tag := strings.TrimPrefix(row.container.Image, "homarr:")
		for _, image := range m.images {
			if image.Tag == tag {
				result.provenance, result.buildable = image, true
				break
			}
		}
	}
	if number := row.prNumber(); number > 0 {
		result.pr = number
		if !result.buildable {
			result.provenance = docker.Image{Tag: fmt.Sprintf("pr-%d", number), PRNumber: number}
			result.buildable = true
		}
	}
	return result
}

// primaryAction is Enter: stop what is running, start what is not. A matching
// local build and a published registry image open a small source selector;
// otherwise the only available source is started directly.
func (m Model) primaryAction() (Model, tea.Cmd) {
	if m.screen == screenInstances {
		row, found := m.selectedInstance()
		if !found {
			return m, nil
		}
		if row.container.Running() {
			return m.stopContainer(row.container.Name)
		}
		return m.restartContainer(row.container.Name)
	}

	row, found := m.selectedDev()
	if !found {
		return m, nil
	}
	if row.running {
		return m.stopContainer(row.containerName())
	}
	if row.kind == rowLocal {
		return m.startLocal(row)
	}
	if row.hasCurrentLocalImage() {
		if m.remoteImageAvailable(row) {
			return m.selectImage(row)
		}
		return m.startLocalPR(row)
	}
	switch row.image {
	case ui.ImageUnknown, ui.ImageChecking:
		m.status, m.statusLevel = "still checking whether CI published an image for "+row.label(), levelWarn
		return m, nil
	case ui.ImageMissing:
		m.status, m.statusLevel = fmt.Sprintf("CI has not published an image for PR #%d yet — press R to build it locally", row.pr.Number), levelWarn
		return m, nil
	}
	return m.deployRemotePR(row)
}

func (m Model) remoteImageAvailable(row devRow) bool {
	return row.kind == rowRemote && m.tagsKnown && registry.HasPRImage(m.tags, row.pr.Number)
}

func (m Model) selectImage(row devRow) (Model, tea.Cmd) {
	m.imageSelection = imageSelection{rowKey: row.key(), choice: imageChoiceLocal}
	m.mode = modeImageSelect
	m.status, m.statusLevel = "choose an image source for "+row.label(), levelInfo
	m.relayout()
	return m, nil
}

func (m Model) startLocal(row devRow) (Model, tea.Cmd) {
	plan, err := run.BuildPlan(run.Options{Context: context.Background(), Tag: row.local.Tag, Demo: m.demo})
	if err != nil {
		m.status, m.statusLevel = err.Error(), levelError
		return m, nil
	}
	return m.startPlan("start "+row.local.Reference(), row.containerName(), plan)
}

func (m Model) startLocalPR(row devRow) (Model, tea.Cmd) {
	plan, err := localPRPlan(row, m.demo)
	if err != nil {
		m.status, m.statusLevel = err.Error(), levelError
		return m, nil
	}
	return m.startPlan(fmt.Sprintf("start PR #%d from local build", row.pr.Number), row.containerName(), plan)
}

// localPRPlan runs a locally built image under the pull request's container and
// volume identity, so switching between a local build and the registry build of
// the same pull request keeps the same data and port.
func localPRPlan(row devRow, demo bool) (*run.Plan, error) {
	plan, err := run.BuildPlan(run.Options{Context: context.Background(), Tag: row.local.Tag, Demo: demo})
	if err != nil {
		return nil, err
	}
	plan.Name = row.containerName()
	plan.Volume = row.volumeName()
	plan.Label = fmt.Sprintf("PR #%d · local %s", row.pr.Number, truncateRevision(row.local.Revision))
	plan.PRNumber = row.pr.Number
	return plan, nil
}

func truncateRevision(revision string) string {
	if len(revision) > 12 {
		return revision[:12]
	}
	return revision
}

func (m Model) startPlan(title, container string, plan *run.Plan) (Model, tea.Cmd) {
	m.tasks.Action(title, container, func(ctx context.Context) error {
		plan.Pull = false
		return run.StartDetached(plan)
	})
	m.status, m.statusLevel = fmt.Sprintf("%s → http://localhost:%d", title, plan.HostPort), levelInfo
	return m, nil
}

// deployRemotePR pulls the registry image and starts it as one job, so the
// sidebar shows a single continuous progress stream rather than two.
func (m Model) deployRemotePR(row devRow) (Model, tea.Cmd) {
	if existing, running := m.tasks.RunningFor(row.containerName()); running {
		m.status, m.statusLevel = existing.Title+" is already running", levelWarn
		return m, nil
	}
	plan, err := run.BuildPlan(run.Options{Context: context.Background(), PR: row.pr.Number, Demo: m.demo})
	if err != nil {
		m.status, m.statusLevel = err.Error(), levelError
		return m, nil
	}
	// Reuse the port a running instance already holds so a redeploy does not
	// move the URL out from under an open browser tab.
	if row.running && row.port != "" {
		if port, err := strconv.Atoi(row.port); err == nil {
			plan.HostPort = port
		}
	}
	title := fmt.Sprintf("pull and start PR #%d", row.pr.Number)
	created := m.tasks.Start(task.KindPull, title, row.containerName(), func(ctx context.Context, report *task.Reporter) error {
		if err := task.PullImage(ctx, report, plan.Image, plan.Platform); err != nil {
			return err
		}
		report.SetDetail("starting container on port " + strconv.Itoa(plan.HostPort))
		plan.Pull = false
		return run.StartDetached(plan)
	})
	return m.focusOn(created.ID(), title)
}

// buildLocally rebuilds the selection in the background. A pull request without
// a local image is cloned into a temporary checkout first.
func (m Model) buildLocally(subject target) (Model, tea.Cmd) {
	if !subject.buildable {
		m.status, m.statusLevel = subject.label+" has no build source to rebuild from", levelWarn
		return m, nil
	}
	reference := "homarr:" + subject.provenance.Tag
	if existing, running := m.tasks.RunningFor(reference); running {
		m.status, m.statusLevel = existing.Title+" is already running", levelWarn
		return m, nil
	}
	image := subject.provenance
	title := "build " + reference
	created := m.tasks.BuildFrom(title, reference, func(ctx context.Context, report *task.Reporter) (docker.BuildOptions, error) {
		options, cleanup, err := run.RebuildOptions(ctx, image, report.Log)
		if err != nil {
			return docker.BuildOptions{}, err
		}
		// The checkout has to outlive option construction but not the build,
		// and BuildFrom runs both inside one job, so releasing it when the job
		// goroutine unwinds is both correct and the simplest thing available.
		context.AfterFunc(ctx, cleanup)
		return options, nil
	})
	return m.focusOn(created.ID(), title)
}

func (m Model) pullRemote(row devRow) (Model, tea.Cmd) {
	if row.kind != rowRemote {
		m.status, m.statusLevel = "pulling only applies to pull-request images", levelWarn
		return m, nil
	}
	return m.deployRemotePR(row)
}

// focusOn points the tray and sidebar at a freshly started job so its progress
// is visible without any further keystrokes.
func (m Model) focusOn(id int, title string) (Model, tea.Cmd) {
	m.focusTask = id
	m.sidebar.visible = true
	m.sidebar.source = sourceTask
	m.sidebar.follow = true
	m.status, m.statusLevel = title+" started in the background", levelInfo
	m.relayout()
	cmd := m.refreshSidebar()
	clocks := m.animate()
	return m, tea.Batch(cmd, clocks)
}

func (m Model) stopContainer(name string) (Model, tea.Cmd) {
	m.tasks.Action("stop "+name, name, func(ctx context.Context) error { return docker.StopContext(ctx, name) })
	m.status, m.statusLevel = "stopping "+name+"…", levelInfo
	return m, nil
}

func (m Model) restartContainer(name string) (Model, tea.Cmd) {
	m.tasks.Action("restart "+name, name, func(ctx context.Context) error { return docker.RestartContext(ctx, name) })
	m.status, m.statusLevel = "restarting "+name+"…", levelInfo
	return m, nil
}

func (m Model) removeContainer(name string) (Model, tea.Cmd) {
	m.tasks.Action("remove "+name, name, func(ctx context.Context) error { return docker.RemoveContext(ctx, name) })
	m.status, m.statusLevel = "removing "+name+"…", levelInfo
	return m, nil
}

func (m Model) deleteImage(reference string) (Model, tea.Cmd) {
	m.tasks.Action("delete "+reference, reference, func(ctx context.Context) error {
		return docker.RemoveImage(ctx, reference)
	})
	m.status, m.statusLevel = "deleting "+reference+"…", levelInfo
	return m, nil
}

// deleteData removes an instance's volume. Docker refuses to delete a volume
// that is still attached, so the container is removed first — the data is going
// away either way, and failing halfway would leave the user to work out why.
func (m Model) deleteData(subject target) (Model, tea.Cmd) {
	container, volume := subject.container, subject.volume
	if volume == "" {
		m.status, m.statusLevel = subject.label+" has no data volume to delete", levelWarn
		return m, nil
	}
	m.tasks.Action("delete data "+volume, volume, func(ctx context.Context) error {
		_ = docker.RemoveContext(ctx, container)
		return docker.RemoveVolume(ctx, volume)
	})
	m.status, m.statusLevel = "deleting "+volume+"…", levelInfo
	return m, nil
}

func (m Model) pruneStopped() (Model, tea.Cmd) {
	names := make([]string, 0)
	for _, container := range m.containers {
		if !container.Running() {
			names = append(names, container.Name)
		}
	}
	if len(names) == 0 {
		m.status, m.statusLevel = "no stopped Homarr containers to prune", levelInfo
		return m, nil
	}
	m.tasks.Action(fmt.Sprintf("prune %d stopped containers", len(names)), "prune", func(ctx context.Context) error {
		for _, name := range names {
			if err := docker.RemoveContext(ctx, name); err != nil {
				return err
			}
		}
		return nil
	})
	m.status, m.statusLevel = fmt.Sprintf("pruning %d stopped containers…", len(names)), levelInfo
	return m, nil
}

func (m Model) openPullRequest() (Model, tea.Cmd) {
	row, found := m.selectedDev()
	if !found || row.kind != rowRemote {
		m.status, m.statusLevel = "select a pull request to open it on GitHub", levelWarn
		return m, nil
	}
	return m.openPullRequestNumber(row.pr.Number)
}

func (m Model) openPullRequestNumber(number int) (Model, tea.Cmd) {
	if number <= 0 {
		return m, nil
	}
	url := fmt.Sprintf("https://github.com/%s/pull/%d", gitHubRepo, number)
	if err := platform.OpenURL(url); err != nil {
		m.status, m.statusLevel = "open failed: "+err.Error(), levelError
		return m, nil
	}
	m.status, m.statusLevel = "opened "+url, levelOK
	return m, nil
}

const gitHubRepo = "homarr-labs/homarr"

func (m Model) openApp() (Model, tea.Cmd) {
	subject, found := m.currentTarget()
	if !found || !subject.running || subject.port == "" {
		m.status, m.statusLevel = "selection is not running", levelWarn
		return m, nil
	}
	url := "http://localhost:" + subject.port
	if err := platform.OpenURL(url); err != nil {
		m.status, m.statusLevel = "open failed: "+err.Error(), levelError
		return m, nil
	}
	m.status, m.statusLevel = "opened "+url, levelOK
	return m, nil
}

func (m Model) copyURL() (Model, tea.Cmd) {
	subject, found := m.currentTarget()
	if !found || subject.port == "" {
		m.status, m.statusLevel = "selection has no published port", levelWarn
		return m, nil
	}
	url := "http://localhost:" + subject.port
	if err := platform.CopyText(url); err != nil {
		m.status, m.statusLevel = "copy failed: "+err.Error(), levelError
		return m, nil
	}
	m.status, m.statusLevel = "copied "+url, levelOK
	return m, nil
}

// remoteImageFor is used by the detail view to name the registry image a row
// would pull.
func remoteImageFor(row devRow) string {
	if row.kind != rowRemote {
		return ""
	}
	return registry.ImageReference(row.pr.Number)
}
