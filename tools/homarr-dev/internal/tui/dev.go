package tui

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"charm.land/bubbles/v2/progress"
	"charm.land/bubbles/v2/spinner"
	"charm.land/bubbles/v2/table"
	"charm.land/bubbles/v2/textinput"
	"charm.land/bubbles/v2/viewport"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/platform"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/run"
)

const (
	ciOK     = "✓"
	ciFail   = "✗"
	ciPend   = "●"
	ciNone   = "–"
	imgYes   = "✓"
	imgNo    = "…"
	imgCheck = "?"
	imgError = "!"
	imgLocal = "◆"
	runMark  = "▶"
	idleMark = " "
)

var (
	legendCIYes    = lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render(ciOK)
	legendCINo     = lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render(ciFail)
	legendCIPend   = lipgloss.NewStyle().Foreground(lipgloss.Color("214")).Render(ciPend)
	legendNone     = lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render(ciNone)
	legendImageYes = lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render(imgYes)
	legendImageNo  = lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render(imgNo)
	legendLocal    = lipgloss.NewStyle().Foreground(lipgloss.Color("81")).Render(imgLocal)
)

type prRow struct {
	kind       string
	pr         gh.PR
	local      docker.Image
	imageState string
	running    bool
	port       string
}

func (row prRow) hasCurrentLocalImage() bool {
	return row.kind == "remote" && row.local.Tag != "" && row.pr.HeadSHA != "" && row.local.Revision == row.pr.HeadSHA
}

type prsModel struct {
	table         table.Model
	filter        textinput.Model
	filtering     bool
	pullView      viewport.Model
	pulling       bool
	pullLines     []string
	pullLayers    map[string]string
	pullProgress  progress.Model
	pullCanceled  bool
	pullEvents    <-chan pullEvent
	pullPlan      *run.Plan
	pullCancel    context.CancelFunc
	rebuilding    bool
	rebuildCancel context.CancelFunc
	logs          viewport.Model
	showLogs      bool
	followLogs    bool
	logsName      string
	spinner       spinner.Model
	rows          []prRow
	loading       bool
	status        string
	includeBots   bool
	demo          bool
	width         int
	height        int
	imageQueue    []int
	imageActive   int
	imageGen      int
}

type prsLoadedMsg struct {
	prs     []gh.PR
	images  []docker.Image
	prErr   error
	imgErr  error
	refresh bool
}
type imageCheckedMsg struct {
	number int
	exists bool
	err    error
	gen    int
}
type prActionMsg struct {
	text string
}
type rebuildDoneMsg struct {
	image    docker.Image
	err      error
	canceled bool
	action   string
}
type runningRefreshedMsg struct {
	rows       []prRow
	generation int
}
type pullReadyMsg struct{}
type prLogTickMsg struct{}
type pullEvent struct {
	line string
	done bool
	err  error
}

type outputTail struct {
	data []byte
}

func (tail *outputTail) Write(data []byte) (int, error) {
	const limit = 32 * 1024
	tail.data = append(tail.data, data...)
	if len(tail.data) > limit {
		tail.data = tail.data[len(tail.data)-limit:]
	}
	return len(data), nil
}

func (tail *outputTail) lastLine() string {
	lines := strings.FieldsFunc(string(tail.data), func(char rune) bool { return char == '\n' || char == '\r' })
	if len(lines) == 0 {
		return ""
	}
	return strings.TrimSpace(lines[len(lines)-1])
}

func splitDockerProgress(data []byte, atEOF bool) (advance int, token []byte, err error) {
	for i, b := range data {
		if b == '\n' || b == '\r' {
			return i + 1, data[:i], nil
		}
	}
	if atEOF && len(data) > 0 {
		return len(data), data, nil
	}
	return 0, nil, nil
}

func startPull(ctx context.Context, cmd *exec.Cmd, events chan<- pullEvent) tea.Cmd {
	return func() tea.Msg {
		reader, writer, err := os.Pipe()
		if err != nil {
			return pullEvent{done: true, err: err}
		}
		cmd.Stdout = writer
		cmd.Stderr = writer
		if err := cmd.Start(); err != nil {
			_ = reader.Close()
			_ = writer.Close()
			return pullEvent{done: true, err: err}
		}
		_ = writer.Close()
		go func() {
			defer close(events)
			defer reader.Close()
			scanner := bufio.NewScanner(reader)
			scanner.Split(splitDockerProgress)
			lastLine := ""
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line != "" {
					lastLine = line
					if ctx.Err() == nil && len(events) < cap(events)-1 {
						events <- pullEvent{line: line}
					}
				}
			}
			err := cmd.Wait()
			if err == nil {
				err = scanner.Err()
			} else {
				err = commandErrorWithDetail(err, lastLine)
			}
			events <- pullEvent{done: true, err: err}
		}()
		return pullReadyMsg{}
	}
}

