package ui

import (
	"fmt"
	"image/color"
	"strings"

	"charm.land/lipgloss/v2"
)

// Badges come in two weights. A chip is a filled pill used for the handful of
// states that must be seen at a glance across a busy table — running, demo,
// manage mode. Everything else is a glyph plus coloured text, which stays
// readable when a dozen of them share a row.
func chip(label string, background color.Color) string {
	return lipgloss.NewStyle().Bold(true).Foreground(Ink).Background(background).Padding(0, 1).Render(label)
}

func glyph(symbol, label string, colour color.Color) string {
	style := lipgloss.NewStyle().Foreground(colour)
	if label == "" {
		return style.Render(symbol)
	}
	return style.Render(symbol + " " + label)
}

// CI & Status badge glyphs (Nerd Fonts).
const (
	IconPass     = "\uf00c" //  nf-fa-check
	IconFail     = "\uf00d" //  nf-fa-times
	IconPending  = "\uf444" //  nf-oct-dot_fill
	IconNone     = "–"
	IconLocal    = "\uf1b2" //  nf-fa-cube
	IconCloud    = "\uf0c2" //  nf-fa-cloud
	IconRunning  = "\uf04b" //  nf-fa-play
	IconStopped  = "\uf04d" //  nf-fa-stop
	IconPaused   = "\uf04c" //  nf-fa-pause
	IconBuild    = "\uf0ad" //  nf-fa-wrench
	IconData     = "\uf1c0" //  nf-fa-database
	IconDocker   = "\uf308" //  nf-fa-docker
	IconGitHub   = "\uf09b" //  nf-fa-github
	IconPR       = "\uf407" //  nf-oct-git_pull_request
	IconBranch   = "\uf418" //  nf-oct-git_branch
	IconTerminal = "\uf120" //  nf-fa-terminal
	IconHealth   = "\uf004" //  nf-fa-heart
	IconPort     = "\uf08e" //  nf-fa-external_link
	IconUser     = "\uf007" //  nf-fa-user
	IconPin      = "\uf435" //  nf-oct-pin
	IconSearch   = "\uf002" //  nf-fa-search
	IconKey      = "\uf084" //  nf-fa-key
)

type badgeSpec struct {
	symbol string
	label  string
	colour color.Color
}

var ciBadges = map[string]badgeSpec{
	"SUCCESS": {IconPass, "checks pass", Success},
	"FAILURE": {IconFail, "checks fail", Danger},
	"PENDING": {IconPending, "checks running", Warning},
}

// CIBadge renders the GitHub check rollup of a pull request.
func CIBadge(state string, verbose bool) string {
	spec, found := ciBadges[state]
	if !found {
		spec = badgeSpec{IconNone, "no checks", Faint}
	}
	label := spec.label
	if !verbose {
		label = ""
	}
	return glyph(spec.symbol, label, spec.colour)
}

// ImageState describes where a runnable image for a row can come from.
type ImageState int

const (
	ImageUnknown ImageState = iota
	ImageChecking
	ImageRemote
	ImageMissing
	ImageLocal
	ImageStale
	ImageError
)

var imageBadges = map[ImageState]badgeSpec{
	ImageLocal:    {IconLocal, "local", Info},
	ImageStale:    {IconLocal, "local (outdated)", Muted},
	ImageRemote:   {IconCloud, "ghcr", Success},
	ImageMissing:  {"…", "not built", Faint},
	ImageError:    {"!", "check failed", Danger},
	ImageChecking: {"?", "checking", Warning},
	ImageUnknown:  {"?", "checking", Warning},
}

// ImageBadge renders the preferred image availability for a row. A matching
// local build is shown first; the start action can still offer the registry
// image when both sources are available.
func ImageBadge(state ImageState, verbose bool) string {
	spec, found := imageBadges[state]
	if !found {
		spec = badgeSpec{"?", "checking", Warning}
	}
	label := spec.label
	if !verbose {
		label = ""
	}
	return glyph(spec.symbol, label, spec.colour)
}

// RunningBadge renders container state, filled when the container is up so it
// stands out from every other marker in the row.
func RunningBadge(running bool, port string) string {
	if !running {
		return glyph(IconStopped, "", Faint)
	}
	if port == "" {
		return chip(IconRunning+" UP", Success)
	}
	return chip(IconRunning+" :"+port, Success)
}

var stateBadges = map[string]badgeSpec{
	"running":    {IconRunning, "running", Success},
	"restarting": {IconPending, "restarting", Warning},
	"created":    {IconPending, "created", Warning},
	"paused":     {IconPending, "paused", Warning},
	"exited":     {IconStopped, "exited", Danger},
	"dead":       {IconStopped, "dead", Danger},
}

// StateBadge renders a Docker container state string.
func StateBadge(state string) string {
	if spec, found := stateBadges[state]; found {
		return glyph(spec.symbol, spec.label, spec.colour)
	}
	return glyph(IconStopped, state, Faint)
}

var healthBadges = map[string]badgeSpec{
	"healthy":   {IconHealth, "healthy", Success},
	"unhealthy": {IconFail, "unhealthy", Danger},
	"starting":  {IconPending, "starting", Warning},
}

// HealthBadge renders the healthcheck verdict Docker embeds in a status string.
func HealthBadge(health string) string {
	if spec, found := healthBadges[health]; found {
		return glyph(spec.symbol, spec.label, spec.colour)
	}
	return ""
}

// ModeBadge marks a non-default interaction mode in the header.
func ModeBadge(label string, colour color.Color) string { return chip(label, colour) }

var taskGlyphs = map[string]struct {
	symbol string
	colour color.Color
}{
	"running":   {IconPending, Warning},
	"succeeded": {IconPass, Success},
	"failed":    {IconFail, Danger},
}

// TaskBadge renders the outcome of a background job.
func TaskBadge(state, kind string) string {
	if spec, found := taskGlyphs[state]; found {
		return glyph(spec.symbol, kind, spec.colour)
	}
	return glyph(IconNone, kind, Faint)
}

// Bar renders a fixed width progress bar. The bubbles progress component
// animates a single value with a spring; these bars are drawn many per frame
// for individual layers and steps, where an instant, exact bar reads better
// than a dozen independently easing ones.
func Bar(percent float64, width int, colour color.Color) string {
	if width <= 0 {
		return ""
	}
	if percent < 0 {
		percent = 0
	}
	if percent > 1 {
		percent = 1
	}
	filled := int(percent * float64(width))
	empty := width - filled
	return lipgloss.NewStyle().Foreground(colour).Render(strings.Repeat("█", filled)) +
		lipgloss.NewStyle().Foreground(Faint).Render(strings.Repeat("░", empty))
}

// Percent formats a fraction for display next to a bar.
func Percent(value float64) string { return fmt.Sprintf("%3.0f%%", value*100) }
