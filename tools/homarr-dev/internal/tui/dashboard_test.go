package tui

import (
	"strings"
	"testing"

	"charm.land/bubbles/v2/table"
	tea "charm.land/bubbletea/v2"
)

func TestDashboardRendersRowsAndLogs(t *testing.T) {
	m := newDashModel()
	m.table.SetRows([]table.Row{{
		"homarr_pr_6441",
		"running",
		"homarr-test:pr-6441",
		"7575",
		"http://localhost:7575",
	}})
	m.logs.SetWidth(104)
	m.logs.SetHeight(5)
	m.logs.SetContent("server ready")

	got := m.View().Content
	for _, want := range []string{"homarr_pr_6441", "server ready"} {
		if !strings.Contains(got, want) {
			t.Fatalf("dashboard omitted %q: %q", want, got)
		}
	}
	if !m.View().AltScreen {
		t.Fatal("dashboard must use the alternate screen")
	}
}

func TestDashboardArrowNavigation(t *testing.T) {
	m := newDashModel()
	m.table.SetRows([]table.Row{
		{"homarr_first", "running", "homarr:first", "7575", ""},
		{"homarr_second", "running", "homarr:second", "7576", ""},
	})

	updated, _ := m.Update(tea.KeyPressMsg(tea.Key{Code: tea.KeyDown}))
	got := updated.(dashModel).selected()
	if got != "homarr_second" {
		t.Fatalf("down arrow selected %q, want homarr_second", got)
	}
}

func TestDashboardIgnoresStaleLogs(t *testing.T) {
	m := newDashModel()
	m.table.SetRows([]table.Row{{"homarr_current", "running", "homarr:current", "7575", ""}})
	m.logs.SetWidth(104)
	m.logs.SetHeight(5)
	m.logs.SetContent("current logs")

	updated, _ := m.Update(logsMsg{name: "homarr_old", content: "stale logs"})
	got := updated.(dashModel).View().Content
	if strings.Contains(got, "stale logs") || !strings.Contains(got, "current logs") {
		t.Fatalf("stale log result replaced current content: %q", got)
	}
}
