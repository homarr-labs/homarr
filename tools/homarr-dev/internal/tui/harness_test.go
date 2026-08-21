package tui

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
)

func sample() (Model, tea.Cmd) {
	m := New(false)
	updated, _ := m.Update(tea.WindowSizeMsg{Width: 140, Height: 40})
	m = updated.(Model)
	loaded := loadedMsg{
		prs: []gh.PR{
			{Number: 6646, Title: "feat: rework the developer CLI from the ground up", Author: "ajnart", HeadRef: "excited-pelican", HeadSHA: "abc123", CIState: "SUCCESS"},
			{Number: 6612, Title: "fix(board): keep the item modal aligned", Author: "meierschlurf", HeadRef: "fix/modal", HeadSHA: "def456", CIState: "PENDING"},
			{Number: 6503, Title: "chore(deps): bump everything", Author: "renovate[bot]", HeadRef: "renovate/all", HeadSHA: "ghi789", CIState: "FAILURE", IsDraft: true},
		},
		images: []docker.Image{
			{ID: "1", Tag: "pr-6646", PRNumber: 6646, Revision: "abc123", Size: "492MB", Created: "33 minutes ago", Source: "https://github.com/homarr-labs/homarr/pull/6646"},
			{ID: "2", Tag: "dev", Revision: "zzz999", Size: "481MB", Created: "2 days ago", Source: "/Users/ajnart/homarr"},
		},
		containers: []docker.Container{
			{ID: "c1", Name: "homarr_pr_6612", Image: "ghcr.io/homarr-labs/homarr-test:pr-6612", State: "running", Status: "Up 45 hours (healthy)", Ports: "0.0.0.0:7576->7575/tcp"},
			{ID: "c2", Name: "homarr_dev", Image: "homarr:dev", State: "exited", Status: "Exited (0) 3 weeks ago"},
		},
		volumes: []docker.Volume{{Name: "homarr_pr_6612_data", Size: "6.8MB"}, {Name: "homarr_dev_data", Size: "12MB"}},
		tags:    map[string]bool{"pr-6612": true, "pr-6503": true},
	}
	next, cmd := m.Update(loaded)
	return next.(Model), cmd
}

func TestRenderDev(t *testing.T) {
	m, _ := sample()
	fmt.Println("=========== DEV ===========")
	fmt.Println(m.View().Content)
}

func TestRenderInstances(t *testing.T) {
	m, _ := sample()
	next, _ := m.switchScreen(screenInstances)
	fmt.Println("=========== INSTANCES ===========")
	fmt.Println(next.View().Content)
}

func TestDebugSelection(t *testing.T) {
	m, _ := sample()
	t.Logf("devFiltered=%d cursor=%d rows=%d", len(m.devFiltered), m.devTable.Cursor(), len(m.devTable.Rows()))
	row, found := m.selectedDev()
	t.Logf("selectedDev found=%v key=%q", found, row.key())
	t.Logf("detailVisible=%v", m.detailVisible())
	t.Logf("detail=%q", m.detail())
	t.Logf("bodyHeight=%d sidebarCols=%d height=%d", m.bodyHeight, m.sidebarCols, m.height)
}

func fakePullTask(m Model) Model {
	m.tasks.Start(task.KindPull, "pull and start PR #6612", "homarr_pr_6612", func(ctx context.Context, report *task.Reporter) error {
		report.SetDetail("4/6 layers · 128.4MB/492.1MB · 12.4MB/s")
		report.SetPercent(0.58)
		report.SetSteps([]task.Step{
			{ID: "a1b2c3d4e5f6", Label: "a1b2c3d4e5f6", Status: "Pull complete", Percent: 1, Done: true, Note: "48.2MB"},
			{ID: "b2c3d4e5f6a7", Label: "b2c3d4e5f6a7", Status: "Already exists", Percent: 1, Done: true, Note: "12.1MB"},
			{ID: "c3d4e5f6a7b8", Label: "c3d4e5f6a7b8", Status: "Extracting", Percent: 0.72, Note: "88.4MB/122.0MB"},
			{ID: "d4e5f6a7b8c9", Label: "d4e5f6a7b8c9", Status: "Downloading", Percent: 0.21, Note: "18.2MB/86.5MB"},
			{ID: "e5f6a7b8c9d0", Label: "e5f6a7b8c9d0", Status: "Waiting", Percent: 0},
		})
		<-ctx.Done()
		return ctx.Err()
	})
	time.Sleep(60 * time.Millisecond)
	next, _ := m.applyTasks()
	next.focusTask = 1
	next.sidebar.source = sourceTask
	next.relayout()
	next.refreshSidebar()
	return next
}

