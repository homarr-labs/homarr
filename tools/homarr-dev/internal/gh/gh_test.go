package gh

import (
	"os"
	"testing"
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
	}
}
