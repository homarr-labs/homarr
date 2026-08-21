package cli

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/platform"
)

func (a *App) listCommand() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Aliases: []string{"ls", "ps"},
		Short:   "List Homarr instances without opening the application",
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			containers, err := docker.List()
			if err != nil {
				return err
			}
			if len(containers) == 0 {
				fmt.Println("No Homarr instances found.")
				return nil
			}
			writer := newTable("NAME", "STATE", "PORT", "IMAGE", "STATUS")
			for _, container := range containers {
				row(writer, container.Name, container.State, container.HostPort(), container.Image, container.Status)
			}
			return writer.Flush()
		},
	}
}

func (a *App) imagesCommand() *cobra.Command {
	images := &cobra.Command{
		Use:     "images",
		Aliases: []string{"image"},
		Short:   "List local Homarr images and their build provenance",
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			found, err := docker.ListLocalImages(cmd.Context())
			if err != nil {
				return err
			}
			if len(found) == 0 {
				fmt.Println("No local homarr images found. Build one with `homarr build <name>`.")
				return nil
			}
			writer := newTable("IMAGE", "SIZE", "CREATED", "PR", "REVISION", "SOURCE")
			for _, image := range found {
				pr := ""
				if image.PRNumber > 0 {
					pr = fmt.Sprintf("#%d", image.PRNumber)
				}
				revision := image.Revision
				if len(revision) > 12 {
					revision = revision[:12]
				}
				source := image.Source
				if source == "" {
					source = "unknown"
				}
				row(writer, image.Reference(), image.Size, image.Created, pr, revision, source)
			}
			return writer.Flush()
		},
	}
	images.AddCommand(&cobra.Command{
		Use:     "rm <name>...",
		Aliases: []string{"remove", "delete"},
		Short:   "Delete local Homarr images",
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			for _, name := range args {
				reference := name
				if !strings.Contains(reference, ":") {
					reference = "homarr:" + reference
				}
				if err := docker.RemoveImage(cmd.Context(), reference); err != nil {
					return err
				}
				fmt.Println("removed " + reference)
			}
			return nil
		},
	})
	return images
}

func (a *App) dataCommand() *cobra.Command {
	data := &cobra.Command{
		Use:     "data",
		Aliases: []string{"volumes", "volume"},
		Short:   "List Homarr instance data volumes",
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			volumes, err := docker.ListVolumes(cmd.Context(), true)
			if err != nil {
				return err
			}
			if len(volumes) == 0 {
				fmt.Println("No Homarr data volumes found.")
				return nil
			}
			writer := newTable("VOLUME", "SIZE", "IN USE", "BELONGS TO")
			for _, volume := range volumes {
				owner := volume.Tag()
				if number := volume.PRNumber(); number > 0 {
					owner = fmt.Sprintf("PR #%d", number)
				}
				inUse := "no"
				if volume.InUse {
					inUse = "yes"
				}
				row(writer, volume.Name, volume.Size, inUse, owner)
			}
			return writer.Flush()
		},
	}
	data.AddCommand(&cobra.Command{
		Use:     "rm <volume>...",
		Aliases: []string{"remove", "delete"},
		Short:   "Delete instance data, removing the owning container first",
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			for _, name := range args {
				// Docker refuses to delete an attached volume, and the data is
				// going away regardless, so the container goes first.
				_ = docker.Remove(strings.TrimSuffix(name, "_data"))
				if err := docker.RemoveVolume(cmd.Context(), name); err != nil {
					return err
				}
				fmt.Println("removed " + name)
			}
			return nil
		},
	})
	return data
}

func (a *App) pruneCommand() *cobra.Command {
	var force bool
	cmd := &cobra.Command{
		Use:   "prune",
		Short: "Remove stopped Homarr containers, keeping their data",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			containers, err := docker.List()
			if err != nil {
				return err
			}
			stopped := make([]docker.Container, 0, len(containers))
			for _, container := range containers {
				if !container.Running() {
					stopped = append(stopped, container)
				}
			}
			if len(stopped) == 0 {
				fmt.Println("No stopped Homarr containers.")
				return nil
			}
			if !force {
				fmt.Printf("Would remove %d stopped containers:\n", len(stopped))
				for _, container := range stopped {
					fmt.Println("  " + container.Name)
				}
				fmt.Println("\nRe-run with --force to remove them.")
				return nil
			}
			for _, container := range stopped {
				if err := docker.Remove(container.Name); err != nil {
					return err
				}
				fmt.Println("removed " + container.Name)
			}
			return nil
		},
	}
	cmd.Flags().BoolVarP(&force, "force", "f", false, "Actually remove the containers")
	return cmd
}