func TestRenderPullProgress(t *testing.T) {
	m, _ := sample()
	m = fakePullTask(m)
	fmt.Println("=========== PULL ===========")
	fmt.Println(m.View().Content)
	m.tasks.CancelAll()
}

func TestRenderManageAndConfirm(t *testing.T) {
	m, _ := sample()
	updated, _ := m.handleKey(tea.KeyPressMsg{Code: 'm', Text: "m"})
	manage := updated.(Model)
	fmt.Println("=========== MANAGE ===========")
	fmt.Println(manage.View().Content)

	updated, _ = manage.handleKey(tea.KeyPressMsg{Code: 'd', Text: "d"})
	fmt.Println("=========== CONFIRM ===========")
	fmt.Println(updated.(Model).View().Content)
}

func TestRenderTaskOverlayAndHelp(t *testing.T) {
	m, _ := sample()
	m = fakePullTask(m)
	updated, _ := m.handleKey(tea.KeyPressMsg{Code: 't', Text: "t"})
	fmt.Println("=========== TASKS ===========")
	fmt.Println(updated.(Model).View().Content)
	m.tasks.CancelAll()

	m2, _ := sample()
	updated, _ = m2.handleKey(tea.KeyPressMsg{Code: '?', Text: "?"})
	fmt.Println("=========== HELP ===========")
	fmt.Println(updated.(Model).View().Content)
}

func TestRenderNarrow(t *testing.T) {
	m, _ := sample()
	updated, _ := m.Update(tea.WindowSizeMsg{Width: 84, Height: 30})
	fmt.Println("=========== NARROW (stacked sidebar) ===========")
	fmt.Println(updated.(Model).View().Content)
}

func TestSidebarTaskAutoSwitchToLogsOnSuccess(t *testing.T) {
	m, _ := sample()
	started := m.tasks.Start(task.KindPull, "pull PR #6612", "homarr_pr_6612", func(ctx context.Context, report *task.Reporter) error {
		return nil
	})
	next, _ := m.focusOn(started.ID(), "pull PR #6612")
	if next.sidebar.source != sourceTask {
		t.Fatalf("expected sidebar source to be sourceTask while task is focused, got %v", next.sidebar.source)
	}

	time.Sleep(50 * time.Millisecond)
	next, _ = next.applyTasks()

	if next.sidebar.source != sourceLogs {
		t.Fatalf("expected sidebar source to auto-switch to sourceLogs on task success, got %v", next.sidebar.source)
	}
	if next.focusTask != 0 {
		t.Fatalf("expected focusTask to reset to 0 on task success, got %d", next.focusTask)
	}
}

func TestSidebarTaskAutoSwitchToLogsOnCancel(t *testing.T) {
	m, _ := sample()
	started := m.tasks.Start(task.KindBuild, "build homarr:dev", "homarr:dev", func(ctx context.Context, report *task.Reporter) error {
		<-ctx.Done()
		return ctx.Err()
	})
	next, _ := m.focusOn(started.ID(), "build homarr:dev")
	if next.sidebar.source != sourceTask {
		t.Fatalf("expected sidebar source to be sourceTask, got %v", next.sidebar.source)
	}

	m.tasks.Cancel(started.ID())
	time.Sleep(50 * time.Millisecond)
	next, _ = next.applyTasks()

	if next.sidebar.source != sourceLogs {
		t.Fatalf("expected sidebar source to auto-switch to sourceLogs on task cancel, got %v", next.sidebar.source)
	}
}

func TestInstanceScreenActionsAndManageChords(t *testing.T) {
	m, _ := sample()
	next, _ := m.switchScreen(screenInstances)
	if next.screen != screenInstances {
		t.Fatalf("expected screenInstances, got %v", next.screen)
	}

	// Test manage mode entry
	updated, _ := next.handleKey(tea.KeyPressMsg{Code: 'm', Text: "m"})
	manage := updated.(Model)
	if manage.mode != modeManage {
		t.Fatalf("expected modeManage, got %v", manage.mode)
	}

	// Press Esc to return to normal mode
	updated, _ = manage.handleKey(tea.KeyPressMsg{Code: tea.KeyEscape})
	normal := updated.(Model)
	if normal.mode != modeNormal {
		t.Fatalf("expected modeNormal after Esc, got %v", normal.mode)
	}
}

