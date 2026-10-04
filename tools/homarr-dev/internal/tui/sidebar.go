package tui

import (
	"fmt"
	"strings"

	"charm.land/bubbles/v2/viewport"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/logs"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

type sidebarSource int

const (
	// sourceLogs follows the selected (or pinned) container.
	sourceLogs sidebarSource = iota
	// sourceTask follows a background pull or build.
	sourceTask
	// sourceCI follows the GitHub CI checks for the selected PR.
	sourceCI
)

var sidebarTabNames = map[sidebarSource]string{
	sourceLogs: "logs",
	sourceTask: "build",
	sourceCI:   "ci",
}

var tabOrder = []sidebarSource{sourceLogs, sourceTask, sourceCI}

// sidebar is the right-hand panel. It has two jobs — live container output and
// live build output — and both are just text, so one scrollable viewport backs
// them and the source switch only changes what fills it.
type sidebar struct {
	visible  bool
	source   sidebarSource
	viewport viewport.Model
	follow   bool
	pinned   string
	taskID   int
	width    int
	height   int
	title    string
	subtitle string
}

func newSidebar() sidebar {
	view := viewport.New(viewport.WithWidth(40), viewport.WithHeight(10))
	view.SoftWrap = true
	view.Style = lipgloss.NewStyle().Foreground(ui.Text)
	return sidebar{visible: true, follow: true, viewport: view, width: 40, height: 10}
}

// resize sets the panel's outer dimensions; the viewport is inset for the
// border and the two header lines.
// resize sets the panel's outer size in terminal cells. In Lip Gloss v2 a
// style's Width includes its border, so the text inside loses two columns to
// the border and two more to the horizontal padding. Vertically the border
// costs two rows and the title and subtitle one each.
func (s *sidebar) resize(width, height int) {
	s.width, s.height = width, height
	s.viewport.SetWidth(s.textWidth())
	s.viewport.SetHeight(max(height-4, 3))
}

// textWidth is the usable width inside the border and padding. Content wider
// than this soft-wraps, which turns a progress list into a ragged mess, so
// every renderer budgets against it.
func (s sidebar) textWidth() int { return max(s.width-4, 10) }

func (s *sidebar) setContent(content string) {
	atBottom := s.viewport.AtBottom()
	s.viewport.SetContent(content)
	if s.follow || atBottom {
		s.viewport.GotoBottom()
	}
}

func (s *sidebar) toggleFollow() {
	s.follow = !s.follow
	if s.follow {
		s.viewport.GotoBottom()
	}
}

func (s *sidebar) pageUp() {
	s.follow = false
	s.viewport.PageUp()
}

func (s *sidebar) pageDown() {
	s.viewport.PageDown()
	s.follow = s.viewport.AtBottom()
}

// view renders the panel, or nothing when it is hidden.
func (s sidebar) view() string {
	if !s.visible || s.width < 24 {
		return ""
	}
	text := s.textWidth()
	header := ui.Heading.Render(ui.Truncate(s.title, text))
	mode := "paused"
	if s.follow {
		mode = "following"
	}
	subtitle := s.subtitle
	if subtitle == "" {
		subtitle = mode
	} else {
		subtitle += " · " + mode
	}
	body := lipgloss.JoinVertical(lipgloss.Left,
		header,
		ui.Help.Render(ui.Truncate(subtitle, text)),
		s.viewport.View(),
	)
	return ui.Panel("", s.source == sourceTask).Width(s.width).Height(s.height - 2).Render(body)
}

var logStateLabels = map[logs.State]string{
	logs.StateStarting: "attaching",
	logs.StateStopped:  "stream ended",
	logs.StateFailed:   "stream failed",
}

// renderLogSnapshot turns a live log buffer into panel content.
func renderLogSnapshot(name string, snapshot logs.Snapshot, attached bool) (title, subtitle, content string) {
	title = ui.IconTerminal + " " + name
	if name == "" {
		return ui.IconTerminal + " logs", "no container selected", ui.Help.Render("Select a running instance to stream its logs.")
	}
	if !attached {
		return title, "not streaming", ui.Help.Render("Container is not running.")
	}
	if snapshot.State == logs.StateStreaming {
		subtitle = fmt.Sprintf("%d lines", len(snapshot.Lines))
	} else if label, found := logStateLabels[snapshot.State]; found {
		subtitle = label
	}
	content = tailLines(snapshot.Lines, len(snapshot.Lines))
	if snapshot.Err != nil {
		content += "\n" + ui.Alert.Render(snapshot.Err.Error())
	}
	if strings.TrimSpace(content) == "" {
		content = ui.Help.Render("waiting for output…")
	}
	return title, subtitle, content
}

var taskKindIcons = map[task.Kind]string{
	task.KindBuild: ui.IconBuild,
	task.KindPull:  ui.IconCloud,
}

// renderTaskSnapshot lays out a background job: a progress bar per unit of
// work, then the tail of its output. This is the panel that answers "what is my
// build doing right now" without leaving the interface.
func renderTaskSnapshot(snapshot task.Snapshot, width int) (title, subtitle, content string) {
	kindIcon := taskKindIcons[snapshot.Kind]
	if kindIcon == "" {
		kindIcon = ui.IconBuild
	}
	title = kindIcon + " " + snapshot.Kind.String() + " · " + snapshot.Target
	subtitle = snapshot.State.String()
	if snapshot.Detail != "" {
		subtitle += " · " + snapshot.Detail
	}
	subtitle += fmt.Sprintf(" · %s", formatDuration(snapshot.Elapsed()))

	var out strings.Builder
	labelWidth := stepLabelWidth(snapshot.Steps, width)
	for _, step := range snapshot.Steps {
		out.WriteString(renderStep(step, labelWidth, width))
		out.WriteString("\n")
	}
	if snapshot.Kind == task.KindBuild {
		if tail := tailLines(snapshot.Lines, 60); tail != "" {
			if out.Len() > 0 {
				out.WriteString(ui.Rule("output", width) + "\n")
			}
			// Left unstyled so the build tool's own colours survive.
			out.WriteString(tail + "\n")
		}
	}
	if snapshot.Err != nil {
		out.WriteString("\n" + ui.Alert.Render(snapshot.Err.Error()))
	}
	if strings.TrimSpace(out.String()) == "" {
		out.WriteString(ui.Help.Render("starting…"))
	}
	return title, subtitle, out.String()
}

// renderStep lays out one progress row inside an exact width. The panel wraps
// long lines, which would turn a layer list into a ragged mess, so each row is
// budgeted rather than trimmed after the fact.
// stepLabelWidth sizes the label column to the widest label, so a pull of
// twelve-character layer IDs does not leave a gap the width of a Dockerfile
// instruction.
func stepLabelWidth(steps []task.Step, width int) int {
	longest := 0
	for _, step := range steps {
		longest = max(longest, lipgloss.Width(step.Label))
	}
	bar := clampInt(width/3, 6, 22)
	available := max(width-bar-stepFixedWidth-8, 8)
	return clampInt(longest, 8, available)
}

func renderStep(step task.Step, labelWidth, width int) string {
	icon := ui.Pending.Render(ui.IconPending)
	switch {
	case step.Failed:
		icon = ui.Alert.Render(ui.IconFail)
	case step.Done:
		icon = ui.OK.Render(ui.IconPass)
	}
	colour := ui.Warning
	if step.Done {
		colour = ui.Success
	}

	note := step.Note
	if note == "" {
		note = strings.ToLower(step.Status)
	}
	bar := clampInt(width/3, 6, 22)
	noteWidth := max(width-bar-labelWidth-stepFixedWidth, 0)

	rendered := fmt.Sprintf("%s %-*s %s %s",
		icon,
		labelWidth, ui.Truncate(step.Label, labelWidth),
		ui.Bar(step.Percent, bar, colour),
		ui.Percent(step.Percent),
	)
	if noteWidth > 1 && note != "" {
		rendered += " " + ui.Help.Render(ui.Truncate(note, noteWidth-1))
	}
	return rendered
}

// stepFixedWidth is the icon, the percentage, and the three separating spaces.
const stepFixedWidth = 1 + 4 + 3

// tailLines keeps the last count meaningful lines of output.
func tailLines(lines []string, count int) string {
	kept := make([]string, 0, min(len(lines), count))
	for _, line := range lines {
		if !ui.Blank(line) {
			kept = append(kept, line)
		}
	}
	if len(kept) > count {
		kept = kept[len(kept)-count:]
	}
	return strings.Join(kept, "\n")
}

func clampInt(value, low, high int) int {
	if value < low {
		return low
	}
	if value > high {
		return high
	}
	return value
}

type checkGlyphSpec struct {
	symbol string
	style  lipgloss.Style
}

var checkGlyphs = map[string]checkGlyphSpec{
	"pass":     {ui.IconPass, ui.OK},
	"fail":     {ui.IconFail, ui.Alert},
	"pending":  {ui.IconPending, ui.Pending},
	"skipping": {ui.IconStopped, ui.Dim},
	"cancel":   {ui.IconFail, ui.Dim},
}

func renderCheckLine(c gh.Check, width int) string {
	spec, found := checkGlyphs[c.BucketKey()]
	if !found {
		spec = checkGlyphs["pending"]
	}
	icon := spec.style.Render(spec.symbol)

	dur := c.Duration()
	durStyle := ui.Dim
	if dur == "" {
		if c.IsSkipped() {
			dur = "skipped"
		} else if c.IsPending() {
			dur = "running"
			durStyle = ui.Pending
		} else if c.IsFailure() {
			dur = "failed"
			durStyle = ui.Alert
		} else {
			dur = "—"
		}
	} else if c.IsFailure() {
		durStyle = ui.Alert
	} else if c.IsPending() {
		durStyle = ui.Pending
	}
	styledDur := durStyle.Render(dur)
	durLen := lipgloss.Width(styledDur)

	name := c.Name
	if c.Workflow != "" && c.Workflow != c.Name && c.Workflow != "CI" {
		name += " " + ui.Dim.Render("("+c.Workflow+")")
	}

	maxNameWidth := max(width-durLen-4, 10)
	styledName := ui.Truncate(name, maxNameWidth)
	padding := max(width-lipgloss.Width(icon)-1-lipgloss.Width(styledName)-durLen, 1)

	line := icon + " " + styledName + strings.Repeat(" ", padding) + styledDur
	if c.Description != "" {
		line += "\n    " + ui.Help.Render(ui.Truncate(c.Description, max(width-6, 10)))
	}
	return line
}

func renderCISnapshot(pr int, checks []gh.Check, loading bool, err error, width int) (title, subtitle, content string) {
	if pr <= 0 {
		return "ci", "no PR selected", ui.Help.Render("Select a pull request to inspect its CI checks.")
	}
	title = fmt.Sprintf("ci · PR #%d", pr)
	if loading && len(checks) == 0 {
		return title, "fetching…", ui.Help.Render("Fetching CI checks from GitHub…")
	}
	if err != nil && len(checks) == 0 {
		return title, "error", ui.Alert.Render(err.Error()) + "\n\n" + ui.Help.Render("Check `gh auth status` and internet connection.")
	}
	if len(checks) == 0 {
		return title, "no checks", ui.Help.Render("No CI checks reported for this pull request.")
	}

	pass, fail, pending, skipping := 0, 0, 0, 0
	for _, c := range checks {
		switch {
		case c.IsSuccess():
			pass++
		case c.IsFailure():
			fail++
		case c.IsPending():
			pending++
		default:
			skipping++
		}
	}

	var parts []string
	if pass > 0 {
		parts = append(parts, fmt.Sprintf("%s %d pass", ui.IconPass, pass))
	}
	if fail > 0 {
		parts = append(parts, fmt.Sprintf("%s %d fail", ui.IconFail, fail))
	}
	if pending > 0 {
		parts = append(parts, fmt.Sprintf("%s %d pending", ui.IconPending, pending))
	}
	if skipping > 0 {
		parts = append(parts, fmt.Sprintf("%s %d skipped", ui.IconStopped, skipping))
	}
	subtitle = strings.Join(parts, " · ")

	var out strings.Builder
	for _, c := range checks {
		out.WriteString(renderCheckLine(c, width))
		out.WriteString("\n")
	}
	return title, subtitle, strings.TrimRight(out.String(), "\n")
}
