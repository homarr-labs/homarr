package run

import (
	"os"
	"strconv"
	"testing"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

func TestPRPlanUsesAMD64(t *testing.T) {
	plan, err := BuildPlan(Options{PR: 1})
	if err != nil {
		t.Fatal(err)
	}
	if plan.Platform != "linux/amd64" {
		t.Fatalf("platform = %q, want linux/amd64", plan.Platform)
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