func TestSidebarRelevanceOnNavigationAndPinning(t *testing.T) {
	m, _ := sample()

	// Row 0 is PR 6646 (not running, no container)
	if m.sidebarRelevant() {
		t.Fatalf("expected sidebar to NOT be relevant for row without container")
	}

	// Move down to Row 1 (PR 6612, which is running)
	moved, _ := m.moveSelection(1)
	if !moved.sidebarRelevant() {
		t.Fatalf("expected sidebar to BE relevant for running container")
	}
	if moved.logTarget() != "homarr_pr_6612" {
		t.Fatalf("expected logTarget=homarr_pr_6612, got %q", moved.logTarget())
	}

	// Move down to Row 2 (PR 6503, no container)
	moved2, _ := moved.moveSelection(1)
	if moved2.sidebarRelevant() {
		t.Fatalf("expected sidebar to NOT be relevant for row without container")
	}

	// Pin while on Row 1
	pinned, _ := moved.togglePin()
	if pinned.sidebar.pinned != "homarr_pr_6612" {
		t.Fatalf("expected pinned container to be homarr_pr_6612, got %q", pinned.sidebar.pinned)
	}

	// Move to Row 2 while pinned -> sidebar remains relevant!
	movedPinned, _ := pinned.moveSelection(1)
	if !movedPinned.sidebarRelevant() {
		t.Fatalf("expected sidebar to remain relevant when a valid container is pinned")
	}
}

func TestSidebarTabCycleAndCIRendering(t *testing.T) {
	m, _ := sample()

	// Initial source is sourceLogs
	if m.sidebar.source != sourceLogs {
		t.Fatalf("expected sourceLogs, got %v", m.sidebar.source)
	}

	// Press Tab (no active tasks) -> cycles to sourceCI
	tabbed, _ := m.handleKey(tea.KeyPressMsg{Code: tea.KeyTab})
	mTabbed := tabbed.(Model)
	if mTabbed.sidebar.source != sourceCI {
		t.Fatalf("expected sourceCI after Tab, got %v", mTabbed.sidebar.source)
	}
	if !mTabbed.sidebarRelevant() {
		t.Fatalf("expected sidebar to be relevant on PR row when in sourceCI mode")
	}

	// Supply mock CI checks for PR 6646
	updated, _ := mTabbed.Update(ciChecksMsg{
		pr: 6646,
		checks: []gh.Check{
			{Name: "Fast gate", Bucket: "pass", State: "SUCCESS", StartedAt: "2026-08-21T10:00:00Z", CompletedAt: "2026-08-21T10:12:00Z"},
			{Name: "Build amd64", Bucket: "pass", State: "SUCCESS", StartedAt: "2026-08-21T10:12:00Z", CompletedAt: "2026-08-21T10:17:00Z"},
			{Name: "E2E tests", Bucket: "pending", State: "PENDING", StartedAt: "2026-08-21T10:17:00Z"},
			{Name: "publish", Bucket: "skipping", State: "SKIPPED"},
		},
	})
	mCI := updated.(Model)
	if mCI.sidebar.title != "ci · PR #6646" {
		t.Fatalf("unexpected title: %q", mCI.sidebar.title)
	}
	if !strings.Contains(mCI.sidebar.subtitle, "2 pass") || !strings.Contains(mCI.sidebar.subtitle, "1 pending") || !strings.Contains(mCI.sidebar.subtitle, "1 skipped") {
		t.Fatalf("unexpected subtitle: %q", mCI.sidebar.subtitle)
	}

	// Press Tab again -> cycles back to sourceLogs
	tabbedAgain, _ := mCI.handleKey(tea.KeyPressMsg{Code: tea.KeyTab})
	mLogs := tabbedAgain.(Model)
	if mLogs.sidebar.source != sourceLogs {
		t.Fatalf("expected sourceLogs after Tab, got %v", mLogs.sidebar.source)
	}
}
