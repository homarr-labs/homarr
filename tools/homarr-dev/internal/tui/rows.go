package tui

import (
	"fmt"
	"path/filepath"
	"strings"

	"charm.land/bubbles/v2/table"
	"charm.land/lipgloss/v2"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/registry"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

type rowKind int

const (
	rowRemote rowKind = iota
	rowLocal
)

// devRow is one line of the development screen: either an open pull request,
// or a local image that no open pull request accounts for.
type devRow struct {
	kind    rowKind
	pr      gh.PR
	local   docker.Image
	image   ui.ImageState
	running bool
	port    string
	state   string
}

// hasCurrentLocalImage reports whether a local build matches the pull request's
// current head. Only an exact revision match counts: an image built from an
// older commit is a different thing and stays on its own row rather than
// silently shadowing the pull request.
func (r devRow) hasCurrentLocalImage() bool {
	return r.kind == rowRemote && r.local.Tag != "" && r.pr.HeadSHA != "" && r.local.Revision == r.pr.HeadSHA
}

func (r devRow) containerName() string {
	if r.kind == rowLocal {
		return "homarr_" + r.local.Tag
	}
	return fmt.Sprintf("homarr_pr_%d", r.pr.Number)
}

func (r devRow) volumeName() string { return r.containerName() + "_data" }

// localReference is the local image this row would run, if one exists.
func (r devRow) localReference() string {
	if r.local.Tag == "" {
		return ""
	}
	return r.local.Reference()
}

func (r devRow) remoteReference() string {
	if r.kind != rowRemote {
		return ""
	}
	return registry.ImageReference(r.pr.Number)
}

func (r devRow) label() string {
	if r.kind == rowLocal {
		return r.local.Reference()
	}
	return fmt.Sprintf("PR #%d", r.pr.Number)
}

func (r devRow) key() string {
	if r.kind == rowLocal {
		return "local:" + r.local.Tag
	}
	return fmt.Sprintf("pr:%d", r.pr.Number)
}

// searchTerms is everything the filter matches against for this row.
func (r devRow) searchTerms() string {
	terms := []string{
		r.pr.Title, r.pr.Author, r.pr.HeadRef, r.pr.CIState,
		r.local.Tag, r.local.Source, r.local.Revision, r.port,
	}
	if r.kind == rowRemote {
		terms = append(terms, "remote", fmt.Sprint(r.pr.Number), fmt.Sprintf("#%d pr-%d", r.pr.Number, r.pr.Number))
		if r.pr.IsDraft {
			terms = append(terms, "draft")
		}
	} else {
		terms = append(terms, "local", r.local.Reference())
	}
	if r.hasCurrentLocalImage() {
		terms = append(terms, "local built")
	}
	if r.running {
		terms = append(terms, "running started up")
	}
	return strings.ToLower(strings.Join(terms, " "))
}

// buildDevRows merges open pull requests with local images into a single list.
// A local image folds into its pull request only when the revisions match, so
// the row exposes both sources when the registry image is available too.
func buildDevRows(prs []gh.PR, images []docker.Image, tags map[string]bool, tagsKnown bool) []devRow {
	rows := make([]devRow, 0, len(prs)+len(images))
	indexByPR := make(map[int]int, len(prs))
	for _, pr := range prs {
		indexByPR[pr.Number] = len(rows)
		rows = append(rows, devRow{kind: rowRemote, pr: pr})
	}
	for _, image := range images {
		index, matched := indexByPR[image.PRNumber]
		if matched && image.Revision != "" && image.Revision == rows[index].pr.HeadSHA {
			if rows[index].local.Tag == "" {
				rows[index].local = image
				continue
			}
		}
		rows = append(rows, devRow{kind: rowLocal, local: image, image: ui.ImageLocal})
	}
	for index := range rows {
		if rows[index].kind != rowRemote {
			continue
		}
		switch {
		case rows[index].hasCurrentLocalImage():
			rows[index].image = ui.ImageLocal
		case rows[index].local.Tag != "":
			rows[index].image = ui.ImageStale
		case !tagsKnown:
			rows[index].image = ui.ImageChecking
		case registry.HasPRImage(tags, rows[index].pr.Number):
			rows[index].image = ui.ImageRemote
		default:
			rows[index].image = ui.ImageMissing
		}
	}
	return rows
}

// applyContainers annotates rows with the state of their container.
func applyContainers(rows []devRow, containers []docker.Container) []devRow {
	byName := make(map[string]docker.Container, len(containers))
	for _, container := range containers {
		byName[container.Name] = container
	}
	for index := range rows {
		container, found := byName[rows[index].containerName()]
		rows[index].running = found && container.Running()
		rows[index].state = ""
		rows[index].port = ""
		if found {
			rows[index].state = container.State
			rows[index].port = container.HostPort()
		}
	}
	return rows
}

// flexWidth hands the leftover table width to one column. Every visible column
// costs its own width plus the two padding cells the table adds, and columns set
// to zero are skipped entirely, which is how the narrow layouts drop them.
func flexWidth(columns []table.Column, available, index, minimum int) int {
	used := 0
	for position, column := range columns {
		if position == index || column.Width <= 0 {
			continue
		}
		used += column.Width + 2
	}
	return max(available-used-2, minimum)
}

func devColumns(width int) []table.Column {
	author, port := 15, 6
	switch {
	case width < 68:
		author, port = 0, 0
	case width < 92:
		author = 0
	case width < 108:
		author = 10
	}
	columns := []table.Column{
		{Title: "", Width: 1},
		{Title: "SOURCE", Width: 6},
		{Title: "REF", Width: 9},
		{Title: "TITLE", Width: 0},
		{Title: "AUTHOR", Width: author},
		{Title: "IMG", Width: 3},
		{Title: "CI", Width: 2},
		{Title: "PORT", Width: port},
	}
	columns[3].Width = flexWidth(columns, width, 3, 18)
	return columns
}

func devTableRows(rows []devRow, columns []table.Column) []table.Row {
	titleWidth, authorWidth := columns[3].Width, columns[4].Width
	rendered := make([]table.Row, 0, len(rows))
	for _, row := range rows {
		marker := " "
		switch {
		case row.running:
			marker = ui.OK.Render(ui.IconRunning)
		case row.state != "":
			marker = ui.Dim.Render(ui.IconStopped)
		}

		// Cells are truncated as plain text and styled afterwards. Styling
		// first would leave the table cutting through an escape sequence,
		// because it measures width in bytes it cannot interpret.
		source, reference, title, author := "remote", fmt.Sprint(row.pr.Number), row.pr.Title, row.pr.Author
		ci := ui.CIBadge(row.pr.CIState, false)
		draft := false
		if row.kind == rowLocal {
			source, reference, title = "local", row.local.Tag, row.local.Reference()
			ci = ui.CIBadge("", false)
			author = "untracked"
			if row.local.Source != "" {
				author = filepath.Base(row.local.Source)
			}
		} else if row.pr.IsDraft {
			title, draft = "DRAFT · "+title, true
		}

		styledSource := ui.Dim.Render(source)
		if row.kind == rowLocal {
			styledSource = ui.Local.Render(source)
		}
		styledTitle := ui.Truncate(title, titleWidth)
		if draft {
			styledTitle = ui.Dim.Render(styledTitle)
		}
		port := ""
		if row.port != "" {
			port = ui.OK.Render(":" + row.port)
		}

		rendered = append(rendered, table.Row{
			marker,
			styledSource,
			ui.Truncate(reference, columns[2].Width),
			styledTitle,
			ui.Help.Render(ui.Truncate(author, authorWidth)),
			ui.ImageBadge(row.image, false),
			ci,
			port,
		})
	}
	return rendered
}

// instanceRow is one line of the instances screen.
type instanceRow struct {
	container docker.Container
	volume    string
	health    string
}

func (r instanceRow) prNumber() int {
	var number int
	if _, err := fmt.Sscanf(r.container.Name, "homarr_pr_%d", &number); err == nil {
		return number
	}
	return 0
}

func (r instanceRow) url() string {
	if !r.container.Running() || r.container.HostPort() == "" {
		return ""
	}
	return "http://localhost:" + r.container.HostPort()
}

func (r instanceRow) searchTerms() string {
	return strings.ToLower(strings.Join([]string{
		r.container.Name, r.container.Image, r.container.State,
		r.container.Status, r.container.HostPort(), r.health, r.url(),
	}, " "))
}

var healthStatusMap = map[string]string{
	"healthy":          "healthy",
	"unhealthy":        "unhealthy",
	"health: starting": "starting",
}

// parseHealth pulls the healthcheck verdict out of the status string Docker
// renders, for example "Up 3 minutes (healthy)".
func parseHealth(status string) string {
	open := strings.Index(status, "(")
	close := strings.LastIndex(status, ")")
	if open < 0 || close <= open {
		return ""
	}
	return healthStatusMap[status[open+1:close]]
}

func buildInstanceRows(containers []docker.Container, volumes []docker.Volume) []instanceRow {
	byName := make(map[string]docker.Volume, len(volumes))
	for _, volume := range volumes {
		byName[volume.Name] = volume
	}
	rows := make([]instanceRow, 0, len(containers))
	for _, container := range containers {
		row := instanceRow{container: container, health: parseHealth(container.Status)}
		if volume, found := byName[container.Name+"_data"]; found {
			row.volume = volume.Name
		}
		rows = append(rows, row)
	}
	return rows
}

func instanceColumns(width int) []table.Column {
	image, status := 24, 22
	switch {
	case width < 72:
		image, status = 14, 0
	case width < 100:
		image, status = 18, 0
	case width < 124:
		status = 16
	}
	columns := []table.Column{
		{Title: "", Width: 1},
		{Title: "NAME", Width: 0},
		{Title: "STATE", Width: 10},
		{Title: "IMAGE", Width: image},
		{Title: "PORT", Width: 6},
		{Title: "STATUS", Width: status},
	}
	columns[1].Width = flexWidth(columns, width, 1, 16)
	return columns
}

func instanceTableRows(rows []instanceRow, columns []table.Column) []table.Row {
	nameWidth, imageWidth, statusWidth := columns[1].Width, columns[3].Width, columns[5].Width
	rendered := make([]table.Row, 0, len(rows))
	for _, row := range rows {
		marker := ui.Dim.Render(ui.IconStopped)
		if row.container.Running() {
			marker = ui.OK.Render(ui.IconRunning)
		}
		port := ""
		if value := row.container.HostPort(); value != "" {
			port = ui.OK.Render(":" + value)
		}
		image := strings.TrimPrefix(row.container.Image, "ghcr.io/homarr-labs/")
		rendered = append(rendered, table.Row{
			marker,
			ui.Body.Render(ui.Truncate(row.container.Name, nameWidth)),
			ui.StateBadge(row.container.State),
			ui.Help.Render(ui.Truncate(image, imageWidth)),
			port,
			prefixed(ui.HealthBadge(row.health), row.container.Status, statusWidth),
		})
	}
	return rendered
}

// prefixed puts a rendered badge in front of plain text, truncating the text to
// whatever width the badge leaves behind.
func prefixed(badge, text string, width int) string {
	if width <= 0 {
		return ""
	}
	if badge == "" {
		return ui.Help.Render(ui.Truncate(text, width))
	}
	remaining := width - lipgloss.Width(badge) - 1
	if remaining <= 0 {
		return badge
	}
	return badge + " " + ui.Help.Render(ui.Truncate(text, remaining))
}
