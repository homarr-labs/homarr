package run

import (
	"os"
	"slices"
	"strconv"
	"testing"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

func TestPRPlanUsesAMD64(t *testing.T) {
	plan, err := BuildPlan(Options{PR: 1, FindPort: func(int) int { return 7575 }})
	if err != nil {
		t.Fatal(err)
	}
	if plan.Platform != "linux/amd64" {
		t.Fatalf("platform = %q, want linux/amd64", plan.Platform)
	}
}

func TestPRFetchIsShallow(t *testing.T) {
	args := prFetchArgs("https://github.com/homarr-labs/homarr.git", "refs/pull/1/head:pr-1")
	if !slices.Contains(args, "--depth=1") {
		t.Fatalf("fetch args = %v", args)
	}
}

func TestBuildPlanFailsWhenNoPortIsAvailable(t *testing.T) {
	_, err := BuildPlan(Options{Tag: "dev", FindPort: func(int) int { return 0 }})
	if err == nil {
		t.Fatal("expected no-free-port error")
	}
}

func TestBuildPlanPreservesEnvironmentOverrides(t *testing.T) {
	want := []string{
		"WORKSHOP_WEB_URL=https://app-v2.preview.homarr.dev/",
		"FEATURE_OPTIONS=one=two",
	}
	plan, err := BuildPlan(Options{
		PR:       1,
		Env:      want,
		FindPort: func(int) int { return 7575 },
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(plan.Env, want) {
		t.Fatalf("environment = %v, want %v", plan.Env, want)
	}
}

func TestStartPRIntegration(t *testing.T) {
	if os.Getenv("HOMARR_DOCKER_INTEGRATION_TEST") != "1" {
		t.Skip("set HOMARR_DOCKER_INTEGRATION_TEST=1 and HOMARR_TEST_PR=<number>")
	}
	pr, err := strconv.Atoi(os.Getenv("HOMARR_TEST_PR"))
	if err != nil || pr <= 0 {
		t.Fatal("HOMARR_TEST_PR must be a positive PR number")
	}

	plan, err := BuildPlan(Options{PR: pr})
	if err != nil {
		t.Fatal(err)
	}
	plan.Name += "_integration"
	plan.Volume += "_integration"
	defer docker.Remove(plan.Name)

	if err := StartDetached(plan); err != nil {
		t.Fatal(err)
	}
	if !docker.IsRunning(plan.Name) {
		t.Fatalf("container %s did not remain running", plan.Name)
	}
}
