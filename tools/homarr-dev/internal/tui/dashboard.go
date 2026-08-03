package tui

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"charm.land/bubbles/v2/table"
	"charm.land/bubbles/v2/textinput"
	"charm.land/bubbles/v2/viewport"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/platform"
)

var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("212"))
	helpStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
	logHeadSt     = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
	runningLegend = lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("● running")
	stoppedLegend = lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render("○ stopped")
)

type dashModel struct {
	table         table.Model
	allRows       []table.Row
	filter        textinput.Model
	filtering     bool
	logs          viewport.Model
	showLogs      bool
	follow        bool
	status        string
	confirmRemove string
	width         int
	height        int
}

type tickMsg time.Time
type actionMsg string
type rowsMsg []table.Row
type logsMsg struct {
	name    string
	content string
}

func tick() tea.Cmd {
	return tea.Tick(3*time.Second, func(t time.Time) tea.Msg { return tickMsg(t) })
}

func fetchLogs(name string) tea.Cmd {
	return func() tea.Msg {
		if name == "" {
			return logsMsg{}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		out, err := exec.CommandContext(ctx, "docker", "logs", "--tail", "200", name).CombinedOutput()
		if err != nil {
			return logsMsg{name: name, content: "logs unavailable: " + err.Error()}
		}
		return logsMsg{name: name, content: string(out)}
	}
}

func loadRows() tea.Cmd {
	return func() tea.Msg { return rowsMsg(refreshRows()) }
}

func refreshRows() []table.Row {
	containers, _ := docker.List()
	rows := make([]table.Row, 0, len(containers))
	for _, c := range containers {
		port := c.HostPort()
		url := ""
		if port != "" && c.Running() {
			url = "http://localhost:" + port
		}
		state := "● " + c.State
		if !c.Running() {
			state = "○ " + c.State
		}
		img := strings.TrimPrefix(c.Image, "ghcr.io/homarr-labs/")
		rows = append(rows, table.Row{c.Name, state, img, port, url, c.Status})
	}
	return rows
}

func dashboardColumns(width int) []table.Column {
	nameWidth := 26
	imageWidth := 30
	urlWidth := 24
	if width < 100 {
		nameWidth = 22
		imageWidth = max(width-54, 18)
		urlWidth = 0
	}
	return []table.Column{
		{Title: "NAME", Width: nameWidth},
		{Title: "STATE", Width: 14},
		{Title: "IMAGE", Width: imageWidth},
		{Title: "PORT", Width: 6},
		{Title: "URL", Width: urlWidth},
		{Title: "STATUS", Width: 0},
	}
}

func newDashModel() dashModel {
	t := table.New(
		table.WithColumns(dashboardColumns(104)),
		table.WithFocused(true),
		table.WithHeight(10),
		table.WithWidth(104),
	)
	s := table.DefaultStyles()
	s.Header = s.Header.Bold(true)
	s.Selected = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("230")).Background(lipgloss.Color("57"))
	t.SetStyles(s)
	logs := viewport.New(viewport.WithWidth(104), viewport.WithHeight(12))
	logs.SoftWrap = true
	filter := textinput.New()
	filter.Prompt = "/ "
	filter.Placeholder = "filter name, image, port, state…"
	filter.SetWidth(50)
	styles := textinput.DefaultDarkStyles()
	styles.Focused.Prompt = styles.Focused.Prompt.Foreground(lipgloss.Color("212")).Bold(true)
	styles.Focused.Text = styles.Focused.Text.Foreground(lipgloss.Color("229"))
	filter.SetStyles(styles)
	return dashModel{table: t, filter: filter, logs: logs, showLogs: true, follow: true, width: 104, height: 30}
}

func (m *dashModel) applyFilter() {
	query := strings.ToLower(strings.TrimSpace(m.filter.Value()))
	if query == "" {
		m.table.SetRows(m.allRows)
		return
	}
	rows := make([]table.Row, 0, len(m.allRows))
	for _, row := range m.allRows {
		if strings.Contains(strings.ToLower(strings.Join(row, " ")), query) {
			rows = append(rows, row)
		}
	}
	m.table.SetRows(rows)
}