func commandErrorWithDetail(err error, lastLine string) error {
	if lastLine == "" {
		return err
	}
	return fmt.Errorf("%w: %s", err, lastLine)
}

func waitPull(events <-chan pullEvent) tea.Cmd {
	return func() tea.Msg {
		event, ok := <-events
		if !ok {
			return nil
		}
		return event
	}
}

func prLogTick() tea.Cmd {
	return tea.Tick(2*time.Second, func(time.Time) tea.Msg { return prLogTickMsg{} })
}

func loadDev(includeBots, refresh bool) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		var prs []gh.PR
		var prErr error
		if refresh {
			prs, prErr = gh.RefreshPRs(ctx, 50, includeBots)
		} else {
			prs, prErr = gh.ListPRs(ctx, 50, includeBots)
		}
		images, imgErr := docker.ListLocalImages(ctx)
		return prsLoadedMsg{prs: prs, images: images, prErr: prErr, imgErr: imgErr, refresh: refresh}
	}
}

func checkImage(number, generation int) tea.Cmd {
	return func() tea.Msg {
		img := fmt.Sprintf("ghcr.io/homarr-labs/homarr-test:pr-%d", number)
		exists, err := docker.CheckImage(img)
		return imageCheckedMsg{number: number, exists: exists, err: err, gen: generation}
	}
}

func (m *prsModel) startImageChecks() tea.Cmd {
	const concurrency = 6
	cmds := make([]tea.Cmd, 0, concurrency)
	for m.imageActive < concurrency && len(m.imageQueue) > 0 {
		number := m.imageQueue[0]
		m.imageQueue = m.imageQueue[1:]
		m.imageActive++
		cmds = append(cmds, checkImage(number, m.imageGen))
	}
	return tea.Batch(cmds...)
}

func ciIcon(state string) string {
	switch state {
	case "SUCCESS":
		return ciOK
	case "FAILURE":
		return ciFail
	case "PENDING":
		return ciPend
	default:
		return ciNone
	}
}

func buildTableRows(rows []prRow) []table.Row {
	out := make([]table.Row, 0, len(rows))
	for _, r := range rows {
		mark := idleMark
		port := ""
		if r.running {
			mark = runMark
			port = r.port
		}
		img := imgCheck
		switch r.imageState {
		case "yes":
			img = imgYes
		case "no":
			img = imgNo
		case "error":
			img = imgError
		}
		if r.hasCurrentLocalImage() {
			img = imgLocal
		}
		source := "remote"
		ref := fmt.Sprint(r.pr.Number)
		title := r.pr.Title
		author := r.pr.Author
		ci := ciIcon(r.pr.CIState)
		if r.kind == "local" {
			source = "local"
			ref = r.local.Tag
			title = r.local.Reference()
			author = "untracked build"
			if r.local.Source != "" {
				author = filepath.Base(r.local.Source)
			}
			ci = ciNone
		} else if r.pr.IsDraft {
			title = "DRAFT · " + title
		}
		if len([]rune(title)) > 44 {
			title = string([]rune(title)[:43]) + "…"
		}
		out = append(out, table.Row{
			mark,
			source,
			ref,
			title,
			author,
			ci,
			img,
			port,
		})
	}
	return out
}

func developmentRows(prs []gh.PR, images []docker.Image, imageStates map[int]string) ([]prRow, []int) {
	rows := make([]prRow, 0, len(prs)+len(images))
	prIndexes := make(map[int]int, len(prs))
	queue := make([]int, 0, len(prs))
	for _, pr := range prs {
		imageState := imageStates[pr.Number]
		prIndexes[pr.Number] = len(rows)
		rows = append(rows, prRow{kind: "remote", pr: pr, imageState: imageState})
	}
	for _, image := range images {
		if index, exists := prIndexes[image.PRNumber]; exists && image.Revision != "" && image.Revision == rows[index].pr.HeadSHA {
			if rows[index].local.Tag == "" {
				rows[index].local = image
			}
			continue
		}
		rows = append(rows, prRow{kind: "local", local: image, imageState: "yes"})
	}
	for index := range rows {
		if rows[index].kind != "remote" || rows[index].imageState != "" {
			continue
		}
		if rows[index].hasCurrentLocalImage() {
			rows[index].imageState = "unchecked"
			continue
		}
		rows[index].imageState = "checking"
		queue = append(queue, rows[index].pr.Number)
	}
	return rows, queue
}

