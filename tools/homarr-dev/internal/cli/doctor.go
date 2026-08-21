package cli

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/registry"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/ui"
)

func (a *App) doctorCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "Check Docker, the Engine API, GHCR and optional integrations",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(cmd.Context(), 20*time.Second)
			defer cancel()

			failed := false
			if output, err := exec.CommandContext(ctx, "docker", "info", "--format", "{{.ServerVersion}}").CombinedOutput(); err != nil {
				failed = true
				fail("Docker daemon", strings.TrimSpace(string(output)))
			} else {
				pass("Docker daemon", strings.TrimSpace(string(output)))
			}

			// The Engine API is what gives pulls byte-level progress. Losing it
			// is not fatal — the CLI falls back to parsing `docker pull` — so
			// this reports a downgrade rather than a failure.
			host := docker.EngineHost()
			if docker.EngineAvailable(ctx) {
				pass("Engine API", host)
			} else {
				optional("Engine API unreachable at "+host, "pull progress falls back to coarse layer states")
			}

			if tags, err := registry.PublishedTags(ctx, true); err != nil {
				optional("GHCR tag listing unavailable", err.Error())
			} else {
				pass("GHCR test images", fmt.Sprintf("%d published tags", len(tags)))
			}

			if _, err := exec.LookPath("gh"); err != nil {
				optional("GitHub CLI not found", "required for pull-request features")
			} else if output, err := exec.CommandContext(ctx, "gh", "auth", "status").CombinedOutput(); err != nil {
				optional("GitHub CLI is not authenticated", strings.TrimSpace(string(output)))
			} else {
				pass("GitHub CLI authentication", "")
			}

			if _, err := exec.LookPath("homarr"); err != nil {
				optional("homarr is not on PATH", "use `pnpm dev:cli -- ...` or run `pnpm dev:cli:install`")
			} else {
				pass("homarr is on PATH", "")
			}

			if failed {
				return fmt.Errorf("one or more checks failed")
			}
			return nil
		},
	}
}

func pass(label, detail string) {
	if detail == "" {
		fmt.Printf("%s %s\n", ui.OK.Render(ui.IconPass), label)
		return
	}
	fmt.Printf("%s %s: %s\n", ui.OK.Render(ui.IconPass), label, detail)
}

func fail(label, detail string) {
	fmt.Printf("%s %s: %s\n", ui.Alert.Render(ui.IconFail), label, detail)
}

func optional(label, detail string) {
	if detail == "" {
		fmt.Printf("%s %s (optional)\n", ui.Dim.Render(ui.IconNone), label)
		return
	}
	fmt.Printf("%s %s (optional; %s)\n", ui.Dim.Render(ui.IconNone), label, detail)
}