func (m dashModel) selected() string {
	row := m.table.SelectedRow()
	if len(row) == 0 {
		return ""
	}
	return row[0]
}

func (m dashModel) selectedPort() string {
	row := m.table.SelectedRow()
	if len(row) < 4 {
		return ""
	}
	return row[3]
}

func (m dashModel) Init() tea.Cmd {
	return tea.Batch(tick(), loadRows(), fetchLogs(m.selected()))
}

func (m dashModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.table.SetColumns(dashboardColumns(msg.Width))
		m.table.SetWidth(msg.Width)
		m.logs.SetWidth(msg.Width)
		m.filter.SetWidth(max(min(msg.Width-4, 60), 10))
		m.layout()
		return m, nil
	case tickMsg:
		return m, tea.Batch(tick(), loadRows())
	case rowsMsg:
		m.allRows = []table.Row(msg)
		m.applyFilter()
		return m, fetchLogs(m.selected())
	case logsMsg:
		if msg.name != "" && msg.name != m.selected() {
			return m, nil
		}
		m.logs.SetContent(strings.TrimRight(msg.content, "\n"))
		if m.follow {
			m.logs.GotoBottom()
		}
		return m, nil
	case actionMsg:
		m.status = string(msg)
		m.confirmRemove = ""
		return m, loadRows()
	case tea.KeyPressMsg:
		if m.filtering {
			switch msg.Key().Code {
			case tea.KeyEscape:
				m.filtering = false
				m.filter.Reset()
				m.filter.Blur()
				m.applyFilter()
				return m, fetchLogs(m.selected())
			case tea.KeyEnter:
				m.filtering = false
				m.filter.Blur()
				return m, fetchLogs(m.selected())
			}
			var cmd tea.Cmd
			m.filter, cmd = m.filter.Update(msg)
			m.applyFilter()
			return m, tea.Batch(cmd, fetchLogs(m.selected()))
		}
		name := m.selected()
		switch msg.Key().Code {
		case tea.KeyUp, tea.KeyKpUp:
			m.table.MoveUp(1)
			return m, fetchLogs(m.selected())
		case tea.KeyDown, tea.KeyKpDown:
			m.table.MoveDown(1)
			return m, fetchLogs(m.selected())
		case tea.KeyPgUp, tea.KeyKpPgUp:
			m.follow = false
			m.logs.PageUp()
			return m, nil
		case tea.KeyPgDown, tea.KeyKpPgDown:
			m.logs.PageDown()
			m.follow = m.logs.AtBottom()
			return m, nil
		}
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		case "l":
			m.showLogs = !m.showLogs
			m.layout()
			if m.showLogs {
				return m, fetchLogs(name)
			}
			return m, nil
		case "/":
			m.filtering = true
			return m, m.filter.Focus()
		case "f":
			m.follow = !m.follow
			if m.follow {
				m.logs.GotoBottom()
			}
			return m, nil
		case "s":
			if name != "" {
				m.status = "stopping " + name + "…"
				return m, func() tea.Msg {
					if err := docker.Stop(name); err != nil {
						return actionMsg("stop failed: " + err.Error())
					}
					return actionMsg("stopped " + name)
				}
			}
		case "x":
			if name != "" {
				if m.confirmRemove != name {
					m.confirmRemove = name
					m.status = "press x again to remove " + name
					return m, nil
				}
				m.status = "removing " + name + "…"
				return m, func() tea.Msg {
					if err := docker.Remove(name); err != nil {
						return actionMsg("remove failed: " + err.Error())
					}
					return actionMsg("removed " + name)
				}
			}
		case "R":
			if name != "" {
				m.status = "restarting " + name + "…"
				return m, func() tea.Msg {
					if err := docker.Restart(name); err != nil {
						return actionMsg("restart failed: " + err.Error())
					}
					return actionMsg("restarted " + name)
				}
			}
		case "o":
			if name != "" {
				if port := m.selectedPort(); port != "" {
					if err := platform.OpenURL("http://localhost:" + port); err != nil {
						m.status = "open failed: " + err.Error()
					}
				}
			}
		case "c":
			if name != "" {
				if port := m.selectedPort(); port != "" {
					url := "http://localhost:" + port
					if err := platform.CopyText(url); err != nil {
						m.status = "copy failed: " + err.Error()
					} else {
						m.status = "copied " + url
					}
				}
			}
		case "r":
			return m, loadRows()
		case "k":
			m.table.MoveUp(1)
			return m, fetchLogs(m.selected())
		case "j":
			m.table.MoveDown(1)
			return m, fetchLogs(m.selected())
		}
	}
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

