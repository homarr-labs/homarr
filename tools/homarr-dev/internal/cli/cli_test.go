package cli

import (
	"errors"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestRootCommandOpensBrowser(t *testing.T) {
	want := errors.New("browser started")
	app := NewApp()
	app.RunBrowser = func() error { return want }

	if err := app.runRoot(&cobra.Command{}, nil); !errors.Is(err, want) {
		t.Fatalf("root command error = %v, want %v", err, want)
	}
}

func TestRootCommandLaunchesWhenRunFlagIsProvided(t *testing.T) {
	want := errors.New("PR launched")
	app := NewApp()
	app.Launch = func(*cobra.Command, []string) error { return want }

	cmd := &cobra.Command{}
	cmd.Flags().Bool("pr", false, "")
	if err := cmd.Flags().Set("pr", "true"); err != nil {
		t.Fatal(err)
	}

	if err := app.runRoot(cmd, nil); !errors.Is(err, want) {
		t.Fatalf("root command error = %v, want %v", err, want)
	}
}

func TestLaunchRejectsTagWithPR(t *testing.T) {
	app := NewApp()
	// Registering the flags binds them to app.pr and resets it, so the command
	// has to exist before the test sets the value it wants to assert on.
	cmd := app.runCommand()
	app.pr = 42

	err := app.launch(cmd, []string{"feature"})
	if err == nil || !strings.Contains(err.Error(), "cannot be used together") {
		t.Fatalf("error = %v", err)
	}
}

func TestLaunchRejectsNegativePR(t *testing.T) {
	app := NewApp()
	cmd := app.runCommand()
	app.pr = -1

	err := app.launch(cmd, nil)
	if err == nil || !strings.Contains(err.Error(), "must be positive") {
		t.Fatalf("error = %v", err)
	}
}

func TestLaunchRejectsMissingImage(t *testing.T) {
	app := NewApp()

	err := app.launch(app.runCommand(), nil)
	if err == nil || !strings.Contains(err.Error(), "provide a tag or --pr") {
		t.Fatalf("error = %v", err)
	}
}

// The root command doubles as `run`, so both must accept the same launch flags.
func TestRootAndRunShareLaunchFlags(t *testing.T) {
	app := NewApp()
	root := app.Root()
	run, _, err := root.Find([]string{"run"})
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"pr", "demo", "env", "detach"} {
		if root.Flags().Lookup(name) == nil {
			t.Fatalf("root command is missing the %q flag", name)
		}
		if run.Flags().Lookup(name) == nil {
			t.Fatalf("run command is missing the %q flag", name)
		}
	}
}

func TestCICommandRegisteredAndValidated(t *testing.T) {
	app := NewApp()
	root := app.Root()
	ciCmd, _, err := root.Find([]string{"ci"})
	if err != nil {
		t.Fatalf("failed to find 'ci' command: %v", err)
	}
	if ciCmd.Name() != "ci" {
		t.Fatalf("expected command name 'ci', got %q", ciCmd.Name())
	}
	if ciCmd.Flags().Lookup("watch") == nil {
		t.Fatalf("expected --watch flag on 'ci' command")
	}

	// Test invalid PR argument
	err = ciCmd.RunE(ciCmd, []string{"invalid-num"})
	if err == nil || !strings.Contains(err.Error(), "invalid PR number") {
		t.Fatalf("expected invalid PR number error, got: %v", err)
	}
}