func prColumns(width int) []table.Column {
	authorWidth := 16
	portWidth := 6
	if width < 90 {
		authorWidth = 0
	}
	if width < 72 {
		portWidth = 0
	}
	titleWidth := max(min(width-60, 45), 18)
	return []table.Column{
		{Title: "", Width: 2},
		{Title: "SOURCE", Width: 8},
		{Title: "REF", Width: 12},
		{Title: "TITLE", Width: titleWidth},
		{Title: "AUTHOR", Width: authorWidth},
		{Title: "CI", Width: 3},
		{Title: "IMAGE", Width: 5},
		{Title: "PORT", Width: portWidth},
	}
}

func newPRsModel() prsModel {
	t := table.New(
		table.WithColumns(prColumns(110)),
		table.WithFocused(true),
		table.WithHeight(18),
		table.WithWidth(110),
	)
	s := table.DefaultStyles()
	s.Header = s.Header.Bold(true)
	s.Selected = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("230")).Background(lipgloss.Color("57"))
	t.SetStyles(s)

	sp := spinner.New()
	sp.Spinner = spinner.Dot
	filter := textinput.New()
	filter.Prompt = "/ "
	filter.Placeholder = "filter source, PR, image, title, author, branch, CI, port…"
	filter.SetWidth(65)
	filterStyles := textinput.DefaultDarkStyles()
	filterStyles.Focused.Prompt = filterStyles.Focused.Prompt.Foreground(lipgloss.Color("212")).Bold(true)
	filterStyles.Focused.Text = filterStyles.Focused.Text.Foreground(lipgloss.Color("229"))
	filter.SetStyles(filterStyles)
	pullView := viewport.New(viewport.WithWidth(110), viewport.WithHeight(7))
	pullView.SoftWrap = true
	pullView.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("250"))
	pullProgress := progress.New(progress.WithWidth(60), progress.WithColors(lipgloss.Color("212")))
	logs := viewport.New(viewport.WithWidth(110), viewport.WithHeight(7))
	logs.SoftWrap = true
	logs.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("250"))

	return prsModel{table: t, filter: filter, pullView: pullView, pullLayers: make(map[string]string), pullProgress: pullProgress, logs: logs, followLogs: true, spinner: sp, loading: true, status: "loading development images…", width: 110, height: 32}
}

func (m *prsModel) layout() {
	reserved := 12
	if m.filtering || m.filter.Value() != "" {
		reserved += 2
	}
	if m.pulling {
		reserved += 9
	}
	if m.showLogs {
		reserved += 9
	}
	m.table.SetHeight(max(m.height-reserved, 6))
	m.pullView.SetWidth(max(m.width-2, 20))
	m.pullView.SetHeight(7)
	m.pullProgress.SetWidth(max(min(m.width-12, 70), 20))
	m.logs.SetWidth(max(m.width-2, 20))
	m.logs.SetHeight(7)
}

func (m *prsModel) applyFilter() {
	rendered := buildTableRows(m.rows)
	query := strings.ToLower(strings.TrimSpace(m.filter.Value()))
	if query == "" {
		m.table.SetRows(rendered)
		return
	}
	rows := make([]table.Row, 0, len(rendered))
	for i, row := range m.rows {
		terms := []string{
			row.kind,
			fmt.Sprint(row.pr.Number),
			fmt.Sprintf("#%d", row.pr.Number),
			fmt.Sprintf("pr-%d", row.pr.Number),
			row.pr.Title,
			row.pr.Author,
			row.pr.HeadRef,
			row.pr.CIState,
			row.imageState,
			row.port,
			row.local.Tag,
			row.local.Source,
			row.local.Revision,
		}
		if row.pr.IsDraft {
			terms = append(terms, "draft")
		}
		if row.running {
			terms = append(terms, "running started")
		}
		if strings.Contains(strings.ToLower(strings.Join(terms, " ")), query) {
			rows = append(rows, rendered[i])
		}
	}
	m.table.SetRows(rows)
}

