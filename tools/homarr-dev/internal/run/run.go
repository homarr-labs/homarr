package run

import (
	"fmt"
	"os"
	"strings"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

type Options struct {
	PR         int
	Tag        string
	Demo       bool
	Env        []string
	FetchTitle bool
}

type Plan struct {
	Image    string
	Name     string
	Volume   string
	Label    string
	TabTitle string
	HostPort int
	Env      []string
	Platform string
	Pull     bool
	PRNumber int
}

func BuildPlan(opts Options) (*Plan, error) {
	p := &Plan{}

	if opts.PR > 0 {
		p.PRNumber = opts.PR
		p.Image = fmt.Sprintf("ghcr.io/homarr-labs/homarr-test:pr-%d", opts.PR)
		p.Name = fmt.Sprintf("homarr_pr_%d", opts.PR)
		p.Volume = fmt.Sprintf("homarr_pr_%d_data", opts.PR)
		p.Label = fmt.Sprintf("PR #%d", opts.PR)
		p.Pull = true
		p.Platform = "linux/amd64"
		if opts.FetchTitle {
			if pr, err := gh.GetPR(opts.PR); err == nil && pr.Title != "" {
				p.Label = fmt.Sprintf("PR #%d — %s", opts.PR, pr.Title)
				p.TabTitle = truncate(fmt.Sprintf("🦞 %s", pr.Title), 40)
			}
		}
	} else if opts.Tag != "" {
		p.Image = "homarr:" + opts.Tag
		p.Name = "homarr_" + opts.Tag
		p.Volume = "homarr_" + opts.Tag + "_data"
		p.Label = "tag: " + opts.Tag
	} else {
		return nil, fmt.Errorf("need a tag or --pr")
	}

	if p.TabTitle == "" {
		p.TabTitle = "🦞 " + strings.TrimPrefix(p.Label, "tag: ")
	}

	p.HostPort = docker.FindFreePort(7575)
	p.Env = append(p.Env, opts.Env...)
	if opts.Demo {
		p.Env = append(p.Env, "DEMO_MODE=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true")
		p.Label += " (demo)"
	}
	return p, nil
}

func StartDetached(p *Plan) error {
	return start(p, true)
}

func StartForeground(p *Plan) error {
	return start(p, false)
}

func start(p *Plan, daemon bool) error {
	const attempts = 5
	for attempt := 0; attempt < attempts; attempt++ {
		err := docker.Start(docker.StartOptions{
			Name:       p.Name,
			Image:      p.Image,
			Volume:     p.Volume,
			HostPort:   p.HostPort,
			Env:        p.Env,
			Platform:   p.Platform,
			PullAlways: p.Pull && attempt == 0,
			Daemon:     daemon,
		})
		if err == nil {
			return nil
		}
		if !docker.IsPortConflict(err) || attempt == attempts-1 {
			if docker.IsPortConflict(err) {
				return fmt.Errorf("unable to bind a host port after %d attempts; restart Docker or OrbStack: %w", attempts, err)
			}
			return err
		}
		previousPort := p.HostPort
		p.HostPort = docker.FindFreePort(p.HostPort + 1)
		if !daemon {
			fmt.Fprintf(os.Stderr, "Port %d unavailable; retrying on %d.\n", previousPort, p.HostPort)
		}
	}
	return nil
}

func SetTerminalChrome(title string) {
	fmt.Printf("\033]0;%s\007", title)
	if os.Getenv("ITERM_SESSION_ID") != "" {
		fmt.Printf("\033]6;1;bg;red;brightness;%d\007", randInt())
		fmt.Printf("\033]6;1;bg;green;brightness;%d\007", randInt())
		fmt.Printf("\033]6;1;bg;blue;brightness;%d\007", randInt())
	}
	if tabID := os.Getenv("TABBY_TAB_ID"); tabID != "" {
		if dir := os.Getenv("TABBY_TITLES_DIR"); dir != "" {
			os.WriteFile(fmt.Sprintf("%s/%s.txt", dir, tabID), []byte(title), 0644)
		}
	}
}

var seed = int64(os.Getpid())

func randInt() int {
	seed = seed*1103515245 + 12345
	return int((seed / 65536) % 256)
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n-1]) + "…"
}
