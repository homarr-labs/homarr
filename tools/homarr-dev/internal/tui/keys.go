package tui

import (
	"fmt"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/table"
	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
)

// handleKey routes by mode. Modes are what let one letter mean several things
// without ambiguity: `d` switches screens normally and deletes data once manage
// mode is armed, and neither reading can leak into the other.
func (m Model) handleKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch m.mode {
	case modeFilter:
		return m.handleFilterKey(msg)
	case modeConfirm:
		return m.handleConfirmKey(msg)
	case modeImageSelect:
		return m.handleImageSelectKey(msg)
	case modeManage:
		return m.handleManageKey(msg)
	case modeHelp:
		return m.handleOverlayKey(msg)
	case modeTasks:
		return m.handleTasksKey(msg)
	default:
		return m.handleNormalKey(msg)
	}
}

func (m Model) handleImageSelectKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.Cancel):
		m.mode = modeNormal
		m.imageSelection = imageSelection{}
		m.status, m.statusLevel = "launch canceled", levelInfo
		m.relayout()
		return m, nil

	case key.Matches(msg, m.keys.Up), key.Matches(msg, m.keys.Down):
		if m.imageSelection.choice == imageChoiceLocal {
			m.imageSelection.choice = imageChoiceRemote
		} else {
			m.imageSelection.choice = imageChoiceLocal
		}
		return m, nil

	case key.Matches(msg, m.keys.Enter):
		selection := m.imageSelection
		row, found := m.selectedDev()
		m.mode = modeNormal
		m.imageSelection = imageSelection{}
		if !found || row.key() != selection.rowKey {
			m.status, m.statusLevel = "image selection expired; choose a row again", levelWarn
			m.relayout()
			return m, nil
		}
		m.relayout()
		if selection.choice == imageChoiceRemote {
			return m.deployRemotePR(row)
		}
		return m.startLocalPR(row)
	}
	return m, nil
}

func (m Model) handleNormalKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.Quit):
		m.tasks.CancelAll()
		m.logs.Close()
		return m, tea.Quit

	case key.Matches(msg, m.keys.Help):
		m.mode = modeHelp
		m.relayout()
		return m, nil

	case key.Matches(msg, m.keys.Tasks):
		m.mode = modeTasks
		m.taskList = m.tasks.Snapshots()
		m.taskCursor = max(len(m.taskList)-1, 0)
		m.relayout()
		return m, nil

	case key.Matches(msg, m.keys.Manage):
		subject, found := m.currentTarget()
		if !found {
			m.status, m.statusLevel = "nothing selected to manage", levelWarn
			return m, nil
		}
		m.mode = modeManage
		m.status, m.statusLevel = "manage "+subject.label, levelInfo
		m.relayout()
		return m, nil

	case key.Matches(msg, m.keys.Filter):
		m.mode = modeFilter
		m.relayout()
		return m, m.filter.Focus()

	// A submitted filter keeps narrowing the table after the input loses focus,
	// so escape has to be able to clear it from normal mode too.
	case key.Matches(msg, m.keys.Cancel):
		if m.filter.Value() == "" {
			return m, nil
		}
		m.filter.Reset()
		m.applyFilter()
		m.relayout()
		cmd := m.refreshSidebar()
		m.status, m.statusLevel = "filter cleared", levelInfo
		return m, cmd

	case key.Matches(msg, m.keys.Refresh):
		m.generation++
		m.loading = true
		m.status, m.statusLevel = "refreshing…", levelInfo
		clocks := m.animate()
		return m, tea.Batch(loadAll(m.generation, m.includeBots, true), clocks)

	case key.Matches(msg, m.keys.Dev):
		return m.switchScreen(screenDev)
	case key.Matches(msg, m.keys.Instances):
		return m.switchScreen(screenInstances)
	case key.Matches(msg, m.keys.Cycle):
		if m.screen == screenDev {
			return m.switchScreen(screenInstances)
		}
		return m.switchScreen(screenDev)

	case key.Matches(msg, m.keys.Sidebar):
		m.sidebar.visible = !m.sidebar.visible
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd

	case key.Matches(msg, m.keys.SidebarTab):
		switch m.sidebar.source {
		case sourceLogs:
			if m.tasks.Running() > 0 || len(m.taskList) > 0 {
				m.sidebar.source = sourceTask
			} else {
				m.sidebar.source = sourceCI
			}
		case sourceTask:
			m.sidebar.source = sourceCI
		case sourceCI:
			m.sidebar.source = sourceLogs
		default:
			m.sidebar.source = sourceLogs
		}
		m.sidebar.visible = true
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd

	case key.Matches(msg, m.keys.Pin):
		return m.togglePin()

	case key.Matches(msg, m.keys.Follow):
		m.sidebar.toggleFollow()
		return m, nil

	case key.Matches(msg, m.keys.PageUp):
		m.sidebar.pageUp()
		return m, nil
	case key.Matches(msg, m.keys.PageDown):
		m.sidebar.pageDown()
		return m, nil

	case key.Matches(msg, m.keys.Enter):
		return m.primaryAction()

	case key.Matches(msg, m.keys.Build):
		subject, found := m.currentTarget()
		if !found {
			return m, nil
		}
		return m.buildLocally(subject)

	case key.Matches(msg, m.keys.Up):
		return m.moveSelection(-1)
	case key.Matches(msg, m.keys.Down):
		return m.moveSelection(1)
	case key.Matches(msg, m.keys.Top):
		m.activeTable().GotoTop()
		if m.tasks.Running() == 0 && m.sidebar.source == sourceTask && m.focusTask == 0 {
			m.sidebar.source = sourceLogs
		}
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd
	case key.Matches(msg, m.keys.Bottom):
		m.activeTable().GotoBottom()
		if m.tasks.Running() == 0 && m.sidebar.source == sourceTask && m.focusTask == 0 {
			m.sidebar.source = sourceLogs
		}
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd

	case key.Matches(msg, m.keys.OpenApp):
		return m.openApp()
	}

	if m.screen == screenDev {
		return m.handleDevKey(msg)
	}
	return m.handleInstanceKey(msg)
}

