package tui

import (
	"fmt"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

type manageAction int

const (
	actionNone manageAction = iota
	actionBuild
	actionDeleteImage
	actionDeleteData
	actionRemoveContainer
	actionPrune
)

// confirmation is the armed destructive action awaiting a yes or no.
type confirmation struct {
	action  manageAction
	subject target
	prompt  string
	detail  string
}

// handleManageKey is the second half of the `m` chord. Non-destructive actions
// run immediately; anything that deletes state goes through a confirmation, so
// a mistyped chord cannot destroy an instance.
func (m Model) handleManageKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	if key.Matches(msg, m.keys.Quit) {
		m.tasks.CancelAll()
		m.logs.Close()
		return m, tea.Quit
	}
	if key.Matches(msg, m.keys.ManageAbort) || key.Matches(msg, m.keys.Manage) {
		m.mode = modeNormal
		m.status, m.statusLevel = "manage mode closed", levelInfo
		m.relayout()
		return m, nil
	}

	subject, found := m.currentTarget()
	if !found {
		m.mode = modeNormal
		m.relayout()
		return m, nil
	}

	switch {
	case key.Matches(msg, m.keys.ManageBuild):
		m.mode = modeNormal
		m.relayout()
		return m.buildLocally(subject)

	case key.Matches(msg, m.keys.ManageImage):
		if subject.localImage == "" {
			m.status, m.statusLevel = subject.label+" has no local image to delete", levelWarn
			return m, nil
		}
		return m.arm(actionDeleteImage, subject)

	case key.Matches(msg, m.keys.ManageData):
		if subject.volume == "" {
			m.status, m.statusLevel = subject.label+" has no data volume to delete", levelWarn
			return m, nil
		}
		return m.arm(actionDeleteData, subject)

	case key.Matches(msg, m.keys.ManageStop):
		return m.arm(actionRemoveContainer, subject)

	case key.Matches(msg, m.keys.ManagePrune):
		return m.arm(actionPrune, subject)
	}
	return m, nil
}

// arm moves into the confirmation mode with a prompt describing exactly what is
// about to be destroyed.
func (m Model) arm(action manageAction, subject target) (Model, tea.Cmd) {
	confirm := confirmation{action: action, subject: subject}
	switch action {
	case actionDeleteImage:
		confirm.prompt = "Delete image " + subject.localImage + "?"
		confirm.detail = "The image is removed from Docker. Rebuild it later with R."
	case actionDeleteData:
		confirm.prompt = "Delete data volume " + subject.volume + "?"
		confirm.detail = "Boards, users and integrations in this instance are lost. The container is removed first."
		if size := m.volumeSize(subject.volume); size != "" {
			confirm.detail += " (" + size + " reclaimed)"
		}
	case actionRemoveContainer:
		confirm.prompt = "Remove container " + subject.container + "?"
		confirm.detail = "The container is force-removed. Its data volume is kept."
	case actionPrune:
		stopped := 0
		for _, container := range m.containers {
			if !container.Running() {
				stopped++
			}
		}
		confirm.prompt = fmt.Sprintf("Remove %d stopped Homarr containers?", stopped)
		confirm.detail = "Data volumes are kept."
	default:
		return m, nil
	}
	m.confirm = confirm
	m.mode = modeConfirm
	// The confirmation is the only prompt that should be speaking.
	m.status = ""
	m.relayout()
	return m, nil
}

func (m Model) volumeSize(name string) string {
	for _, volume := range m.volumes {
		if volume.Name == name {
			return volume.Size
		}
	}
	return ""
}

func (m Model) handleConfirmKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.ManageAbort):
		m.mode = modeNormal
		m.confirm = confirmation{}
		m.status, m.statusLevel = "canceled", levelInfo
		m.relayout()
		return m, nil

	case key.Matches(msg, m.keys.ManageConfirm):
		confirm := m.confirm
		m.mode = modeNormal
		m.confirm = confirmation{}
		m.relayout()
		switch confirm.action {
		case actionDeleteImage:
			return m.deleteImage(confirm.subject.localImage)
		case actionDeleteData:
			return m.deleteData(confirm.subject)
		case actionRemoveContainer:
			return m.removeContainer(confirm.subject.container)
		case actionPrune:
			return m.pruneStopped()
		}
		return m, nil
	}
	return m, nil
}

// manageBar is the hint strip shown while the chord is armed.
func (m Model) manageBar() string {
	subject, found := m.currentTarget()
	label := "selection"
	if found {
		label = subject.label
	}
	return clip(ui.ModeBadge("MANAGE", ui.Warning)+" "+
		ui.Body.Render(label)+"  "+
		m.helpView.ShortHelpView(m.keys.ManageHelp()), m.width)
}

// confirmBar is the destructive-action prompt. It is deliberately loud.
func (m Model) confirmBar() string {
	prompt := ui.ModeBadge("CONFIRM", ui.Danger) + " " + ui.Heading.Render(m.confirm.prompt)
	detail := ui.Help.Render(m.confirm.detail + "   y confirm · n cancel")
	return clip(prompt, m.width) + "\n" + clip(detail, m.width)
}
