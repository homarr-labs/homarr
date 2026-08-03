package main

import (
	"errors"
	"strings"
	"testing"
)

func TestRootCommandLaunchesDevelopmentDashboard(t *testing.T) {
	want := errors.New("dashboard started")
	previous := runMain
	t.Cleanup(func() { runMain = previous })
	runMain = func() error { return want }

	if err := rootCmd.RunE(rootCmd, nil); !errors.Is(err, want) {
		t.Fatalf("root command error = %v", err)
	}
}

func TestRunLaunchRejectsTagWithPR(t *testing.T) {
	previousPR := flagPR
	t.Cleanup(func() { flagPR = previousPR })
	flagPR = 42

	err := runLaunch(runCmd, []string{"feature"})
	if err == nil || !strings.Contains(err.Error(), "cannot be used together") {
		t.Fatalf("error = %v", err)
	}
}

func TestRunLaunchRejectsNegativePR(t *testing.T) {
	previousPR := flagPR
	t.Cleanup(func() { flagPR = previousPR })
	flagPR = -1

	err := runLaunch(runCmd, nil)
	if err == nil || !strings.Contains(err.Error(), "must be positive") {
		t.Fatalf("error = %v", err)
	}
}

func TestRunLaunchRejectsMissingImage(t *testing.T) {
	previousPR := flagPR
	t.Cleanup(func() { flagPR = previousPR })
	flagPR = 0

	err := runLaunch(runCmd, nil)
	if err == nil || !strings.Contains(err.Error(), "provide a tag or --pr") {
		t.Fatalf("error = %v", err)
	}
}
