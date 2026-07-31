package main

import (
	"strings"
	"testing"
)

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
