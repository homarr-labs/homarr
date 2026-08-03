package tui

import (
	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
)

type appModel struct {
	dev           prsModel
	dashboard     dashModel
	showDashboard bool
	width         int
	height        int
}

func newAppModel(showDashboard bool) appModel {
	return appModel{dev: newPRsModel(), dashboard: newDashModel(), showDashboard: showDashboard}
}

func (m appModel) Init() tea.Cmd {
	if m.showDashboard {
		return m.dashboard.Init()
	}
	return m.dev.Init()
}

func (m appModel) canSwitch() bool {
	if m.showDashboard {
		return !m.dashboard.filtering
	}
	return !m.dev.filtering && !m.dev.pulling
}

func (m appModel) switchScreen() (tea.Model, tea.Cmd) {
	m.showDashboard = !m.showDashboard
	commands := make([]tea.Cmd, 0, 2)
	if m.width > 0 && m.height > 0 {
		resize := tea.WindowSizeMsg{Width: m.width, Height: m.height}
		if m.showDashboard {
			updated, command := m.dashboard.Update(resize)
			m.dashboard = updated.(dashModel)
			commands = append(commands, command)
		} else {
			updated, command := m.dev.Update(resize)
			m.dev = updated.(prsModel)
			commands = append(commands, command)
		}
	}
	if m.showDashboard {
		commands = append(commands, m.dashboard.Init())
	} else {
		commands = append(commands, m.dev.Init())
	}
	return m, tea.Batch(commands...)
}

func (m appModel) updateDev(msg tea.Msg) (appModel, tea.Cmd) {
	updated, command := m.dev.Update(msg)
	m.dev = updated.(prsModel)
	return m, command
}

func (m appModel) updateDashboard(msg tea.Msg) (appModel, tea.Cmd) {
	updated, command := m.dashboard.Update(msg)
	m.dashboard = updated.(dashModel)
	return m, command
}

func (m appModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if window, ok := msg.(tea.WindowSizeMsg); ok {
		m.width = window.Width
		m.height = window.Height
		m, devCommand := m.updateDev(msg)
		m, dashboardCommand := m.updateDashboard(msg)
		return m, tea.Batch(devCommand, dashboardCommand)
	}
	if key, ok := msg.(tea.KeyPressMsg); ok {
		if key.String() == "d" && m.canSwitch() {
			return m.switchScreen()
		}
		if m.showDashboard {
			return m.updateDashboard(msg)
		}
		return m.updateDev(msg)
	}

	switch msg.(type) {
	case prsLoadedMsg, imageCheckedMsg, prActionMsg, rebuildDoneMsg, runningRefreshedMsg, pullReadyMsg, pullEvent, spinner.TickMsg:
		return m.updateDev(msg)
	case tickMsg, actionMsg, rowsMsg:
		if m.showDashboard {
			return m.updateDashboard(msg)
		}
		return m, nil
	case prLogTickMsg:
		if !m.showDashboard {
			return m.updateDev(msg)
		}
		return m, nil
	case logsMsg:
		m, devCommand := m.updateDev(msg)
		m, dashboardCommand := m.updateDashboard(msg)
		return m, tea.Batch(devCommand, dashboardCommand)
	}
	if m.showDashboard {
		return m.updateDashboard(msg)
	}
	return m.updateDev(msg)
}

func (m appModel) View() tea.View {
	if m.showDashboard {
		return m.dashboard.View()
	}
	return m.dev.View()
}

func runApp(showDashboard bool) error {
	program := tea.NewProgram(newAppModel(showDashboard))
	_, err := program.Run()
	return err
}