func (m prsModel) selectedRow() *prRow {
	selected := m.table.SelectedRow()
	if len(selected) < 3 {
		return nil
	}
	for i := range m.rows {
		if m.rows[i].kind == selected[1] && ((selected[1] == "remote" && fmt.Sprint(m.rows[i].pr.Number) == selected[2]) || (selected[1] == "local" && m.rows[i].local.Tag == selected[2])) {
			return &m.rows[i]
		}
	}
	return nil
}

func (m prsModel) selectedPR() *prRow {
	row := m.selectedRow()
	if row == nil || row.kind != "remote" {
		return nil
	}
	return row
}

func localBuildForRow(row prRow) (docker.Image, string, string) {
	if row.kind == "remote" {
		image := docker.Image{Tag: fmt.Sprintf("pr-%d", row.pr.Number), PRNumber: row.pr.Number}
		return image, "built", fmt.Sprintf("building PR #%d locally as %s…", row.pr.Number, image.Reference())
	}
	return row.local, "rebuilt", "rebuilding " + row.local.Reference() + "…"
}

func localPRPlan(row prRow, demo bool, findPort func(int) int) (*run.Plan, error) {
	plan, err := run.BuildPlan(run.Options{Context: context.Background(), Tag: row.local.Tag, Demo: demo, FindPort: findPort})
	if err != nil {
		return nil, err
	}
	plan.Name = fmt.Sprintf("homarr_pr_%d", row.pr.Number)
	plan.Volume = fmt.Sprintf("homarr_pr_%d_data", row.pr.Number)
	plan.Label = fmt.Sprintf("PR #%d · local %s", row.pr.Number, truncateText(row.pr.HeadSHA, 12))
	plan.PRNumber = row.pr.Number
	return plan, nil
}

func (m *prsModel) refreshSelectedLogs() tea.Cmd {
	row := m.selectedRow()
	if row == nil || !row.running {
		m.logsName = ""
		m.logs.SetContent("selected image is not running")
		return nil
	}
	name := fmt.Sprintf("homarr_pr_%d", row.pr.Number)
	if row.kind == "local" {
		name = "homarr_" + row.local.Tag
	}
	if name != m.logsName {
		m.logsName = name
		m.logs.SetContent("loading logs…")
	}
	return fetchLogs(name)
}

