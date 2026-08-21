package ui

import "charm.land/bubbles/v2/key"

// KeyMap is the complete binding set. Bindings are declared once here so the
// help overlay, the footer hints, and the dispatcher can never drift apart —
// adding a key to the map is what makes it appear in the help.
type KeyMap struct {
	Up      key.Binding
	Down    key.Binding
	Top     key.Binding
	Bottom  key.Binding
	Enter   key.Binding
	Filter  key.Binding
	Refresh key.Binding
	Quit    key.Binding
	Help    key.Binding

	Dev       key.Binding
	Instances key.Binding
	Cycle     key.Binding

	Sidebar    key.Binding
	SidebarTab key.Binding
	Pin        key.Binding
	Follow     key.Binding
	PageUp     key.Binding
	PageDown   key.Binding

	Pull    key.Binding
	Build   key.Binding
	Demo    key.Binding
	Bots    key.Binding
	OpenPR  key.Binding
	OpenApp key.Binding
	Copy    key.Binding

	Stop    key.Binding
	Restart key.Binding
	Remove  key.Binding

	Manage key.Binding
	Tasks  key.Binding
	Cancel key.Binding

	ManageImage   key.Binding
	ManageData    key.Binding
	ManageBuild   key.Binding
	ManageStop    key.Binding
	ManagePrune   key.Binding
	ManageConfirm key.Binding
	ManageAbort   key.Binding
}

func DefaultKeyMap() KeyMap {
	return KeyMap{
		Up:      key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "up")),
		Down:    key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("↓/j", "down")),
		Top:     key.NewBinding(key.WithKeys("home", "g"), key.WithHelp("g", "top")),
		Bottom:  key.NewBinding(key.WithKeys("end", "G"), key.WithHelp("G", "bottom")),
		Enter:   key.NewBinding(key.WithKeys("enter", " "), key.WithHelp("enter", "start/stop")),
		Filter:  key.NewBinding(key.WithKeys("/"), key.WithHelp("/", "filter")),
		Refresh: key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "refresh")),
		Quit:    key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
		Help:    key.NewBinding(key.WithKeys("?"), key.WithHelp("?", "help")),

		Dev:       key.NewBinding(key.WithKeys("1"), key.WithHelp("1", "development")),
		Instances: key.NewBinding(key.WithKeys("2"), key.WithHelp("2", "instances")),
		Cycle:     key.NewBinding(key.WithKeys("d"), key.WithHelp("d", "switch screen")),

		Sidebar:    key.NewBinding(key.WithKeys("l"), key.WithHelp("l", "sidebar")),
		SidebarTab: key.NewBinding(key.WithKeys("tab"), key.WithHelp("tab", "logs/build/ci")),
		Pin:        key.NewBinding(key.WithKeys("L"), key.WithHelp("L", "pin logs")),
		Follow:     key.NewBinding(key.WithKeys("f"), key.WithHelp("f", "follow")),
		PageUp:     key.NewBinding(key.WithKeys("pgup"), key.WithHelp("pgup", "scroll up")),
		PageDown:   key.NewBinding(key.WithKeys("pgdown"), key.WithHelp("pgdn", "scroll down")),

		Pull:    key.NewBinding(key.WithKeys("p"), key.WithHelp("p", "pull remote")),
		Build:   key.NewBinding(key.WithKeys("R"), key.WithHelp("R", "build locally")),
		Demo:    key.NewBinding(key.WithKeys("M"), key.WithHelp("M", "demo mode")),
		Bots:    key.NewBinding(key.WithKeys("b"), key.WithHelp("b", "bot PRs")),
		OpenPR:  key.NewBinding(key.WithKeys("o"), key.WithHelp("o", "open PR")),
		OpenApp: key.NewBinding(key.WithKeys("a"), key.WithHelp("a", "open app")),
		Copy:    key.NewBinding(key.WithKeys("c"), key.WithHelp("c", "copy URL")),

		Stop:    key.NewBinding(key.WithKeys("s"), key.WithHelp("s", "stop")),
		Restart: key.NewBinding(key.WithKeys("S"), key.WithHelp("S", "restart")),
		Remove:  key.NewBinding(key.WithKeys("x"), key.WithHelp("x", "remove")),

		Manage: key.NewBinding(key.WithKeys("m"), key.WithHelp("m", "manage")),
		Tasks:  key.NewBinding(key.WithKeys("t"), key.WithHelp("t", "tasks")),
		Cancel: key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "clear filter")),

		ManageImage:   key.NewBinding(key.WithKeys("i"), key.WithHelp("i", "delete image")),
		ManageData:    key.NewBinding(key.WithKeys("d"), key.WithHelp("d", "delete data")),
		ManageBuild:   key.NewBinding(key.WithKeys("b"), key.WithHelp("b", "rebuild locally")),
		ManageStop:    key.NewBinding(key.WithKeys("c"), key.WithHelp("c", "remove container")),
		ManagePrune:   key.NewBinding(key.WithKeys("p"), key.WithHelp("p", "prune stopped")),
		ManageConfirm: key.NewBinding(key.WithKeys("y", "enter"), key.WithHelp("y", "confirm")),
		ManageAbort:   key.NewBinding(key.WithKeys("n", "esc"), key.WithHelp("n", "cancel")),
	}
}

// ShortHelp is the footer hint set, kept to what fits on two lines.
func (k KeyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Up, k.Down, k.Enter, k.Filter, k.Sidebar, k.Manage, k.Tasks, k.Cycle, k.Help, k.Quit}
}

// FullHelp is the grouped set rendered by the help overlay.
func (k KeyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Up, k.Down, k.Top, k.Bottom, k.Filter, k.Refresh},
		{k.Enter, k.Pull, k.Build, k.Demo, k.Bots},
		{k.Sidebar, k.SidebarTab, k.Pin, k.Follow, k.PageUp, k.PageDown},
		{k.Stop, k.Restart, k.Remove, k.OpenPR, k.OpenApp, k.Copy},
		{k.Manage, k.Tasks, k.Dev, k.Instances, k.Cycle, k.Quit},
	}
}

// DevHelp is the footer hint set for the development screen.
func (k KeyMap) DevHelp() []key.Binding {
	return []key.Binding{k.Enter, k.Pull, k.Build, k.Demo, k.OpenPR, k.OpenApp, k.Bots}
}

// InstanceHelp is the footer hint set for the instances screen.
func (k KeyMap) InstanceHelp() []key.Binding {
	return []key.Binding{k.Enter, k.Stop, k.Restart, k.Remove, k.Build, k.OpenApp, k.Copy}
}

// CommonHelp is the second footer line, shared by both screens.
func (k KeyMap) CommonHelp() []key.Binding {
	return []key.Binding{k.Filter, k.Cancel, k.Sidebar, k.SidebarTab, k.Pin, k.Follow, k.Manage, k.Tasks, k.Cycle, k.Refresh, k.Help, k.Quit}
}

// ManageHelp is the binding set shown while manage mode is armed.
func (k KeyMap) ManageHelp() []key.Binding {
	return []key.Binding{k.ManageBuild, k.ManageImage, k.ManageData, k.ManageStop, k.ManagePrune, k.ManageAbort}
}
