package gh

import (
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

func TestIsBot(t *testing.T) {
	tests := []struct {
		login string
		want  bool
	}{
		{login: "app/homarr-renovate", want: true},
		{login: "dependabot[bot]", want: true},
		{login: "ajnart", want: false},
	}

	for _, test := range tests {
		if got := isBot(test.login); got != test.want {
			t.Errorf("isBot(%q) = %v, want %v", test.login, got, test.want)
		}
	}
}

func TestRollupStateHandlesChecksAndStatuses(t *testing.T) {
	tests := []struct {
		name   string
		checks []rawCheck
		want   string
	}{
		{name: "check success", checks: []rawCheck{{Status: "COMPLETED", Conclusion: "SUCCESS"}}, want: "SUCCESS"},
		{name: "status failure", checks: []rawCheck{{State: "FAILURE"}}, want: "FAILURE"},
		{name: "status pending", checks: []rawCheck{{State: "PENDING"}}, want: "PENDING"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := rollupState(test.checks); got != test.want {
				t.Fatalf("rollupState() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestCachedPRListFiltersBotsWithoutMutatingCache(t *testing.T) {
	limit := 9876
	storePRList(limit, []PR{{Number: 1, Author: "developer"}, {Number: 2, Author: "bot[bot]"}})

	prs, fetchedAt := cachedPRList(limit)
	if time.Since(fetchedAt) >= prCacheTTL {
		t.Fatal("new cache entry is already expired")
	}
	if filtered := filterPRs(prs, false); len(filtered) != 1 || filtered[0].Number != 1 {
		t.Fatalf("filtered PRs = %#v", filtered)
	}
	if unfiltered := filterPRs(prs, true); len(unfiltered) != 2 {
		t.Fatalf("unfiltered PR count = %d, want 2", len(unfiltered))
	}
}

func TestCommandErrorIncludesGitHubOutput(t *testing.T) {
	err := commandError(errors.New("exit status 1"), []byte("GraphQL: API rate limit exceeded\n"))
	if !strings.Contains(err.Error(), "API rate limit exceeded") {
		t.Fatalf("error = %q", err)
	}
}

func TestListPRsExcludesBotsIntegration(t *testing.T) {
	if os.Getenv("HOMARR_INTEGRATION_TEST") != "1" {
		t.Skip("set HOMARR_INTEGRATION_TEST=1 to query GitHub")
	}

	prs, err := ListPRs(t.Context(), 50, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(prs) == 0 {
		t.Fatal("expected at least one human-authored open PR")
	}
	for _, pr := range prs {
		if isBot(pr.Author) {
			t.Fatalf("bot PR was not filtered: #%d by %s", pr.Number, pr.Author)
		}
		if pr.HeadSHA == "" {
			t.Fatalf("PR #%d has no head SHA", pr.Number)
		}
	}
}

func TestCheckHelpersAndDuration(t *testing.T) {
	c1 := Check{
		Name:        "Test Job",
		State:       "SUCCESS",
		Bucket:      "pass",
		StartedAt:   "2026-08-21T10:00:00Z",
		CompletedAt: "2026-08-21T10:05:30Z",
	}
	if !c1.IsSuccess() || c1.IsFailure() || c1.IsPending() || c1.IsSkipped() {
		t.Fatalf("unexpected state helpers for c1: success=%v, fail=%v, pend=%v, skip=%v", c1.IsSuccess(), c1.IsFailure(), c1.IsPending(), c1.IsSkipped())
	}
	if d := c1.Duration(); d != "5m30s" {
		t.Fatalf("Duration() = %q, want 5m30s", d)
	}

	c2 := Check{
		Name:   "Fail Job",
		State:  "FAILURE",
		Bucket: "fail",
	}
	if !c2.IsFailure() {
		t.Fatalf("expected c2 to be failure")
	}
	if c2.Duration() != "" {
		t.Fatalf("expected empty duration for missing timestamps")
	}

	c3 := Check{
		Name:   "Pending Job",
		Bucket: "pending",
	}
	if !c3.IsPending() {
		t.Fatalf("expected c3 to be pending")
	}

	c4 := Check{
		Name:   "Skipped Job",
		Bucket: "skipping",
	}
	if !c4.IsSkipped() {
		t.Fatalf("expected c4 to be skipped")
	}
}