func (m *prsModel) beginPull(row prRow) tea.Cmd {
	plan, err := run.BuildPlan(run.Options{Context: context.Background(), PR: row.pr.Number, Demo: m.demo})
	if err != nil {
		m.status = err.Error()
		return nil
	}
	if row.running && row.port != "" {
		if port, err := strconv.Atoi(row.port); err == nil {
			plan.HostPort = port
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	events := make(chan pullEvent, 128)
	m.pulling = true
	m.pullPlan = plan
	m.pullCancel = cancel
	m.pullEvents = events
	m.pullLines = nil
	m.pullLayers = make(map[string]string)
	m.pullCanceled = false
	m.pullView.SetContent("")
	m.showLogs = false
	m.logsName = ""
	if row.running {
		m.status = fmt.Sprintf("pulling latest image and redeploying PR #%d…", row.pr.Number)
	} else {
		m.status = fmt.Sprintf("pulling latest image for PR #%d…", row.pr.Number)
	}
	m.layout()
	return tea.Batch(startPull(ctx, docker.PullCommandContext(ctx, plan.Image, plan.Platform), events), m.spinner.Tick)
}

func (m *prsModel) appendPullLine(line string) {
	const retainedLines = 40
	m.pullLines = append(m.pullLines, line)
	if len(m.pullLines) > retainedLines {
		m.pullLines = m.pullLines[len(m.pullLines)-retainedLines:]
	}
	m.pullView.SetContent(strings.Join(m.pullLines, "\n"))
	m.pullView.GotoBottom()
	parts := strings.SplitN(line, ":", 2)
	if len(parts) == 2 {
		layer := strings.TrimSpace(parts[0])
		if len(layer) == 12 {
			m.pullLayers[layer] = strings.TrimSpace(parts[1])
		}
	}
}

func (m prsModel) pullCompletion() (complete, total int, percent float64) {
	for _, state := range m.pullLayers {
		total++
		lower := strings.ToLower(state)
		if strings.Contains(lower, "pull complete") || strings.Contains(lower, "already exists") {
			complete++
		}
	}
	if total > 0 {
		percent = float64(complete) / float64(total)
	}
	return complete, total, percent
}

func (m prsModel) Init() tea.Cmd {
	return tea.Batch(loadDev(m.includeBots, false), m.spinner.Tick)
}

func refreshRunning(rows []prRow, generation int) tea.Cmd {
	return func() tea.Msg {
		containers, _ := docker.List()
		updated := append([]prRow(nil), rows...)
		for index, row := range updated {
			name := fmt.Sprintf("homarr_pr_%d", row.pr.Number)
			if row.kind == "local" {
				name = "homarr_" + row.local.Tag
			}
			row.running = false
			row.port = ""
			for _, container := range containers {
				if container.Name == name && container.Running() {
					row.running = true
					row.port = container.HostPort()
				}
			}
			updated[index] = row
		}
		return runningRefreshedMsg{rows: updated, generation: generation}
	}
}

func (m prsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.table.SetColumns(prColumns(msg.Width))
		m.table.SetWidth(msg.Width)
		m.filter.SetWidth(max(min(msg.Width-4, 75), 10))
		m.layout()
		return m, nil
	case prsLoadedMsg:
		if msg.prErr != nil && msg.imgErr != nil {
			m.loading = false
			m.status = "failed to load development images: " + msg.prErr.Error() + "; " + msg.imgErr.Error()
			return m, nil
		}
		m.loading = false
		m.status = fmt.Sprintf("%d remote PRs · %d local images", len(msg.prs), len(msg.images))
		if msg.prErr != nil {
			m.status = "remote PRs unavailable: " + msg.prErr.Error()
		} else if msg.imgErr != nil {
			m.status = "local images unavailable: " + msg.imgErr.Error()
		}
		imageStates := make(map[int]string, len(m.rows))
		if !msg.refresh || msg.prErr != nil {
			for _, row := range m.rows {
				if row.kind == "remote" && (row.imageState == "yes" || row.imageState == "no") {
					imageStates[row.pr.Number] = row.imageState
				}
			}
		}
		m.rows, m.imageQueue = developmentRows(msg.prs, msg.images, imageStates)
		m.imageGen++
		m.imageActive = 0
		m.applyFilter()
		return m, tea.Batch(m.startImageChecks(), refreshRunning(m.rows, m.imageGen))
	case imageCheckedMsg:
		if msg.gen != m.imageGen {
			return m, nil
		}
		m.imageActive--
		for i, r := range m.rows {
			if r.pr.Number == msg.number {
				if msg.err != nil {
					m.rows[i].imageState = "error"
					m.status = msg.err.Error()
				} else if msg.exists {
					m.rows[i].imageState = "yes"
				} else {
					m.rows[i].imageState = "no"
				}
			}
		}
		m.applyFilter()
		return m, m.startImageChecks()
	case prActionMsg:
		m.status = msg.text
		return m, refreshRunning(m.rows, m.imageGen)
	case runningRefreshedMsg:
		if msg.generation != m.imageGen {
			return m, nil
		}
		m.rows = msg.rows
		m.applyFilter()
		return m, m.refreshSelectedLogs()
	case rebuildDoneMsg:
		m.rebuilding = false
		if m.rebuildCancel != nil {
			m.rebuildCancel()
		}
		m.rebuildCancel = nil
		m.loading = true
		action := msg.action
		if action == "" {
			action = "rebuilt"
		}
		if msg.canceled {
			m.status = action + " canceled"
		} else if msg.err != nil {
			m.status = action + " failed: " + msg.err.Error()
		} else {
			m.status = action + " " + msg.image.Reference()
		}
		return m, tea.Batch(loadDev(m.includeBots, true), m.spinner.Tick)
	case logsMsg:
		if !m.showLogs || msg.name == "" || msg.name != m.logsName {
			return m, nil
		}
		m.logs.SetContent(strings.TrimRight(msg.content, "\n"))
		if m.followLogs {
			m.logs.GotoBottom()
		}
		return m, nil
	case prLogTickMsg:
		if !m.showLogs {
			return m, nil
		}
		return m, tea.Batch(m.refreshSelectedLogs(), prLogTick())
	case pullReadyMsg:
		return m, waitPull(m.pullEvents)
	case pullEvent:
		if !msg.done {
			m.appendPullLine(msg.line)
			return m, waitPull(m.pullEvents)
		}
		m.pulling = false
		m.pullEvents = nil
		if m.pullCancel != nil {
			m.pullCancel()
		}
		m.pullCancel = nil
		m.layout()
		if msg.err != nil {
			if m.pullCanceled {
				m.status = "pull canceled"
			} else {
				m.status = "pull failed: " + msg.err.Error()
			}
			m.pullCanceled = false
			m.pullPlan = nil
			return m, nil
		}
		m.pullCanceled = false
		plan := m.pullPlan
		m.pullPlan = nil
		if plan == nil {
			return m, nil
		}
		for i := range m.rows {
			if m.rows[i].pr.Number == plan.PRNumber {
				m.rows[i].imageState = "yes"
			}
		}
		m.applyFilter()
		m.status = fmt.Sprintf("starting PR #%d…", plan.PRNumber)
		return m, func() tea.Msg {
			plan.Pull = false
			if err := run.StartDetached(plan); err != nil {
				return prActionMsg{"start failed: " + err.Error()}
			}
			return prActionMsg{fmt.Sprintf("started PR #%d → http://localhost:%d", plan.PRNumber, plan.HostPort)}
		}
	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		if m.loading || m.pulling || m.rebuilding {
			return m, cmd
		}
		return m, nil
	case tea.KeyPressMsg:
		if m.rebuilding {
			switch msg.String() {
			case "q", "ctrl+c", "esc":
				if m.rebuildCancel != nil {
					m.rebuildCancel()
				}
				m.status = "canceling rebuild…"
				return m, nil
			}
		}
		if m.pulling {
			switch msg.String() {
			case "q", "ctrl+c", "esc":
				if m.pullCancel != nil {
					m.pullCanceled = true
					m.pullCancel()
				}
				m.status = "canceling pull…"
			}
			return m, nil
		}
		if m.filtering {
			switch msg.Key().Code {
			case tea.KeyEscape:
				m.filtering = false
				m.filter.Reset()
				m.filter.Blur()
				m.applyFilter()
				m.layout()
				return m, nil
			case tea.KeyEnter:
				m.filtering = false
				m.filter.Blur()
				m.layout()
				return m, nil
			}
			var cmd tea.Cmd
			m.filter, cmd = m.filter.Update(msg)
			m.applyFilter()
			return m, cmd
		}
		switch msg.Key().Code {
		case tea.KeyUp, tea.KeyKpUp:
			m.table.MoveUp(1)
			return m, m.refreshSelectedLogs()
		case tea.KeyDown, tea.KeyKpDown:
			m.table.MoveDown(1)
			return m, m.refreshSelectedLogs()
		case tea.KeyPgUp, tea.KeyKpPgUp:
			if m.showLogs {
				m.followLogs = false
				m.logs.PageUp()
			}
			return m, nil
		case tea.KeyPgDown, tea.KeyKpPgDown:
			if m.showLogs {
				m.logs.PageDown()
				m.followLogs = m.logs.AtBottom()
			}
			return m, nil
		}
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		case "enter", "space":
			row := m.selectedRow()
			if row == nil {
				return m, nil
			}
			name := fmt.Sprintf("homarr_pr_%d", row.pr.Number)
			label := fmt.Sprintf("PR #%d", row.pr.Number)
			if row.kind == "local" {
				name = "homarr_" + row.local.Tag
				label = row.local.Reference()
			}
			if row.running {
				return m, func() tea.Msg {
					if err := docker.Stop(name); err != nil {
						return prActionMsg{"stop failed: " + err.Error()}
					}
					return prActionMsg{"stopped " + label}
				}
			}
			if row.kind == "remote" {
				if row.hasCurrentLocalImage() {
					plan, err := localPRPlan(*row, m.demo, nil)
					if err != nil {
						m.status = err.Error()
						return m, nil
					}
					m.status = fmt.Sprintf("starting PR #%d from local build…", row.pr.Number)
					return m, func() tea.Msg {
						if err := run.StartDetached(plan); err != nil {
							return prActionMsg{"start failed: " + err.Error()}
						}
						return prActionMsg{fmt.Sprintf("started PR #%d from local build → http://localhost:%d", row.pr.Number, plan.HostPort)}
					}
				}
				if row.imageState == "checking" {
					m.status = fmt.Sprintf("PR #%d image check is still in progress", row.pr.Number)
					return m, nil
				}
				return m, m.beginPull(*row)
			}
			plan, err := run.BuildPlan(run.Options{Context: context.Background(), Tag: row.local.Tag, Demo: m.demo})
			if err != nil {
				m.status = err.Error()
				return m, nil
			}
			return m, func() tea.Msg {
				if err := run.StartDetached(plan); err != nil {
					return prActionMsg{"start failed: " + err.Error()}
				}
				return prActionMsg{fmt.Sprintf("started %s → http://localhost:%d", label, plan.HostPort)}
			}
		case "r":
			m.loading = true
			m.status = "refreshing…"
			return m, tea.Batch(loadDev(m.includeBots, true), m.spinner.Tick)
		case "/":
			m.filtering = true
			m.layout()
			return m, m.filter.Focus()
		case "o":
			row := m.selectedPR()
			if row != nil {
				if err := platform.OpenURL(fmt.Sprintf("https://github.com/homarr-labs/homarr/pull/%d", row.pr.Number)); err != nil {
					m.status = "open failed: " + err.Error()
				}
			}
		case "a":
			row := m.selectedRow()
			if row != nil && row.running && row.port != "" {
				if err := platform.OpenURL("http://localhost:" + row.port); err != nil {
					m.status = "open failed: " + err.Error()
				}
			} else {
				m.status = "selected image is not running"
			}
		case "l":
			m.showLogs = !m.showLogs
			m.layout()
			if m.showLogs {
				m.followLogs = true
				return m, tea.Batch(m.refreshSelectedLogs(), prLogTick())
			}
			return m, nil
		case "f":
			if m.showLogs {
				m.followLogs = !m.followLogs
				if m.followLogs {
					m.logs.GotoBottom()
				}
			} else {
				m.status = "open logs with l first"
			}
		case "p":
			row := m.selectedPR()
			if row != nil {
				return m, m.beginPull(*row)
			} else {
				m.status = "pull is only available for remote PR images"
			}
		case "R":
			if m.rebuilding {
				m.status = "a local build is already running"
				return m, nil
			}
			row := m.selectedRow()
			if row == nil {
				m.status = "select an image to build"
				return m, nil
			}
			image, action, status := localBuildForRow(*row)
			ctx, cancel := context.WithCancel(context.Background())
			m.rebuilding = true
			m.rebuildCancel = cancel
			m.status = status
			rebuild := func() tea.Msg {
				output := &outputTail{}
				err := run.RebuildImageContext(ctx, image, output, output)
				if err != nil {
					err = commandErrorWithDetail(err, output.lastLine())
				}
				return rebuildDoneMsg{image: image, err: err, canceled: ctx.Err() != nil, action: action}
			}
			return m, tea.Batch(rebuild, m.spinner.Tick)
		case "m":
			m.demo = !m.demo
			if m.demo {
				m.status = "demo mode enabled for the next launch"
			} else {
				m.status = "demo mode disabled"
			}
		case "k":
			m.table.MoveUp(1)
			return m, m.refreshSelectedLogs()
		case "j":
			m.table.MoveDown(1)
			return m, m.refreshSelectedLogs()
		case "b":
			m.includeBots = !m.includeBots
			m.loading = true
			if m.includeBots {
				m.status = "refreshing (bots shown)…"
			} else {
				m.status = "refreshing (bots hidden)…"
			}
			return m, tea.Batch(loadDev(m.includeBots, false), m.spinner.Tick)
		}
	}
	var cmd tea.Cmd
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

func coloredCI(state string) string {
	switch state {
	case "SUCCESS":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("✓ success")
	case "FAILURE":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render("✗ failed")
	case "PENDING":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("214")).Render("● pending")
	default:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render("– no checks")
	}
}

