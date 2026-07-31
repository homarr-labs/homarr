package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/platform"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/run"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/tui"
)

var (
	flagDemo    bool
	flagPR      int
	flagEnv     []string
	flagDetach  bool
	flagBuildPR int
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:          "homarr",
	Short:        "Launch and manage Homarr Docker instances",
	SilenceUsage: true,
	Long: `Launch and manage Homarr Docker containers.

Start a local image, a PR test build from ghcr.io, browse open PRs,
or manage running instances from an interactive dashboard.

Examples:
  homarr run dev                # launch local homarr:dev image
  homarr run --pr 6390          # launch remote PR test image
  homarr run --pr 6390 --demo   # PR + demo mode
  homarr run -e FOO=bar dev     # extra env vars
  homarr run --detach dev       # start in background
  homarr dash                   # interactive instance dashboard
  homarr dev                    # browse remote PRs and local images
  homarr build feature          # build this checkout as homarr:feature
  homarr build --pr 6390        # build PR #6390 locally as homarr:pr-6390
  homarr list                   # script-friendly instance list
  homarr logs homarr_pr_6390    # follow logs
  homarr doctor                 # verify dependencies`,
	Args: cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var dashCmd = &cobra.Command{
	Use:   "dash",
	Short: "Interactive dashboard of running instances",
	RunE: func(cmd *cobra.Command, args []string) error {
		return tui.RunDashboard()
	},
}

var runCmd = &cobra.Command{
	Use:   "run [tag]",
	Short: "Launch a local image or remote pull-request image",
	Args:  cobra.MaximumNArgs(1),
	RunE:  runLaunch,
}

var devCmd = &cobra.Command{
	Use:   "dev",
	Short: "Browse remote PRs and local development images",
	RunE: func(cmd *cobra.Command, args []string) error {
		return tui.RunDev()
	},
}

var buildCmd = &cobra.Command{
	Use:   "build [name]",
	Short: "Build a local Homarr image from this checkout or a pull request",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		tag := ""
		if len(args) > 0 {
			tag = args[0]
		}
		if flagBuildPR < 0 {
			return fmt.Errorf("PR number must be positive")
		}
		if flagBuildPR > 0 {
			if tag == "" {
				tag = fmt.Sprintf("pr-%d", flagBuildPR)
			}
			return run.BuildPRImage(flagBuildPR, tag)
		}
		if tag == "" {
			return fmt.Errorf("image name is required when --pr is not set")
		}
		return run.BuildCurrentImage(tag, ".")
	},
}

var rebuildCmd = &cobra.Command{
	Use:   "rebuild [name]",
	Short: "Rebuild a local image from its recorded checkout or pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		images, err := docker.ListLocalImages()
		if err != nil {
			return err
		}
		for _, image := range images {
			if image.Tag == args[0] || image.Reference() == args[0] {
				return run.RebuildImage(image)
			}
		}
		return fmt.Errorf("local image homarr:%s was not found", strings.TrimPrefix(args[0], "homarr:"))
	},
}

var logsCmd = &cobra.Command{
	Use:   "logs [container]",
	Short: "Follow logs of a running instance",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return docker.FollowLogs(args[0])
	},
}

var stopCmd = &cobra.Command{
	Use:   "stop [container]",
	Short: "Stop a running instance",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return docker.Stop(args[0])
	},
}

var restartCmd = &cobra.Command{
	Use:   "restart [container]",
	Short: "Restart a running instance",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return docker.Restart(args[0])
	},
}

var removeCmd = &cobra.Command{
	Use:   "remove [container]",
	Short: "Force-remove an instance",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return docker.Remove(args[0])
	},
}

var openCmd = &cobra.Command{
	Use:   "open [container]",
	Short: "Open a running instance in the browser",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		containers, err := docker.List()
		if err != nil {
			return err
		}
		for _, container := range containers {
			if container.Name == args[0] && container.Running() && container.HostPort() != "" {
				return platform.OpenURL("http://localhost:" + container.HostPort())
			}
		}
		return fmt.Errorf("running container %q has no Homarr port", args[0])
	},
}

var listCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List Homarr instances without opening the dashboard",
	RunE: func(cmd *cobra.Command, args []string) error {
		containers, err := docker.List()
		if err != nil {
			return err
		}
		if len(containers) == 0 {
			fmt.Println("No Homarr instances found.")
			return nil
		}
		fmt.Printf("%-28s %-10s %-7s %s\n", "NAME", "STATE", "PORT", "IMAGE")
		for _, container := range containers {
			fmt.Printf("%-28s %-10s %-7s %s\n", container.Name, container.State, container.HostPort(), container.Image)
		}
		return nil
	},
}

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check Docker, GitHub CLI, and local installation",
	RunE: func(cmd *cobra.Command, args []string) error {
		checks := []struct {
			name    string
			command *exec.Cmd
		}{
			{name: "Docker daemon", command: exec.Command("docker", "info", "--format", "{{.ServerVersion}}")},
			{name: "GitHub authentication", command: exec.Command("gh", "auth", "status")},
		}
		failed := false
		for _, check := range checks {
			output, err := check.command.CombinedOutput()
			if err != nil {
				failed = true
				fmt.Printf("✗ %s: %s\n", check.name, strings.TrimSpace(string(output)))
			} else {
				fmt.Printf("✓ %s\n", check.name)
			}
		}
		if _, err := exec.LookPath("homarr"); err != nil {
			failed = true
			fmt.Println("✗ homarr is not on PATH")
		} else {
			fmt.Println("✓ homarr is on PATH")
		}
		if failed {
			return fmt.Errorf("one or more checks failed")
		}
		return nil
	},
}

func init() {
	runCmd.Flags().BoolVarP(&flagDemo, "demo", "m", false, "Demo mode (mock integrations)")
	runCmd.Flags().IntVarP(&flagPR, "pr", "p", 0, "Launch PR test image from ghcr.io")
	runCmd.Flags().StringArrayVarP(&flagEnv, "env", "e", nil, "Extra env vars (repeatable, KEY=VALUE)")
	runCmd.Flags().BoolVar(&flagDetach, "detach", false, "Start in the background")
	buildCmd.Flags().IntVarP(&flagBuildPR, "pr", "p", 0, "Build a pull request in a temporary checkout")

	rootCmd.AddCommand(runCmd, dashCmd, devCmd, buildCmd, rebuildCmd, listCmd, logsCmd, stopCmd, restartCmd, removeCmd, openCmd, doctorCmd)
}

func runLaunch(cmd *cobra.Command, args []string) error {
	tag := ""
	if len(args) > 0 {
		tag = args[0]
	}
	if flagPR < 0 {
		return fmt.Errorf("PR number must be positive")
	}
	if flagPR > 0 && tag != "" {
		return fmt.Errorf("tag and --pr cannot be used together")
	}
	if flagPR == 0 && tag == "" {
		return cmd.Usage()
	}

	plan, err := run.BuildPlan(run.Options{
		PR:         flagPR,
		Tag:        tag,
		Demo:       flagDemo,
		Env:        flagEnv,
		FetchTitle: flagPR > 0,
	})
	if err != nil {
		return err
	}

	run.SetTerminalChrome(plan.TabTitle)

	fmt.Printf("Starting Homarr (%s)\n", plan.Label)
	fmt.Printf("  Image     : %s\n", plan.Image)
	fmt.Printf("  Container : %s\n", plan.Name)
	fmt.Printf("  Volume    : %s\n", plan.Volume)
	fmt.Printf("  Port      : %d:7575\n", plan.HostPort)
	fmt.Printf("  URL       : http://localhost:%d\n", plan.HostPort)
	if plan.PRNumber > 0 {
		fmt.Printf("  PR        : https://github.com/homarr-labs/homarr/pull/%d\n", plan.PRNumber)
	}
	fmt.Println()

	if flagDetach {
		if err := run.StartDetached(plan); err != nil {
			return err
		}
		fmt.Printf("Started in background: http://localhost:%d\n", plan.HostPort)
		return nil
	}
	return run.StartForeground(plan)
}
