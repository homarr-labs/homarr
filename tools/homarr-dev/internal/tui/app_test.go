package tui

import (
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

func TestAppTogglePreservesDevelopmentState(t *testing.T) {
	m := newAppModel(false)
	m.dev.rows = []prRow{{kind: "remote", pr: gh.PR{Number: 6502}}}

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: 'd', Text: "d"}))
	dashboard := updated.(appModel)
	if !dashboard.showDashboard {
		t.Fatal("d did not open the instance dashboard")
	}
	updated, _ = dashboard.Update(tea.KeyPressMsg(tea.Key{Code: 'd', Text: "d"}))
	development := updated.(appModel)
	if development.showDashboard || len(development.dev.rows) != 1 || development.dev.rows[0].pr.Number != 6502 {
		t.Fatalf("development state was not preserved: %#v", development.dev.rows)
	}
}

func TestAppToggleDoesNotInterceptFilterInput(t *testing.T) {
	m := newAppModel(false)
	m.dev.filtering = true
	m.dev.filter.Focus()

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: 'd', Text: "d"}))
	got := updated.(appModel)
	if got.showDashboard || got.dev.filter.Value() != "d" {
		t.Fatalf("filter input was intercepted: dashboard=%v filter=%q", got.showDashboard, got.dev.filter.Value())
	}
}

func TestAppCanOpenInstancesDuringBuild(t *testing.T) {
	m := newAppModel(false)
	m.dev.rebuilding = true

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: 'd', Text: "d"}))
	if !updated.(appModel).showDashboard {
		t.Fatal("background build blocked dashboard navigation")
	}
}