func coloredImage(state string) string {
	switch state {
	case "yes":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("✓ available")
	case "no":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render("… not built")
	case "error":
		return lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render("! check failed")
	default:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("214")).Render("? checking")
	}
}

func (m prsModel) selectedDetailView() string {
	row := m.selectedRow()
	if row == nil {
		return ""
	}
	if row.kind == "local" {
		source := row.local.Source
		if source == "" {
			source = "unknown source · rebuild unavailable"
		}
		meta := "local · " + source
		if row.local.Revision != "" {
			meta += " · " + truncateText(row.local.Revision, 12)
		}
		if row.local.PRNumber > 0 {
			meta += fmt.Sprintf(" · PR #%d", row.local.PRNumber)
		}
		if row.running {
			meta += " · " + lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("running on :"+row.port)
		}
		title := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("229")).Render(row.local.Reference())
		return title + "\n" + meta
	}
	branch := row.pr.HeadRef
	if branch == "" {
		branch = "unknown branch"
	}
	runSource := "run remote"
	if row.hasCurrentLocalImage() {
		runSource = "run local " + truncateText(row.local.Revision, 12)
	}
	meta := "@" + row.pr.Author + " · " + branch + " · CI " + coloredCI(row.pr.CIState) + " · " + runSource
	if !row.hasCurrentLocalImage() {
		meta += " · GHCR " + coloredImage(row.imageState)
	}
	if row.running {
		meta += " · " + lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("running on :"+row.port)
	}
	title := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("229")).Render(fmt.Sprintf("#%d  %s", row.pr.Number, row.pr.Title))
	return title + "\n" + meta
}