func (m Model) handleDevKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.Pull):
		row, found := m.selectedDev()
		if !found {
			return m, nil
		}
		return m.pullRemote(row)

	case key.Matches(msg, m.keys.Demo):
		m.demo = !m.demo
		if m.demo {
			m.status, m.statusLevel = "demo mode on — the next launch mocks integrations", levelWarn
			return m, nil
		}
		m.status, m.statusLevel = "demo mode off", levelInfo
		return m, nil

	case key.Matches(msg, m.keys.Bots):
		m.includeBots = !m.includeBots
		m.generation++
		m.loading = true
		if m.includeBots {
			m.status, m.statusLevel = "including bot pull requests…", levelInfo
		} else {
			m.status, m.statusLevel = "hiding bot pull requests…", levelInfo
		}
		clocks := m.animate()
		return m, tea.Batch(loadAll(m.generation, m.includeBots, false), clocks)

	case key.Matches(msg, m.keys.OpenPR):
		return m.openPullRequest()
	}
	return m, nil
}

func (m Model) handleInstanceKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	row, found := m.selectedInstance()
	if !found {
		return m, nil
	}
	switch {
	case key.Matches(msg, m.keys.Stop):
		return m.stopContainer(row.container.Name)
	case key.Matches(msg, m.keys.Restart):
		return m.restartContainer(row.container.Name)
	case key.Matches(msg, m.keys.Remove):
		return m.arm(actionRemoveContainer, m.instanceTarget(row))
	case key.Matches(msg, m.keys.Copy):
		return m.copyURL()
	case key.Matches(msg, m.keys.OpenPR):
		if row.container.Running() && row.container.HostPort() != "" {
			return m.openApp()
		}
		if number := row.prNumber(); number > 0 {
			return m.openPullRequestNumber(number)
		}
		return m.openApp()
	}
	return m, nil
}

