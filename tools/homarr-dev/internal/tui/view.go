package tui

import (
	"fmt"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

func (m Model) View() tea.View {
	sections := []string{m.header(), ""}
	if m.mode == modeFilter || m.filter.Value() != "" {
		sections = append(sections, m.filter.View(), "")
	}
	sections = append(sections, m.body())
	if detail := m.detail(); detail != "" {
		sections = append(sections, "", detail)
	}
	if tray := m.taskTray(); tray != "" {
		sections = append(sections, tray)
	}
	switch m.mode {
	case modeManage:
		sections = append(sections, "", m.manageBar())
	case modeConfirm:
		sections = append(sections, "", m.confirmBar())
	case modeImageSelect:
		sections = append(sections, "", m.imageSelectBar())
	}
	if m.status != "" {
		sections = append(sections, "", m.statusView())
	}
	sections = append(sections, "", m.footer())

	view := tea.NewView(strings.Join(sections, "\n"))
	view.AltScreen = true
	view.WindowTitle = ui.IconDocker + " Homarr"
	return view
}

func (m Model) header() string {
	title := ui.IconDocker + " homarr"
	screen := "development"
	if m.screen == screenInstances {
		screen = "instances"
	}
	header := ui.Title.Render(title) + ui.Dim.Render(" · ") + ui.Heading.Render(screen)
	if m.busy() {
		header += " " + m.spinner.View()
	}

	badges := make([]string, 0, 4)
	if m.screen == screenDev {
		remote, local, running := 0, 0, 0
		for _, row := range m.devRows {
			if row.kind == rowLocal {
				local++
			} else {
				remote++
				if row.hasCurrentLocalImage() {
					local++
				}
			}
			if row.running {
				running++
			}
		}
		badges = append(badges, ui.Help.Render(fmt.Sprintf("%s %d PRs · %s %d local · %s %d running · %s %d shown", ui.IconPR, remote, ui.IconLocal, local, ui.IconRunning, running, ui.IconSearch, len(m.devFiltered))))
	} else {
		running := 0
		for _, row := range m.instRows {
			if row.container.Running() {
				running++
			}
		}
		badges = append(badges, ui.Help.Render(fmt.Sprintf("%s %d instances · %s %d running · %s %d shown", ui.IconDocker, len(m.instRows), ui.IconRunning, running, ui.IconSearch, len(m.instFiltered))))
	}
	if m.demo {
		badges = append(badges, ui.ModeBadge("DEMO", ui.Warning))
	}
	if running := m.tasks.Running(); running > 0 {
		badges = append(badges, ui.Pending.Render(fmt.Sprintf("%s %d working", ui.IconBuild, running)))
	}
	if !m.includeBots && m.screen == screenDev {
		badges = append(badges, ui.Dim.Render("bots hidden"))
	}
	return clip(header+"  "+strings.Join(badges, ui.Dim.Render(" · ")), m.width)
}

// clip trims a rendered line to the terminal width. The line already carries
// styling, so it is measured and cut by display width rather than by bytes.
func clip(line string, width int) string {
	if width <= 0 || lipgloss.Width(line) <= width {
		return line
	}
	return lipgloss.NewStyle().MaxWidth(width).Render(line)
}

// body joins the active screen with the sidebar. Overlays replace the table but
// keep the sidebar, so a build stays visible while the help is open.
func (m Model) body() string {
	main := m.mainPane()
	if !m.sidebarRelevant() {
		return main
	}
	panel := m.sidebar.view()
	if panel == "" {
		return main
	}
	if m.sidebarStacked {
		return main + "\n" + panel
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, main, " ", panel)
}

func (m Model) mainPane() string {
	width := m.tableWidth()
	switch m.mode {
	case modeHelp:
		return m.helpOverlay(width)
	case modeTasks:
		return m.taskOverlay(width)
	}
	if m.screen == screenInstances {
		if len(m.instFiltered) == 0 {
			return m.emptyPane(width, len(m.instRows) > 0,
				"no Homarr instances — press enter on a pull request to start one")
		}
		return m.instTable.View()
	}
	if len(m.devFiltered) == 0 {
		return m.emptyPane(width, len(m.devRows) > 0,
			"nothing to show — check `gh auth status` and that Docker is running")
	}
	return m.devTable.View()
}

func (m Model) emptyPane(width int, filtered bool, message string) string {
	if filtered {
		message = "nothing matches " + m.filter.Value()
	}
	block := lipgloss.NewStyle().Width(width).Height(m.mainHeight()).Padding(1, 2)
	return block.Render(ui.Help.Render(message))
}

func (m Model) helpOverlay(width int) string {
	body := lipgloss.JoinVertical(lipgloss.Left,
		ui.Heading.Render("Keys"),
		"",
		m.helpView.FullHelpView(m.keys.FullHelp()),
		"",
		ui.Heading.Render("Manage mode"),
		ui.Help.Render("m arms manage mode for the selected row, then:"),
		m.helpView.ShortHelpView(m.keys.ManageHelp()),
		"",
		ui.Heading.Render("Legend"),
		ui.Help.Render("CI      "+ui.CIBadge("SUCCESS", true)+"  "+ui.CIBadge("FAILURE", true)+"  "+ui.CIBadge("PENDING", true)+"  "+ui.CIBadge("", true)),
		ui.Help.Render("IMAGE   "+ui.ImageBadge(ui.ImageLocal, true)+"  "+ui.ImageBadge(ui.ImageStale, true)+"  "+ui.ImageBadge(ui.ImageRemote, true)+"  "+ui.ImageBadge(ui.ImageMissing, true)),
		ui.Help.Render("STATE   "+ui.RunningBadge(true, "7575")+"  "+ui.StateBadge("exited")+"  "+ui.HealthBadge("healthy")),
		"",
		ui.Help.Render("press any key to close"),
	)
	return lipgloss.NewStyle().Width(width).Height(m.mainHeight()).Padding(0, 1).Render(body)
}

// taskOverlay lists background work with per-job progress, so a user who
// started three builds can see all of them without cycling the sidebar.
func (m Model) taskOverlay(width int) string {
	if len(m.taskList) == 0 {
		return m.emptyPane(width, false, "no background tasks yet — R builds locally, p pulls a pull-request image")
	}
	lines := []string{ui.Heading.Render(ui.IconBuild + " Background tasks"), ""}
	barWidth := clampInt(width/4, 10, 26)
	for index, snapshot := range m.taskList {
		cursor := "  "
		if index == m.taskCursor {
			cursor = ui.Local.Render("▸ ")
		}
		colour := ui.Warning
		switch snapshot.State {
		case task.StateSucceeded:
			colour = ui.Success
		case task.StateFailed:
			colour = ui.Danger
		case task.StateCanceled:
			colour = ui.Faint
		}
		line := fmt.Sprintf("%s%s %s %s %s",
			cursor,
			ui.TaskBadge(snapshot.State.String(), snapshot.Kind.String()),
			ui.Bar(snapshot.Percent, barWidth, colour),
			ui.Percent(snapshot.Percent),
			ui.Body.Render(ui.Truncate(snapshot.Title, max(width-barWidth-30, 12))),
		)
		lines = append(lines, line)
		detail := snapshot.Detail
		if snapshot.Err != nil {
			detail = snapshot.Err.Error()
		}
		if detail != "" {
			lines = append(lines, ui.Help.Render("     "+ui.Truncate(detail, max(width-8, 20))+" · "+formatDuration(snapshot.Elapsed())))
		}
	}
	lines = append(lines, "", ui.Help.Render("enter watch · x cancel or clear · esc close"))
	return lipgloss.NewStyle().Width(width).Height(m.mainHeight()).Padding(0, 1).Render(strings.Join(lines, "\n"))
}

// detail describes the selected row in full, including the things that are too
// wide for a table cell: branch, provenance, and the image source Enter can run.
func (m Model) detail() string {
	if m.screen == screenInstances {
		row, found := m.selectedInstance()
		if !found {
			return ""
		}
		meta := []string{
			ui.StateBadge(row.container.State),
			ui.Dim.Render(row.container.Image),
		}
		if health := ui.HealthBadge(row.health); health != "" {
			meta = append(meta, health)
		}
		if url := row.url(); url != "" {
			meta = append(meta, ui.OK.Render(ui.IconPort+" "+url))
		}
		if row.volume != "" {
			meta = append(meta, ui.Help.Render(ui.IconData+" "+row.volume))
		}
		meta = append(meta, ui.Help.Render(row.container.Status))
		return clip(ui.Heading.Render(ui.IconDocker+" "+row.container.Name), m.width) + "\n" +
			clip(strings.Join(meta, ui.Dim.Render(" · ")), m.width)
	}

	row, found := m.selectedDev()
	if !found {
		return ""
	}
	if row.kind == rowLocal {
		meta := []string{ui.Local.Render(ui.IconLocal + " local image")}
		if row.local.Size != "" {
			meta = append(meta, ui.Help.Render(row.local.Size))
		}
		if row.local.Created != "" {
			meta = append(meta, ui.Help.Render(row.local.Created))
		}
		if row.local.Source != "" {
			meta = append(meta, ui.Help.Render(row.local.Source))
		} else {
			meta = append(meta, ui.Pending.Render("no provenance · rebuild unavailable"))
		}
		if row.local.Revision != "" {
			meta = append(meta, ui.Dim.Render(ui.IconBranch+" "+truncateRevision(row.local.Revision)))
		}
		if row.local.PRNumber > 0 {
			meta = append(meta, ui.Help.Render(fmt.Sprintf("%s PR #%d", ui.IconPR, row.local.PRNumber)))
		}
		meta = append(meta, ui.RunningBadge(row.running, row.port))
		return clip(ui.Heading.Render(ui.IconLocal+" "+row.local.Reference()), m.width) + "\n" +
			clip(strings.Join(meta, ui.Dim.Render(" · ")), m.width)
	}

	branch := row.pr.HeadRef
	if branch == "" {
		branch = "unknown branch"
	}
	meta := []string{
		ui.Help.Render(ui.IconUser + " @" + row.pr.Author),
		ui.Dim.Render(ui.IconBranch + " " + branch),
		ui.CIBadge(row.pr.CIState, true),
		ui.ImageBadge(row.image, true),
	}
	switch {
	case row.running:
		meta = append(meta, ui.Help.Render("enter stops it"))
	case row.hasCurrentLocalImage() && m.remoteImageAvailable(row):
		meta = append(meta, ui.Help.Render("enter chooses local or remote"))
	case row.hasCurrentLocalImage():
		meta = append(meta, ui.Local.Render("enter runs "+row.localReference()))
	case row.image == ui.ImageRemote:
		meta = append(meta, ui.Help.Render("enter pulls "+remoteImageFor(row)))
	case row.image == ui.ImageStale:
		meta = append(meta, ui.Pending.Render(row.localReference()+" is behind the head commit"))
	case row.image == ui.ImageMissing:
		meta = append(meta, ui.Pending.Render("R builds it locally"))
	}
	meta = append(meta, ui.RunningBadge(row.running, row.port))
	title := fmt.Sprintf("%s #%d  %s", ui.IconPR, row.pr.Number, row.pr.Title)
	return clip(ui.Heading.Render(ui.Truncate(title, max(m.width-2, 20))), m.width) + "\n" +
		clip(strings.Join(meta, ui.Dim.Render(" · ")), m.width)
}

func (m Model) imageSelectBar() string {
	row, found := m.selectedDev()
	if !found {
		return ui.Help.Render("image selection is no longer available")
	}

	title := fmt.Sprintf("%s choose image for PR #%d", ui.IconDocker, row.pr.Number)
	local := m.imageChoiceLine(imageChoiceLocal, ui.IconLocal+" local", row.localReference())
	remote := m.imageChoiceLine(imageChoiceRemote, ui.IconCloud+" remote", remoteImageFor(row))
	hint := ui.Help.Render("↑/↓ choose · enter start · esc cancel")
	return strings.Join([]string{ui.Heading.Render(title), local, remote, hint}, "\n")
}

func (m Model) imageChoiceLine(choice imageChoice, label, reference string) string {
	marker := "  "
	style := ui.Help
	if m.imageSelection.choice == choice {
		marker = "▸ "
		style = ui.Selected
	}
	return style.Render(ui.Truncate(marker+label+"  "+reference, max(m.width-2, 20)))
}

// taskTray is the always-visible one-liner for the job being followed. It uses
// the springy bubbles progress bar because a single headline bar reads better
// when it eases towards its target.
func (m Model) taskTray() string {
	if m.tasks.Running() == 0 {
		return ""
	}
	snapshot, found := m.focusedTask()
	if !found {
		return ""
	}
	detail := snapshot.Detail
	if detail == "" {
		detail = snapshot.State.String()
	}
	title := ui.Truncate(snapshot.Title, clampInt(m.width/3, 12, 40))
	head := fmt.Sprintf("%s %s %s %s",
		ui.Pending.Render(m.spinner.View()),
		ui.Body.Render(title),
		m.progress.View(),
		ui.Pending.Render(ui.Percent(snapshot.Percent)),
	)
	remaining := m.width - lipgloss.Width(head) - 1
	if remaining < 8 {
		return head
	}
	return head + " " + ui.Help.Render(ui.Truncate(detail+" · "+formatDuration(snapshot.Elapsed()), remaining))
}

var statusStyles = map[statusLevel]lipgloss.Style{
	levelInfo:  ui.Help,
	levelOK:    ui.OK,
	levelWarn:  ui.Pending,
	levelError: ui.Alert,
}

var statusIcons = map[statusLevel]string{
	levelInfo:  ui.IconNone,
	levelOK:    ui.IconPass,
	levelWarn:  ui.IconPending,
	levelError: ui.IconFail,
}

func (m Model) statusView() string {
	style, found := statusStyles[m.statusLevel]
	if !found {
		style = ui.Help
	}
	icon := statusIcons[m.statusLevel]
	text := m.status
	if icon != "" && icon != ui.IconNone {
		text = icon + " " + text
	}
	return style.Render(ui.Truncate(text, max(m.width-1, 20)))
}

// footer shows the bindings that apply to the current screen, so the hints
// never advertise a key that would do nothing here.
func (m Model) footer() string {
	primary := m.keys.DevHelp()
	if m.screen == screenInstances {
		primary = m.keys.InstanceHelp()
	}
	return clip(m.helpView.ShortHelpView(primary), m.width) + "\n" +
		clip(m.helpView.ShortHelpView(m.keys.CommonHelp()), m.width)
}