func (a *App) logsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "logs <container>",
		Short: "Follow logs of a running instance",
		Args:  cobra.ExactArgs(1),
		RunE:  func(cmd *cobra.Command, args []string) error { return docker.FollowLogs(args[0]) },
	}
}

func (a *App) stopCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "stop <container>",
		Short: "Stop a running instance",
		Args:  cobra.ExactArgs(1),
		RunE:  func(cmd *cobra.Command, args []string) error { return docker.Stop(args[0]) },
	}
}

func (a *App) restartCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "restart <container>",
		Short: "Restart an instance",
		Args:  cobra.ExactArgs(1),
		RunE:  func(cmd *cobra.Command, args []string) error { return docker.Restart(args[0]) },
	}
}

func (a *App) removeCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "remove <container>",
		Short: "Force-remove an instance, keeping its data",
		Args:  cobra.ExactArgs(1),
		RunE:  func(cmd *cobra.Command, args []string) error { return docker.Remove(args[0]) },
	}
}

func (a *App) openCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "open <container>",
		Short: "Open a running instance in the browser",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			containers, err := docker.List()
			if err != nil {
				return err
			}
			for _, container := range containers {
				if container.Name != args[0] {
					continue
				}
				if !container.Running() {
					return fmt.Errorf("container %q is not running", args[0])
				}
				port := container.HostPort()
				if port == "" {
					return fmt.Errorf("container %q does not publish the Homarr port", args[0])
				}
				return platform.OpenURL("http://localhost:" + port)
			}
			return fmt.Errorf("container %q was not found", args[0])
		},
	}
}

func (a *App) shellCommand() *cobra.Command {
	return &cobra.Command{
		Use:     "shell <container> [cmd...]",
		Aliases: []string{"sh", "exec"},
		Short:   "Open an interactive shell or run a command in a running Homarr container",
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			shellArgs := []string{"sh"}
			if len(args) > 1 {
				shellArgs = args[1:]
			}
			return docker.ExecInteractive(cmd.Context(), args[0], shellArgs...)
		},
	}
}

func (a *App) ciCommand() *cobra.Command {
	var watch bool
	cmd := &cobra.Command{
		Use:     "ci [pr]",
		Aliases: []string{"checks", "check"},
		Short:   "View or watch GitHub CI checks for a pull request",
		Args:    cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			var prNumber int
			if len(args) > 0 {
				num, err := strconv.Atoi(strings.TrimPrefix(args[0], "#"))
				if err != nil || num <= 0 {
					return fmt.Errorf("invalid PR number %q", args[0])
				}
				prNumber = num
			} else {
				currentPR, err := gh.CurrentBranchPR(cmd.Context())
				if err != nil || currentPR == nil {
					return fmt.Errorf("could not detect PR for current branch: specify a PR number with `homarr ci <number>`")
				}
				prNumber = currentPR.Number
			}

			if watch {
				return gh.WatchPRChecks(cmd.Context(), prNumber)
			}

			checks, err := gh.GetPRChecks(cmd.Context(), prNumber, true)
			if err != nil {
				return err
			}
			if len(checks) == 0 {
				fmt.Printf("No CI checks found for PR #%d.\n", prNumber)
				return nil
			}

			writer := newTable("CHECK", "STATUS", "DURATION", "WORKFLOW", "LINK")
			for _, check := range checks {
				dur := check.Duration()
				if dur == "" {
					dur = "—"
				}
				row(writer, check.Name, check.State, dur, check.Workflow, check.Link)
			}
			return writer.Flush()
		},
	}
	cmd.Flags().BoolVarP(&watch, "watch", "w", false, "Watch CI checks until completion")
	return cmd
}

func newTable(headers ...string) *tabwriter.Writer {
	writer := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	row(writer, headers...)
	return writer
}

func row(writer *tabwriter.Writer, cells ...string) {
	fmt.Fprintln(writer, strings.Join(cells, "\t"))
}
