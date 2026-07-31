package tui

import (
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

func TestPRWithoutImageDoesNotLaunch(t *testing.T) {
	m := newPRsModel()
	m.rows = []prRow{{kind: "remote", pr: gh.PR{Number: 6441, Title: "No image"}, imageState: "no"}}
	m.table.SetRows(buildTableRows(m.rows))

	updated, cmd := m.Update(tea.KeyPressMsg(tea.Key{Code: tea.KeyEnter}))
	got := updated.(prsModel)
	if cmd != nil {
		t.Fatal("unavailable image returned a launch command")
	}
	if !strings.Contains(got.status, "cannot start") {
		t.Fatalf("status = %q, want launch rejection", got.status)
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
