package tui

import (
	"errors"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

func TestPRTableRendersRows(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{{
		kind:       "remote",
		pr:         gh.PR{Number: 6441, Title: "Human PR", Author: "ajnart", CIState: "SUCCESS"},
		imageState: "yes",
	}}
	m.table.SetRows(buildTableRows(m.rows))

	if got := m.View().Content; !strings.Contains(got, "Human PR") {
		t.Fatalf("table view omitted rows: %q", got)
	}
	if !m.View().AltScreen {
		t.Fatal("development browser must use the alternate screen")
	}
}

func TestPRTableArrowNavigation(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{
		{kind: "remote", pr: gh.PR{Number: 1, Title: "First"}},
		{kind: "remote", pr: gh.PR{Number: 2, Title: "Second"}},
	}
	m.table.SetRows(buildTableRows(m.rows))

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: tea.KeyDown}))
	got := updated.(prsModel).table.SelectedRow()
	if len(got) < 3 || got[2] != "2" {
		t.Fatalf("down arrow selected %v, want PR 2", got)
	}
}

func TestPRImageChecksAreBounded(t *testing.T) {
	m := newPRsModel()
	prs := make([]gh.PR, 20)
	for i := range prs {
		prs[i] = gh.PR{Number: i + 1, Title: "PR"}
	}

	updated, cmd := m.Update(prsLoadedMsg{prs: prs})
	got := updated.(prsModel)
	if cmd == nil {
		t.Fatal("expected image check commands")
	}
	if got.imageActive != 6 || len(got.imageQueue) != 14 {
		t.Fatalf("active=%d queued=%d, want active=6 queued=14", got.imageActive, len(got.imageQueue))
	}
}

func TestPRLoadedReusesImageChecksUnlessRefreshIsForced(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{{kind: "remote", pr: gh.PR{Number: 1}, imageState: "yes"}}

	updated, _ := m.Update(prsLoadedMsg{prs: []gh.PR{{Number: 1}, {Number: 2}}})
	cached := updated.(prsModel)
	if cached.rows[0].imageState != "yes" || len(cached.imageQueue) != 0 || cached.imageActive != 1 {
		t.Fatalf("cached states were not reused: rows=%#v queue=%v active=%d", cached.rows, cached.imageQueue, cached.imageActive)
	}

	updated, _ = cached.Update(prsLoadedMsg{prs: []gh.PR{{Number: 1}, {Number: 2}}, refresh: true})
	refreshed := updated.(prsModel)
	if refreshed.rows[0].imageState != "checking" || refreshed.imageActive != 2 {
		t.Fatalf("forced refresh reused image states: rows=%#v active=%d", refreshed.rows, refreshed.imageActive)
	}
}

func TestDevelopmentRowsFoldCurrentLocalPRImage(t *testing.T) {
	prs := []gh.PR{{Number: 6502, HeadSHA: "current"}}
	images := []docker.Image{
		{Tag: "pr-6502", PRNumber: 6502, Revision: "current"},
		{Tag: "pr-6502-stale", PRNumber: 6502, Revision: "stale"},
	}

	rows, queue := developmentRows(prs, images, nil)
	if len(rows) != 2 || !rows[0].hasCurrentLocalImage() || rows[0].local.Tag != "pr-6502" {
		t.Fatalf("current image was not folded into PR row: %#v", rows)
	}
	if rows[1].kind != "local" || rows[1].local.Tag != "pr-6502-stale" {
		t.Fatalf("stale image should remain separate: %#v", rows[1])
	}
	if got := buildTableRows(rows)[0][6]; got != imgLocal {
		t.Fatalf("image marker = %q, want %q", got, imgLocal)
	}
	if len(queue) != 0 {
		t.Fatalf("current local image queued unnecessary registry checks: %v", queue)
	}
}

func TestLocalPRPlanUsesPRContainerIdentity(t *testing.T) {
	row := prRow{
		kind:  "remote",
		pr:    gh.PR{Number: 6502, HeadSHA: "abcdef1234567890"},
		local: docker.Image{Tag: "pr-6502", PRNumber: 6502, Revision: "abcdef1234567890"},
	}
	plan, err := localPRPlan(row, false, func(int) int { return 7575 })
	if err != nil {
		t.Fatal(err)
	}
	if plan.Image != "homarr:pr-6502" || plan.Name != "homarr_pr_6502" || plan.Volume != "homarr_pr_6502_data" || plan.Pull || plan.PRNumber != 6502 {
		t.Fatalf("unexpected local PR plan: %#v", plan)
	}
}

