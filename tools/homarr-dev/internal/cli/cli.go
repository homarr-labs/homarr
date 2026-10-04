// Package cli wires the command line surface. The interactive application
// lives in internal/tui; everything here is the scriptable path that does not
// need a terminal.
package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/run"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/tui"
)

// App holds command state. The three function fields are seams: they let the
// command wiring be tested without opening a terminal, and they are the only
// mutable state in the package — the previous version reached for package-level
// variables, which meant tests had to mutate globals to observe dispatch.
type App struct {
	demo    bool
	pr      int
	env     []string
	detach  bool
	buildPR int

	RunBrowser   func() error
	RunInstances func() error
	Launch       func(cmd *cobra.Command, args []string) error
}

func NewApp() *App {
	app := &App{RunBrowser: tui.RunDev, RunInstances: tui.RunDashboard}
	app.Launch = app.launch
	return app
}

// Execute runs the CLI.
func Execute() error {
	args := os.Args[1:]
	if len(args) > 0 && args[0] == "--" {
		args = args[1:]
	}
	root := NewApp().Root()
	root.SetArgs(args)
	return root.Execute()
}

func (a *App) Root() *cobra.Command {
	root := &cobra.Command{
		Use:          "homarr",
		Short:        "Launch and manage Homarr Docker instances",
		SilenceUsage: true,
		Long: `Launch and manage Homarr Docker containers.

Start a local image, a pull-request build from ghcr.io, browse open pull
requests, or manage running instances — all from one interactive terminal
application where builds and pulls run in the background.

Examples:
  homarr                        # interactive browser
  homarr --pr 6390              # launch a pull-request image directly
  homarr --pr 6390 -e FOO=bar   # with environment overrides
  homarr run dev                # launch local homarr:dev
  homarr run --detach dev       # start in the background
  homarr dash                   # open on the instances screen
  homarr build feature          # build this checkout as homarr:feature
  homarr build --pr 6390        # build a pull request locally
  homarr images                 # local images with provenance
  homarr data                   # instance data volumes
  homarr prune                  # remove stopped instances
  homarr doctor                 # check Docker and optional integrations`,
		Args: cobra.NoArgs,
		RunE: a.runRoot,
	}

	a.addRunFlags(root)
	root.AddCommand(
		a.runCommand(),
		a.devCommand(),
		a.dashCommand(),
		a.buildCommand(),
		a.rebuildCommand(),
		a.listCommand(),
		a.imagesCommand(),
		a.dataCommand(),
		a.pruneCommand(),
		a.logsCommand(),
		a.stopCommand(),
		a.restartCommand(),
		a.removeCommand(),
		a.openCommand(),
		a.shellCommand(),
		a.ciCommand(),
		a.doctorCommand(),
	)
	return root
}

func (a *App) addRunFlags(cmd *cobra.Command) {
	cmd.Flags().BoolVarP(&a.demo, "demo", "m", false, "Demo mode (mock integrations)")
	cmd.Flags().IntVarP(&a.pr, "pr", "p", 0, "Launch a pull-request image from ghcr.io")
	cmd.Flags().StringArrayVarP(&a.env, "env", "e", nil, "Extra env vars (repeatable, KEY=VALUE)")
	cmd.Flags().BoolVar(&a.detach, "detach", false, "Start in the background")
}

// runRoot opens the browser unless a launch flag was given, in which case the
// bare `homarr` invocation is shorthand for `homarr run`.
func (a *App) runRoot(cmd *cobra.Command, args []string) error {
	for _, name := range []string{"pr", "env", "demo", "detach"} {
		if cmd.Flags().Changed(name) {
			return a.Launch(cmd, args)
		}
	}
	return a.RunBrowser()
}

func (a *App) runCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run [tag]",
		Short: "Launch a local image or a pull-request image",
		Args:  cobra.MaximumNArgs(1),
		RunE:  func(cmd *cobra.Command, args []string) error { return a.Launch(cmd, args) },
	}
	a.addRunFlags(cmd)
	return cmd
}

func (a *App) devCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "dev",
		Short: "Browse pull requests and local development images",
		Args:  cobra.NoArgs,
		RunE:  func(*cobra.Command, []string) error { return a.RunBrowser() },
	}
}

func (a *App) dashCommand() *cobra.Command {
	return &cobra.Command{
		Use:     "dash",
		Aliases: []string{"instances"},
		Short:   "Open the interactive application on the instances screen",
		Args:    cobra.NoArgs,
		RunE:    func(*cobra.Command, []string) error { return a.RunInstances() },
	}
}

func (a *App) launch(cmd *cobra.Command, args []string) error {
	tag := ""
	if len(args) > 0 {
		tag = args[0]
	}
	if a.pr < 0 {
		return fmt.Errorf("PR number must be positive")
	}
	if a.pr > 0 && tag != "" {
		return fmt.Errorf("tag and --pr cannot be used together")
	}
	if a.pr == 0 && tag == "" {
		if err := cmd.Usage(); err != nil {
			return err
		}
		return fmt.Errorf("provide a tag or --pr")
	}

	plan, err := run.BuildPlan(run.Options{
		Context:    cmd.Context(),
		PR:         a.pr,
		Tag:        tag,
		Demo:       a.demo,
		Env:        a.env,
		FetchTitle: a.pr > 0,
	})
	if err != nil {
		return err
	}

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

	if a.detach {
		if err := run.StartDetached(plan); err != nil {
			return err
		}
		fmt.Printf("Started in background: http://localhost:%d\n", plan.HostPort)
		return nil
	}
	return run.StartForeground(plan)
}