func (m *dashModel) layout() {
	available := m.height - 11
	if m.filtering || m.filter.Value() != "" {
		available -= 2
	}
	if !m.showLogs {
		m.table.SetHeight(max(available, 5))
		return
	}
	tableH := min(12, max(available/2, 5))
	m.table.SetHeight(tableH)
	logsH := available - tableH
	if logsH < 3 {
		logsH = 3
	}
	m.logs.SetHeight(logsH)
}

func (m dashModel) selectedDetailView() string {
	row := m.table.SelectedRow()
	if len(row) < 6 {
		return ""
	}
	title := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("229")).Render(row[0])
	meta := row[2] + " · " + row[1]
	if row[3] != "" {
		meta += " · port " + row[3]
	}
	if row[4] != "" {
		meta += " · " + row[4]
	}
	if row[5] != "" {
		meta += " · " + row[5]
	}
	return title + "\n" + helpStyle.Render(meta)
}

func (m dashModel) View() tea.View {
	var b strings.Builder
	running := 0
	for _, row := range m.allRows {
		if len(row) > 1 && strings.Contains(row[1], "running") {
			running++
		}
	}
	b.WriteString(titleStyle.Render("🦞 homarr instances") + "  " + helpStyle.Render(fmt.Sprintf("%d total · %d running · %d shown", len(m.allRows), running, len(m.table.Rows()))))
	b.WriteString("\n\n")
	if m.filtering || m.filter.Value() != "" {
		b.WriteString(m.filter.View() + "\n\n")
	}
	if len(m.table.Rows()) == 0 {
		message := "no homarr containers — start one with `homarr run <tag>` or `homarr run --pr N`"
		if len(m.allRows) > 0 {
			message = "no instances match " + m.filter.Value()
		}
		b.WriteString(helpStyle.Render("  " + message + "\n"))
	} else {
		b.WriteString(m.table.View())
		b.WriteString("\n")
	}
	if detail := m.selectedDetailView(); detail != "" {
		b.WriteString("\n" + detail + "\n")
	}
	if m.showLogs && len(m.table.Rows()) > 0 {
		mode := "paused"
		if m.follow {
			mode = "following"
		}
		b.WriteString("\n" + logHeadSt.Render("── logs: "+m.selected()+" ("+mode+") ──") + "\n")
		b.WriteString(m.logs.View())
	}
	if m.status != "" {
		statusStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
		lower := strings.ToLower(m.status)
		if strings.Contains(lower, "fail") || strings.Contains(lower, "error") {
			statusStyle = statusStyle.Foreground(lipgloss.Color("196"))
		} else if strings.Contains(lower, "press x") {
			statusStyle = statusStyle.Foreground(lipgloss.Color("214"))
		}
		b.WriteString("\n" + statusStyle.Render(m.status))
	}
	b.WriteString("\n\n" + helpStyle.Render("/ filter · ↑/↓ select · l logs · f follow · pgup/pgdn scroll · s stop · R restart · x remove · o open · c copy URL · r refresh · d development · q quit"))
	b.WriteString("\n" + helpStyle.Render(runningLegend+" · "+stoppedLegend))
	v := tea.NewView(b.String())
	v.AltScreen = true
	v.WindowTitle = "🦞 Homarr instances"
	return v
}

func RunDashboard() error {
	return runApp(true)
}
