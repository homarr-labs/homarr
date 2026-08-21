// Package ui holds the CLI's visual vocabulary: one palette, one set of status
// badges, and one keymap, so every screen looks and behaves the same way.
package ui

import (
	"image/color"
	"strings"

	"charm.land/lipgloss/v2"
)

// The palette is intentionally small. Colour carries meaning here — green is
// healthy, red is broken, amber is in flight, cyan is local — so introducing
// extra hues would dilute the signal rather than add information.
var (
	Accent  = lipgloss.Color("212")
	Success = lipgloss.Color("42")
	Warning = lipgloss.Color("214")
	Danger  = lipgloss.Color("203")
	Info    = lipgloss.Color("81")
	Muted   = lipgloss.Color("241")
	Faint   = lipgloss.Color("238")
	Text    = lipgloss.Color("252")
	Bright  = lipgloss.Color("230")
	Ink     = lipgloss.Color("235")
)

var (
	Title    = lipgloss.NewStyle().Bold(true).Foreground(Accent)
	Heading  = lipgloss.NewStyle().Bold(true).Foreground(Bright)
	Help     = lipgloss.NewStyle().Foreground(Muted)
	Dim      = lipgloss.NewStyle().Foreground(Faint)
	Body     = lipgloss.NewStyle().Foreground(Text)
	OK       = lipgloss.NewStyle().Foreground(Success)
	Alert    = lipgloss.NewStyle().Foreground(Danger)
	Pending  = lipgloss.NewStyle().Foreground(Warning)
	Local    = lipgloss.NewStyle().Foreground(Info)
	Selected = lipgloss.NewStyle().Bold(true).Foreground(Bright).Background(lipgloss.Color("57"))
)

// Panel frames the sidebar and overlays.
func Panel(title string, focused bool) lipgloss.Style {
	var border color.Color = Faint
	if focused {
		border = Accent
	}
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(border).
		Padding(0, 1)
}

// Rule draws a labelled separator across the given width.
func Rule(label string, width int) string {
	if width < 8 {
		return Dim.Render(Truncate(label, width))
	}
	prefix := "── " + label + " "
	prefixWidth := lipgloss.Width(prefix)
	if prefixWidth >= width {
		return Dim.Render(Truncate(prefix, width))
	}
	fill := width - prefixWidth
	return Dim.Render(prefix + strings.Repeat("─", fill))
}

// Blank reports whether a line would render as empty. Build tools emit lines
// that hold nothing but a colour reset; they are not empty as strings but they
// occupy a row for no reason, which turns a log panel into double-spaced text.
func Blank(line string) bool { return lipgloss.Width(strings.TrimSpace(line)) == 0 }

// Truncate shortens a string to width runes, marking the cut with an ellipsis.
func Truncate(value string, width int) string {
	if width <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= width {
		return value
	}
	if width == 1 {
		return "…"
	}
	return string(runes[:width-1]) + "…"
}