func truncateText(value string, length int) string {
	runes := []rune(value)
	if len(runes) <= length {
		return value
	}
	return string(runes[:length])
}

func (m prsModel) View() tea.View {
	var b strings.Builder
	header := titleStyle.Render("🦞 homarr development")
	if m.loading || m.rebuilding {
		header += " " + m.spinner.View()
	}
	running := 0
	remote := 0
	local := 0
	for _, row := range m.rows {
		if row.kind == "local" {
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
	header += "  " + helpStyle.Render(fmt.Sprintf("%d remote · %d local · %d running · %d shown", remote, local, running, len(m.table.Rows())))
	if m.demo {
		header += "  " + lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("214")).Render("DEMO")
	}
	b.WriteString(header + "\n\n")
	if m.filtering || m.filter.Value() != "" {
		b.WriteString(m.filter.View() + "\n\n")
	}
	if len(m.table.Rows()) > 0 {
		b.WriteString(m.table.View() + "\n")
	} else if len(m.rows) > 0 {
		b.WriteString(helpStyle.Render("no development images match "+m.filter.Value()) + "\n")
	}
	if detail := m.selectedDetailView(); detail != "" {
		b.WriteString("\n" + detail + "\n")
	}
	if m.pulling {
		label := "Pulling image"
		if m.pullPlan != nil {
			label = fmt.Sprintf("Pulling PR #%d", m.pullPlan.PRNumber)
		}
		b.WriteString("\n" + lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("214")).Render(m.spinner.View()+" "+label) + "\n")
		complete, total, percent := m.pullCompletion()
		if total > 0 {
			b.WriteString(m.pullProgress.ViewAs(percent) + " " + helpStyle.Render(fmt.Sprintf("%d/%d layers", complete, total)) + "\n")
		}
		b.WriteString(m.pullView.View() + "\n")
		b.WriteString(helpStyle.Render("q/esc cancel download") + "\n")
	}
	if m.showLogs {
		mode := "paused"
		if m.followLogs {
			mode = "following"
		}
		name := m.logsName
		if name == "" {
			name = "selected image"
		}
		b.WriteString("\n" + logHeadSt.Render("── logs: "+name+" ("+mode+") ──") + "\n")
		b.WriteString(m.logs.View() + "\n")
	}
	if m.status != "" {
		statusStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
		lower := strings.ToLower(m.status)
		if strings.Contains(lower, "fail") || strings.Contains(lower, "error") || strings.Contains(lower, "cannot") {
			statusStyle = statusStyle.Foreground(lipgloss.Color("196"))
		} else if m.pulling || m.rebuilding || strings.Contains(lower, "starting") || strings.Contains(lower, "refreshing") {
			statusStyle = statusStyle.Foreground(lipgloss.Color("214"))
		}
		b.WriteString("\n" + statusStyle.Render(m.status))
	}
	botState := "bots hidden"
	if m.includeBots {
		botState = "bots shown"
	}
	if !m.pulling {
		b.WriteString("\n\n" + helpStyle.Render("/ filter · ↑/↓ select · enter start/stop · R build locally · p pull remote · m demo · o PR · a app"))
		b.WriteString("\n" + helpStyle.Render("b "+botState+" · r refresh · d instances · q quit"))
		b.WriteString("\n" + helpStyle.Render("l toggle logs · f follow · pgup/pgdn scroll"))
		if m.rebuilding {
			b.WriteString("\n" + helpStyle.Render("local build running in background · q/esc cancel build"))
		}
	}
	b.WriteString("\n" + helpStyle.Render("SOURCE: local Docker / remote GHCR · CI: "+legendCIYes+" pass "+legendCINo+" fail "+legendCIPend+" pending "+legendNone+" none · IMAGE: "+legendLocal+" local "+legendImageYes+" remote "+legendImageNo+" not built"))
	v := tea.NewView(b.String())
	v.AltScreen = true
	v.WindowTitle = "🦞 Homarr Development"
	return v
}

func RunDev() error {
	return runApp(false)
}
