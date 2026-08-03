package gh

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"
)

const Repo = "homarr-labs/homarr"
const prCacheTTL = 5 * time.Minute

var prListCache = struct {
	sync.Mutex
	entries map[int]cachedPRs
}{entries: make(map[int]cachedPRs)}

type cachedPRs struct {
	prs       []PR
	fetchedAt time.Time
}

func isBot(login string) bool {
	return strings.HasSuffix(login, "[bot]") || strings.HasPrefix(login, "app/")
}

type PR struct {
	Number    int    `json:"number"`
	Title     string `json:"title"`
	Author    string `json:"author"`
	HeadRef   string `json:"headRefName"`
	HeadSHA   string `json:"headRefOid"`
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
	HeadRefOID        string     `json:"headRefOid"`
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
	return listPRs(ctx, limit, includeBots, false)
}

func RefreshPRs(ctx context.Context, limit int, includeBots bool) ([]PR, error) {
	return listPRs(ctx, limit, includeBots, true)
}

func listPRs(ctx context.Context, limit int, includeBots, refresh bool) ([]PR, error) {
	cached, fetchedAt := cachedPRList(limit)
	if !refresh && !fetchedAt.IsZero() && time.Since(fetchedAt) < prCacheTTL {
		return filterPRs(cached, includeBots), nil
	}

	out, err := exec.CommandContext(ctx, "gh", "pr", "list",
		"--repo", Repo,
		"--state", "open",
		"--limit", fmt.Sprint(limit),
		"--json", "number,title,author,headRefName,headRefOid,updatedAt,isDraft,statusCheckRollup",
	).CombinedOutput()
	if err != nil {
		err = commandError(err, out)
		if len(cached) > 0 {
			return filterPRs(cached, includeBots), fmt.Errorf("%w; showing cached PRs from %s", err, fetchedAt.Format(time.Kitchen))
		}
		return nil, err
	}

	var raws []rawPR
	if err := json.Unmarshal(out, &raws); err != nil {
		return nil, err
	}

	prs := make([]PR, 0, len(raws))
	for _, r := range raws {
		prs = append(prs, PR{
			Number:    r.Number,
			Title:     r.Title,
			Author:    r.Author.Login,
			HeadRef:   r.HeadRefName,
			HeadSHA:   r.HeadRefOID,
			CIState:   rollupState(r.StatusCheckRollup),
			IsDraft:   r.IsDraft,
			UpdatedAt: r.UpdatedAt,
		})
	}
	storePRList(limit, prs)
	return filterPRs(prs, includeBots), nil
}

func cachedPRList(limit int) ([]PR, time.Time) {
	prListCache.Lock()
	defer prListCache.Unlock()
	entry := prListCache.entries[limit]
	return append([]PR(nil), entry.prs...), entry.fetchedAt
}

func storePRList(limit int, prs []PR) {
	prListCache.Lock()
	defer prListCache.Unlock()
	prListCache.entries[limit] = cachedPRs{prs: append([]PR(nil), prs...), fetchedAt: time.Now()}
}

func filterPRs(prs []PR, includeBots bool) []PR {
	filtered := make([]PR, 0, len(prs))
	for _, pr := range prs {
		if includeBots || !isBot(pr.Author) {
			filtered = append(filtered, pr)
		}
	}
	return filtered
}

func commandError(err error, output []byte) error {
	detail := strings.TrimSpace(string(output))
	if detail == "" {
		return err
	}
	return fmt.Errorf("%s: %w", detail, err)
}

func GetPR(ctx context.Context, number int) (*PR, error) {
	out, err := exec.CommandContext(ctx, "gh", "pr", "view", fmt.Sprint(number),
		"--repo", Repo,
		"--json", "number,title,author,headRefName,headRefOid,updatedAt,isDraft,statusCheckRollup",
	).CombinedOutput()
	if err != nil {
		return nil, commandError(err, out)
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
		HeadSHA:   r.HeadRefOID,
		CIState:   rollupState(r.StatusCheckRollup),
		IsDraft:   r.IsDraft,
		UpdatedAt: r.UpdatedAt,
	}, nil
}
