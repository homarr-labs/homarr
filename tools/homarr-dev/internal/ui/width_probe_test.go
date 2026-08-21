package ui

import (
	"testing"

	"charm.land/lipgloss/v2"
)

func TestGlyphWidths(t *testing.T) {
	glyphs := []string{
		"✓", "✗", "●", "–", "◆", "☁", "▶", "○", "⚒", "▤", "█", "░",
		// Nerd Font glyphs:
		"\uf00c", // nf-fa-check 
		"\uf00d", // nf-fa-times 
		"\uf444", // nf-oct-dot_fill 
		"\uf0c2", // nf-fa-cloud 
		"\uf1b2", // nf-fa-cube 
		"\uf04b", // nf-fa-play 
		"\uf04d", // nf-fa-stop 
		"\uf0ad", // nf-fa-wrench 
		"\uf1c0", // nf-fa-database 
		"\uf407", // nf-oct-git_pull_request 
		"\uf120", // nf-fa-terminal 
		"\uf007", // nf-fa-user 
		"\uf004", // nf-fa-heart 
		"\uf09b", // nf-fa-github 
		"\uf308", // nf-fa-docker 
		"\uf002", // nf-fa-search 
		"\uf08e", // nf-fa-external_link 
	}
	for _, glyph := range glyphs {
		t.Logf("%q (%s) width=%d", glyph, glyph, lipgloss.Width(glyph))
	}
}