func TestRemotePRBuildUsesTemporaryPRWorkflow(t *testing.T) {
	image, action, status := localBuildForRow(prRow{kind: "remote", pr: gh.PR{Number: 6441}})
	if image.Tag != "pr-6441" || image.PRNumber != 6441 || action != "built" || !strings.Contains(status, "building PR #6441 locally") {
		t.Fatalf("image=%#v action=%q status=%q", image, action, status)
	}
}

func TestPRImageCheckInProgressDoesNotLaunch(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{{kind: "remote", pr: gh.PR{Number: 6441, Title: "Pending image"}, imageState: "checking"}}
	m.table.SetRows(buildTableRows(m.rows))

	updated, cmd := m.Update(tea.KeyPressMsg(tea.Key{Code: tea.KeyEnter}))
	got := updated.(prsModel)
	if cmd != nil {
		t.Fatal("unavailable image returned a launch command")
	}
	if !strings.Contains(got.status, "still in progress") {
		t.Fatalf("status = %q, want launch rejection", got.status)
	}
}

func TestPullErrorIncludesLastDockerMessage(t *testing.T) {
	err := pullCommandError(errors.New("exit status 1"), "manifest unknown")
	if !strings.Contains(err.Error(), "manifest unknown") {
		t.Fatalf("pull error = %v", err)
	}
}

func TestDevTableRendersLocalImageSource(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{{
		kind:       "local",
		local:      docker.Image{Tag: "feature", Source: "/tmp/homarr", Revision: "abcdef1234567890"},
		imageState: "yes",
	}}
	m.table.SetRows(buildTableRows(m.rows))

	content := m.View().Content
	for _, want := range []string{"local", "homarr:feature", "/tmp/homarr", "abcdef123456"} {
		if !strings.Contains(content, want) {
			t.Fatalf("development view omitted %q: %q", want, content)
		}
	}
}

func TestRebuildCompletionRestoresLoadingState(t *testing.T) {
	m := newPRsModel()
	m.rebuilding = true
	image := docker.Image{Tag: "feature"}

	updated, cmd := m.Update(rebuildDoneMsg{image: image})
	got := updated.(prsModel)
	if got.rebuilding || !got.loading || got.status != "rebuilt homarr:feature" || cmd == nil {
		t.Fatalf("unexpected rebuild state: rebuilding=%v loading=%v status=%q", got.rebuilding, got.loading, got.status)
	}
}

func TestRebuildCanBeCanceled(t *testing.T) {
	m := newPRsModel()
	canceled := false
	m.rebuilding = true
	m.rebuildCancel = func() { canceled = true }

	updated, cmd := m.Update(tea.KeyPressMsg(tea.Key{Code: 'q'}))
	got := updated.(prsModel)
	if !canceled || cmd != nil || got.status != "canceling rebuild…" {
		t.Fatalf("cancel state: canceled=%v status=%q", canceled, got.status)
	}
}

func TestNavigationRemainsAvailableDuringBuild(t *testing.T) {
	m := newPRsModel()
	m.rebuilding = true
	m.rows = []prRow{
		{kind: "remote", pr: gh.PR{Number: 1}},
		{kind: "remote", pr: gh.PR{Number: 2}},
	}
	m.table.SetRows(buildTableRows(m.rows))

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: tea.KeyDown}))
	selected := updated.(prsModel).table.SelectedRow()
	if len(selected) < 3 || selected[2] != "2" {
		t.Fatalf("build blocked navigation: %v", selected)
	}
}

func TestCompletedPullWithoutPlanDoesNotPanic(t *testing.T) {
	m := newPRsModel()
	m.pulling = true
	m.pullCancel = func() {}

	updated, cmd := m.Update(pullEvent{done: true})
	got := updated.(prsModel)
	if got.pulling || cmd != nil {
		t.Fatalf("pulling=%v cmd=%v", got.pulling, cmd)
	}
}

func TestTruncateTextPreservesUTF8(t *testing.T) {
	if got := truncateText("🦞homarr", 2); got != "🦞h" {
		t.Fatalf("truncateText() = %q", got)
	}
}