func (m Model) handleFilterKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.Key().Code {
	case tea.KeyEscape:
		m.mode = modeNormal
		m.filter.Reset()
		m.filter.Blur()
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd
	case tea.KeyEnter:
		m.mode = modeNormal
		m.filter.Blur()
		m.relayout()
		return m, nil
	}
	var command tea.Cmd
	m.filter, command = m.filter.Update(msg)
	m.applyFilter()
	cmd := m.refreshSidebar()
	return m, tea.Batch(command, cmd)
}

func (m Model) handleOverlayKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	if key.Matches(msg, m.keys.Quit) {
		m.tasks.CancelAll()
		m.logs.Close()
		return m, tea.Quit
	}
	m.mode = modeNormal
	m.relayout()
	return m, nil
}

func (m Model) handleTasksKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.Quit), key.Matches(msg, m.keys.Cancel), key.Matches(msg, m.keys.Tasks):
		m.mode = modeNormal
		m.relayout()
		if key.Matches(msg, m.keys.Quit) {
			m.tasks.CancelAll()
			m.logs.Close()
			return m, tea.Quit
		}
		return m, nil

	case key.Matches(msg, m.keys.Up):
		m.taskCursor = max(m.taskCursor-1, 0)
		return m, nil
	case key.Matches(msg, m.keys.Down):
		m.taskCursor = min(m.taskCursor+1, max(len(m.taskList)-1, 0))
		return m, nil

	case key.Matches(msg, m.keys.Enter):
		if snapshot, found := m.taskAt(m.taskCursor); found {
			m.mode = modeNormal
			return m.focusOn(snapshot.ID, snapshot.Title)
		}
		return m, nil

	case key.Matches(msg, m.keys.Remove):
		if snapshot, found := m.taskAt(m.taskCursor); found && snapshot.Cancellable {
			m.tasks.Cancel(snapshot.ID)
			m.status, m.statusLevel = "canceling "+snapshot.Title+"…", levelWarn
			return m, nil
		}
		m.tasks.Prune()
		m.taskList = m.tasks.Snapshots()
		m.taskCursor = 0
		m.status, m.statusLevel = "cleared finished tasks", levelInfo
		return m, nil
	}
	return m, nil
}

func (m Model) taskAt(index int) (task.Snapshot, bool) {
	if index < 0 || index >= len(m.taskList) {
		return task.Snapshot{}, false
	}
	return m.taskList[index], true
}

func (m *Model) activeTable() *table.Model {
	if m.screen == screenInstances {
		return &m.instTable
	}
	return &m.devTable
}

func (m Model) moveSelection(delta int) (Model, tea.Cmd) {
	if delta < 0 {
		m.activeTable().MoveUp(-delta)
	} else {
		m.activeTable().MoveDown(delta)
	}
	if m.tasks.Running() == 0 && m.sidebar.source == sourceTask && m.focusTask == 0 {
		m.sidebar.source = sourceLogs
	}
	cmd := m.refreshSidebar()
	return m, cmd
}

func (m Model) switchScreen(next screen) (Model, tea.Cmd) {
	if m.screen == next {
		return m, nil
	}
	m.screen = next
	if m.tasks.Running() == 0 && m.sidebar.source == sourceTask && m.focusTask == 0 {
		m.sidebar.source = sourceLogs
	}
	m.relayout()
	cmd := m.refreshSidebar()
	return m, cmd
}

// togglePin locks the sidebar onto one container so the user can browse other
// rows while still watching the instance they care about.
func (m Model) togglePin() (Model, tea.Cmd) {
	if m.sidebar.pinned != "" {
		m.status, m.statusLevel = "unpinned "+m.sidebar.pinned, levelInfo
		m.sidebar.pinned = ""
		m.relayout()
		cmd := m.refreshSidebar()
		return m, cmd
	}
	name := m.logTarget()
	if name == "" {
		m.status, m.statusLevel = "select a container to pin its logs", levelWarn
		return m, nil
	}
	m.sidebar.pinned = name
	m.sidebar.source = sourceLogs
	m.sidebar.visible = true
	m.status, m.statusLevel = fmt.Sprintf("pinned logs of %s", name), levelOK
	m.relayout()
	cmd := m.refreshSidebar()
	return m, cmd
}
