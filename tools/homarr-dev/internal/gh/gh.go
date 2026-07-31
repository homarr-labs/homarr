package gh

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

const Repo = "homarr-labs/homarr"

func isBot(login string) bool {
	return strings.HasSuffix(login, "[bot]") || strings.HasPrefix(login, "app/")
}

type PR struct {
	Number    int    `json:"number"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	HeadRef   string `json:"headRefName"`
	CIState   string `json:"ciState"`
	IsDraft   bool   `json:"isDraft"`
	UpdatedAt string `json:"updatedAt"`
}

type rawPR struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	IsDraft bool   `json:"isDraft"`
	Author  struct {
		Login string `json:"login"`
	} `json:"author"`
	HeadRefName       string     `json:"headRefName"`
	UpdatedAt         string     `json:"updatedAt"`
	StatusCheckRollup []rawCheck `json:"statusCheckRollup"`
}

type rawCheck struct {
	Status     string `json:"status"`
	Conclusion string `json:"conclusion"`
	State      string `json:"state"`
}

func rollupState(checks []rawCheck) string {
	if len(checks) == 0 {
		return "NONE"
	}
	failed, pending := 0, 0
	for _, c := range checks {
		if c.State != "" {
			switch c.State {
			case "SUCCESS":
			case "PENDING", "EXPECTED":
				pending++
			default:
				failed++
			}
			continue
		}
		if c.Status != "COMPLETED" {
			pending++
			continue
		}
		switch c.Conclusion {
		case "SUCCESS", "SKIPPED", "NEUTRAL":
		default:
			failed++
		}
	}
	if failed > 0 {
		return "FAILURE"
	}
	if pending > 0 {
		return "PENDING"
	}
	return "SUCCESS"
}

func ListPRs(ctx context.Context, limit int, includeBots bool) ([]PR, error) {
	out, err := exec.CommandContext(ctx, "gh", "pr", "list",
		"--repo", Repo,
		"--state", "open",
		"--limit", fmt.Sprint(limit),
		"--json", "number,title,author,headRefName,updatedAt,isDraft,statusCheckRollup",
	).Output()
	if err != nil {
		return nil, err
	}

	var raws []rawPR
	if err := json.Unmarshal(out, &raws); err != nil {
		return nil, err
	}

	prs := make([]PR, 0, len(raws))
	for _, r := range raws {
		if !includeBots && isBot(r.Author.Login) {
			continue
		}
		prs = append(prs, PR{
			Number:    r.Number,
			Title:     r.Title,
			Author:    r.Author.Login,
			HeadRef:   r.HeadRefName,
			CIState:   rollupState(r.StatusCheckRollup),
			IsDraft:   r.IsDraft,
			UpdatedAt: r.UpdatedAt,
		})
	}
	return prs, nil
}

func GetPR(ctx context.Context, number int) (*PR, error) {
	out, err := exec.CommandContext(ctx, "gh", "pr", "view", fmt.Sprint(number),
		"--repo", Repo,
		"--json", "number,title,author,headRefName,updatedAt,isDraft,statusCheckRollup",
	).Output()
	if err != nil {
		return nil, err
	}

	var r rawPR
	if err := json.Unmarshal(out, &r); err != nil {
		return nil, err
	}
	return &PR{
		Number:    r.Number,
		Title:     r.Title,
		Author:    r.Author.Login,
		HeadRef:   r.HeadRefName,
		CIState:   rollupState(r.StatusCheckRollup),
		IsDraft:   r.IsDraft,
		UpdatedAt: r.UpdatedAt,
	}, nil
}
