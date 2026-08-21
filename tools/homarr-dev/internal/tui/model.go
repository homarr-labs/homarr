package tui

import (
	"fmt"
	"strings"
	"time"

	"charm.land/bubbles/v2/help"
	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/progress"
	"charm.land/bubbles/v2/spinner"
	"charm.land/bubbles/v2/table"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/logs"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/task"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

type screen int

const (
	screenDev screen = iota
	screenInstances
)

// mode is the interaction state. Every key press is routed by mode first, which
// is what makes chords like `m` then `i` unambiguous: the same physical key
// means different things depending on which mode armed it.
type mode int

const (
	modeNormal mode = iota
	modeFilter
	modeManage
	modeConfirm
	modeImageSelect
	modeHelp
	modeTasks
)

type imageChoice int

const (
	imageChoiceLocal imageChoice = iota
	imageChoiceRemote
)

type imageSelection struct {
	rowKey string
	choice imageChoice
}

type statusLevel int

const (
	levelInfo statusLevel = iota
	levelOK
	levelWarn
	levelError
)

type ciCheckState struct {
	loading bool
	checks  []gh.Check
	err     error
	updated time.Time
}

// Model is the whole application. It owns the data, the two screens, the
// sidebar, and the background task manager; the panes are rendering concerns
// rather than separate Bubble Tea models, which keeps the message routing flat
// and means any key can act on any part of the state.
type Model struct {
	keys  ui.KeyMap
	tasks *task.Manager
	logs  *logs.Registry

	screen screen
	mode   mode

	prs        []gh.PR
	images     []docker.Image
	containers []docker.Container
	volumes    []docker.Volume
	tags       map[string]bool
	tagsKnown  bool

	devRows      []devRow
	devFiltered  []devRow
	instRows     []instanceRow
	instFiltered []instanceRow

	devTable  table.Model
	instTable table.Model
	filter    textinput.Model
	helpView  help.Model
	spinner   spinner.Model
	progress  progress.Model
	sidebar   sidebar
	ciChecks  map[int]ciCheckState

	taskList   []task.Snapshot
	taskStates map[int]task.State
	taskCursor int
	focusTask  int

	confirm        confirmation
	imageSelection imageSelection

	includeBots bool
	demo        bool
	loading     bool
	animating   bool
	spinning    bool
	generation  int

	status      string
	statusLevel statusLevel

	width          int
	height         int
	bodyHeight     int
	sidebarCols    int
	sidebarStacked bool
}

// New builds the application model. showInstances picks the starting screen.
func New(showInstances bool) Model {
	styles := table.DefaultStyles()
	styles.Header = styles.Header.Bold(true).Foreground(ui.Muted)
	styles.Selected = ui.Selected

	devTable := table.New(table.WithColumns(devColumns(110)), table.WithFocused(true), table.WithHeight(16), table.WithWidth(110))
	devTable.SetStyles(styles)
	instTable := table.New(table.WithColumns(instanceColumns(110)), table.WithFocused(true), table.WithHeight(16), table.WithWidth(110))
	instTable.SetStyles(styles)

	filter := textinput.New()
	filter.Prompt = "/ "
	filter.Placeholder = "filter by PR, title, author, branch, image, state, port…"
	filter.SetWidth(60)
	filterStyles := textinput.DefaultDarkStyles()
	filterStyles.Focused.Prompt = filterStyles.Focused.Prompt.Foreground(ui.Accent).Bold(true)
	filterStyles.Focused.Text = filterStyles.Focused.Text.Foreground(ui.Bright)
	filter.SetStyles(filterStyles)

	helpModel := help.New()
	helpModel.Styles = help.DefaultStyles(true)

	spin := spinner.New(spinner.WithSpinner(spinner.Dot), spinner.WithStyle(lipgloss.NewStyle().Foreground(ui.Accent)))

	start := screenDev
	if showInstances {
		start = screenInstances
	}

	return Model{
		keys:       ui.DefaultKeyMap(),
		tasks:      task.NewManager(),
		logs:       logs.NewRegistry(),
		screen:     start,
		devTable:   devTable,
		instTable:  instTable,
		filter:     filter,
		helpView:   helpModel,
		spinner:    spin,
		progress:   progress.New(progress.WithWidth(24), progress.WithoutPercentage(), progress.WithColors(ui.Accent)),
		sidebar:    newSidebar(),
		ciChecks:   make(map[int]ciCheckState),
		taskStates: make(map[int]task.State),
		loading:    true,
		// Init cannot persist state because it takes the model by value, so the
		// clocks it arms are recorded as running here instead.
		spinning:  true,
		animating: true,
		status:    "loading pull requests, images and instances…",
		width:     110,
		height:    34,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		loadAll(m.generation, m.includeBots, false),
		waitForTasks(m.tasks),
		waitForLogs(m.logs),
		tickRefresh(),
		m.spinner.Tick,
		tickFrame(),
	)
}

// animate arms the animation clocks that are needed and not already ticking.
// Both clocks stop themselves once nothing is in flight, so an idle CLI does no
// work at all, and because arming is centralised a handler cannot start a second
// competing tick chain. It mutates the receiver, so callers must hoist the call
// out of a `return m, m.animate()` — the order of evaluation there is not
// specified, and getting it wrong is exactly how a duplicate chain appears.
func (m *Model) animate() tea.Cmd {
	if !m.busy() {
		return nil
	}
	commands := make([]tea.Cmd, 0, 2)
	if !m.spinning {
		m.spinning = true
		commands = append(commands, m.spinner.Tick)
	}
	if !m.animating {
		m.animating = true
		commands = append(commands, tickFrame())
	}
	return tea.Batch(commands...)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		m.filter.SetWidth(clampInt(msg.Width-6, 20, 72))
		m.helpView.SetWidth(msg.Width)
		m.relayout()
		return m, nil

	case loadedMsg:
		if msg.generation != m.generation {
			return m, nil
		}
		return m.applyLoaded(msg)

	case containersMsg:
		if msg.generation != m.generation {
			return m, nil
		}
		sizesByName := make(map[string]string, len(m.volumes))
		for _, v := range m.volumes {
			if v.Size != "" {
				sizesByName[v.Name] = v.Size
			}
		}
		for i := range msg.volumes {
			if msg.volumes[i].Size == "" {
				msg.volumes[i].Size = sizesByName[msg.volumes[i].Name]
			}
		}
		m.containers, m.volumes = msg.containers, msg.volumes
		m.rebuildRows()
		m.relayout()
		cmd := m.refreshSidebar()
		return m, tea.Batch(cmd, m.syncLogStreams())

	case tasksChangedMsg:
		return m.applyTasks()

	case logsChangedMsg:
		cmd := m.refreshSidebar()
		return m, tea.Batch(cmd, waitForLogs(m.logs))

	case ciChecksMsg:
		m.ciChecks[msg.pr] = ciCheckState{
			loading: false,
			checks:  msg.checks,
			err:     msg.err,
			updated: time.Now(),
		}
		cmd := m.refreshSidebar()
		for _, c := range msg.checks {
			if c.IsPending() {
				pollCmd := tea.Tick(6*time.Second, func(t time.Time) tea.Msg {
					return pollCIChecksMsg{pr: msg.pr}
				})
				return m, tea.Batch(cmd, pollCmd)
			}
		}
		return m, cmd

	case pollCIChecksMsg:
		if m.sidebar.source == sourceCI && m.selectedPRNumber() == msg.pr {
			return m, fetchCIChecks(msg.pr, true)
		}
		return m, nil

	case refreshMsg:
		return m, tea.Batch(tickRefresh(), loadContainers(m.generation))

	case frameMsg:
		cmd := m.refreshSidebar()
		if !m.busy() {
			m.animating = false
			return m, cmd
		}
		return m, tea.Batch(cmd, tickFrame())

	case spinner.TickMsg:
		if !m.busy() {
			m.spinning = false
			return m, nil
		}
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd

	case statusMsg:
		m.status, m.statusLevel = msg.text, msg.level
		return m, nil

	case progress.FrameMsg:
		var cmd tea.Cmd
		m.progress, cmd = m.progress.Update(msg)
		return m, cmd

	case tea.KeyPressMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

func (m Model) busy() bool { return m.loading || m.tasks.Running() > 0 }

// applyLoaded folds a full refresh into the model, preserving the selected row
// so a background refresh never moves the cursor under the user's hands.
func (m Model) applyLoaded(msg loadedMsg) (Model, tea.Cmd) {
	m.loading = false
	if msg.prErr == nil {
		m.prs = msg.prs
	}
	if msg.imageErr == nil {
		m.images = msg.images
	}
	if msg.tagErr == nil && msg.tags != nil {
		m.tags, m.tagsKnown = msg.tags, true
	}
	m.containers, m.volumes = msg.containers, msg.volumes

	switch {
	case msg.prErr != nil && msg.imageErr != nil:
		m.status, m.statusLevel = "cannot reach GitHub or Docker: "+msg.prErr.Error(), levelError
	case msg.prErr != nil:
		m.status, m.statusLevel = "pull requests unavailable: "+msg.prErr.Error(), levelWarn
	case msg.imageErr != nil:
		m.status, m.statusLevel = "local images unavailable: "+msg.imageErr.Error(), levelWarn
	case msg.tagErr != nil:
		m.status, m.statusLevel = "GHCR tag listing unavailable: "+msg.tagErr.Error(), levelWarn
	}
	m.rebuildRows()
	if msg.prErr == nil && msg.imageErr == nil && msg.tagErr == nil {
		m.status, m.statusLevel = m.summary(), levelInfo
	}
	m.relayout()
	cmd := m.refreshSidebar()
	return m, tea.Batch(cmd, m.syncLogStreams())
}

func (m Model) summary() string {
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
	return fmt.Sprintf("%d pull requests · %d local images · %d running", remote, local, running)
}

// applyTasks reacts to background progress. Finished jobs trigger a data
// refresh so the table reflects the new image or container without the user
// having to press r.
func (m Model) applyTasks() (Model, tea.Cmd) {
	m.taskList = m.tasks.Snapshots()
	commands := []tea.Cmd{waitForTasks(m.tasks)}

	for _, snapshot := range m.taskList {
		previous, seen := m.taskStates[snapshot.ID]
		if seen && previous == snapshot.State {
			continue
		}
		m.taskStates[snapshot.ID] = snapshot.State
		if !snapshot.State.Done() {
			continue
		}
		switch snapshot.State {
		case task.StateSucceeded:
			m.status, m.statusLevel = snapshot.Title+" finished", levelOK
			if m.sidebar.source == sourceTask && (m.focusTask == 0 || m.focusTask == snapshot.ID) {
				m.sidebar.source = sourceLogs
				m.focusTask = 0
			}
		case task.StateFailed:
			m.status, m.statusLevel = snapshot.Title+" failed: "+errorText(snapshot.Err), levelError
		case task.StateCanceled:
			m.status, m.statusLevel = snapshot.Title+" canceled", levelWarn
			if m.sidebar.source == sourceTask && (m.focusTask == 0 || m.focusTask == snapshot.ID) {
				m.sidebar.source = sourceLogs
				m.focusTask = 0
			}
		}
		m.generation++
		commands = append(commands, loadAll(m.generation, m.includeBots, true))
	}

	if m.tasks.Running() == 0 && m.sidebar.source == sourceTask && m.focusTask == 0 {
		m.sidebar.source = sourceLogs
	}

	if focused, found := m.focusedTask(); found {
		if command := m.progress.SetPercent(focused.Percent); command != nil {
			commands = append(commands, command)
		}
	}
	if clocks := m.animate(); clocks != nil {
		commands = append(commands, clocks)
	}
	m.relayout()
	if cmd := m.refreshSidebar(); cmd != nil {
		commands = append(commands, cmd)
	}
	return m, tea.Batch(commands...)
}

func errorText(err error) string {
	if err == nil {
		return "unknown error"
	}
	return err.Error()
}

// focusedTask is the job the tray and sidebar follow: the one the user last
// started, falling back to the newest running job.
func (m Model) focusedTask() (task.Snapshot, bool) {
	if m.focusTask > 0 {
		if snapshot, found := m.tasks.Snapshot(m.focusTask); found {
			return snapshot, true
		}
	}
	for index := len(m.taskList) - 1; index >= 0; index-- {
		if m.taskList[index].State == task.StateRunning {
			return m.taskList[index], true
		}
	}
	if len(m.taskList) > 0 {
		return m.taskList[len(m.taskList)-1], true
	}
	return task.Snapshot{}, false
}

// rebuildRows recomputes both screens from the current data, keeping the
// selection anchored to the same logical row.
func (m *Model) rebuildRows() {
	devKey := m.selectedDevKey()
	instKey := m.selectedInstanceName()

	m.devRows = applyContainers(buildDevRows(m.prs, m.images, m.tags, m.tagsKnown), m.containers)
	m.instRows = buildInstanceRows(m.containers, m.volumes)
	m.applyFilter()

	m.restoreDevSelection(devKey)
	m.restoreInstanceSelection(instKey)
}

func (m *Model) applyFilter() {
	query := strings.ToLower(strings.TrimSpace(m.filter.Value()))

	m.devFiltered = m.devFiltered[:0]
	for _, row := range m.devRows {
		if query == "" || strings.Contains(row.searchTerms(), query) {
			m.devFiltered = append(m.devFiltered, row)
		}
	}
	devCols := devColumns(m.tableWidth())
	m.devTable.SetColumns(devCols)
	m.devTable.SetRows(devTableRows(m.devFiltered, devCols))
	clampCursor(&m.devTable, len(m.devFiltered))

	m.instFiltered = m.instFiltered[:0]
	for _, row := range m.instRows {
		if query == "" || strings.Contains(row.searchTerms(), query) {
			m.instFiltered = append(m.instFiltered, row)
		}
	}
	instCols := instanceColumns(m.tableWidth())
	m.instTable.SetColumns(instCols)
	m.instTable.SetRows(instanceTableRows(m.instFiltered, instCols))
	clampCursor(&m.instTable, len(m.instFiltered))
}

// clampCursor keeps the selection inside the row set. SetCursor clamps against
// the rows the table currently holds, so calling it while the table is empty
// parks the cursor at -1; this restores it as soon as rows exist again.
func clampCursor(model *table.Model, length int) {
	if length == 0 {
		return
	}
	if cursor := model.Cursor(); cursor < 0 || cursor >= length {
		model.SetCursor(clampInt(cursor, 0, length-1))
	}
}

func (m Model) selectedDevKey() string {
	if row, found := m.selectedDev(); found {
		return row.key()
	}
	return ""
}

func (m *Model) restoreDevSelection(key string) {
	if key == "" {
		return
	}
	for index, row := range m.devFiltered {
		if row.key() == key {
			m.devTable.SetCursor(index)
			return
		}
	}
}

func (m Model) selectedInstanceName() string {
	if row, found := m.selectedInstance(); found {
		return row.container.Name
	}
	return ""
}

func (m *Model) restoreInstanceSelection(name string) {
	if name == "" {
		return
	}
	for index, row := range m.instFiltered {
		if row.container.Name == name {
			m.instTable.SetCursor(index)
			return
		}
	}
}

func (m Model) selectedDev() (devRow, bool) {
	index := m.devTable.Cursor()
	if index < 0 || index >= len(m.devFiltered) {
		return devRow{}, false
	}
	return m.devFiltered[index], true
}

func (m Model) selectedInstance() (instanceRow, bool) {
	index := m.instTable.Cursor()
	if index < 0 || index >= len(m.instFiltered) {
		return instanceRow{}, false
	}
	return m.instFiltered[index], true
}

// The sidebar splits the screen side by side when there is room, and stacks
// under the table when there is not. Hiding it outright on a narrow terminal
// would make live logs unavailable exactly where they are most needed.
const sidebarSplitWidth = 96

func (m Model) tableWidth() int {
	if m.sidebarCols > 0 {
		return max(m.width-m.sidebarCols-1, 40)
	}
	return max(m.width, 40)
}

// mainHeight is the number of lines the table or an overlay may occupy.
func (m Model) mainHeight() int {
	if m.sidebarStacked {
		return max(m.bodyHeight-m.sidebar.height, 4)
	}
	return m.bodyHeight
}

func (m Model) detailVisible() bool {
	if m.screen == screenInstances {
		_, found := m.selectedInstance()
		return found
	}
	_, found := m.selectedDev()
	return found
}

// relayout recomputes every component's size from the terminal dimensions. The
// reserved count has to match what View actually emits line for line, or the
// bottom of the interface is pushed off screen.
func (m *Model) relayout() {
	reserved := 2 // header + blank
	if m.mode == modeFilter || m.filter.Value() != "" {
		reserved += 2
	}
	if m.detailVisible() {
		reserved += 3 // blank + title + meta
	}
	if m.tasks.Running() > 0 {
		reserved += 1
	}
	switch m.mode {
	case modeManage:
		reserved += 2
	case modeConfirm:
		reserved += 3
	case modeImageSelect:
		reserved += 5
	}
	if m.status != "" {
		reserved += 2
	}
	reserved += 3 // blank + two footer lines

	m.bodyHeight = max(m.height-reserved, 6)

	m.sidebarCols = 0
	m.sidebarStacked = false
	if m.sidebarRelevant() {
		if m.width >= sidebarSplitWidth {
			m.sidebarCols = clampInt(m.width*2/5, 34, 72)
			m.sidebar.resize(m.sidebarCols, m.bodyHeight)
		} else {
			m.sidebarStacked = true
			m.sidebar.resize(m.width, clampInt(m.bodyHeight/2, 6, 14))
		}
	}

	// A table renders a header line plus one line per row, so its height is
	// one less than the space it is given.
	tableHeight := max(m.mainHeight()-1, 3)
	m.devTable.SetWidth(m.tableWidth())
	m.devTable.SetHeight(tableHeight)
	m.instTable.SetWidth(m.tableWidth())
	m.instTable.SetHeight(tableHeight)
	m.applyFilter()
	m.progress.SetWidth(clampInt(m.width/4, 12, 32))
}

// syncLogStreams drops followers whose container no longer exists. Attaching is
// deliberately left to refreshSidebar: following every container eagerly would
// thrash against the stream cap on a machine running more instances than the
// cap allows, killing and restarting `docker logs` every refresh.
func (m Model) syncLogStreams() tea.Cmd {
	live := make([]string, 0, len(m.containers))
	for _, container := range m.containers {
		live = append(live, container.Name)
	}
	m.logs.Retain(live)
	return nil
}

// refreshSidebar recomputes panel content from whichever source is selected.
func (m *Model) refreshSidebar() tea.Cmd {
	if !m.sidebarRelevant() {
		return nil
	}
	if m.sidebar.source == sourceTask {
		snapshot, found := m.focusedTask()
		if !found {
			m.sidebar.title, m.sidebar.subtitle = "tasks", "no background work"
			m.sidebar.setContent(ui.Help.Render("Press R to build locally or p to pull a pull-request image."))
			return nil
		}
		title, subtitle, content := renderTaskSnapshot(snapshot, m.sidebar.textWidth())
		m.sidebar.title, m.sidebar.subtitle = title, subtitle
		m.sidebar.setContent(content)
		return nil
	}

	if m.sidebar.source == sourceCI {
		pr := m.selectedPRNumber()
		state, found := m.ciChecks[pr]
		var cmd tea.Cmd
		if pr > 0 && (!found || (!state.loading && time.Since(state.updated) > 30*time.Second)) {
			m.ciChecks[pr] = ciCheckState{loading: true, checks: state.checks, err: state.err, updated: state.updated}
			cmd = fetchCIChecks(pr, false)
		}
		title, subtitle, content := renderCISnapshot(pr, state.checks, state.loading, state.err, m.sidebar.textWidth())
		m.sidebar.title, m.sidebar.subtitle = title, subtitle
		m.sidebar.setContent(content)
		return cmd
	}

	name := m.sidebar.pinned
	if name == "" {
		name = m.logTarget()
	}
	if name == "" {
		return nil
	}
	// Attaching here is what starts the stream, and it is a no-op once one
	// exists. A stopped container is still worth following: `docker logs`
	// replays why it died and then ends the stream.
	m.logs.Attach(name)
	snapshot, attached := m.logs.Snapshot(name)
	title, subtitle, content := renderLogSnapshot(name, snapshot, attached)
	if m.sidebar.pinned != "" {
		subtitle = ui.IconPin + " pinned · " + subtitle
	}
	m.sidebar.title, m.sidebar.subtitle = title, subtitle
	m.sidebar.setContent(content)
	return nil
}

// logTarget is the container whose logs the sidebar shows by default.
func (m Model) logTarget() string {
	if m.screen == screenInstances {
		if row, found := m.selectedInstance(); found {
			return row.container.Name
		}
		return ""
	}
	if row, found := m.selectedDev(); found {
		if row.state != "" || row.running {
			return row.containerName()
		}
	}
	return ""
}

func (m Model) selectedPRNumber() int {
	if m.screen == screenInstances {
		if row, found := m.selectedInstance(); found {
			return row.prNumber()
		}
		return 0
	}
	if row, found := m.selectedDev(); found {
		if row.kind == rowRemote {
			return row.pr.Number
		}
		if row.local.PRNumber > 0 {
			return row.local.PRNumber
		}
	}
	return 0
}

func (m Model) containerExists(name string) bool {
	if name == "" {
		return false
	}
	for _, c := range m.containers {
		if c.Name == name {
			return true
		}
	}
	return false
}

// sidebarRelevant determines whether the right-hand panel has meaningful
// content to display (active tasks, CI checks on a PR, pinned logs, or an existing container).
func (m Model) sidebarRelevant() bool {
	if !m.sidebar.visible {
		return false
	}
	if m.sidebar.source == sourceTask {
		_, found := m.focusedTask()
		return found || m.tasks.Running() > 0
	}
	if m.sidebar.source == sourceCI {
		return m.selectedPRNumber() > 0
	}
	if m.sidebar.pinned != "" && m.containerExists(m.sidebar.pinned) {
		return true
	}
	return m.logTarget() != ""
}

func formatDuration(d time.Duration) string {
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%.0fs", d.Seconds())
	case d < time.Hour:
		return fmt.Sprintf("%dm%02ds", int(d.Minutes()), int(d.Seconds())%60)
	default:
		return fmt.Sprintf("%dh%02dm", int(d.Hours()), int(d.Minutes())%60)
	}
}

func shortHelp(bindings []key.Binding, model help.Model) string {
	return model.ShortHelpView(bindings)
}
