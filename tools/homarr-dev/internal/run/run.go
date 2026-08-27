package run

import (
	"context"
	"fmt"
	"os"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

type Options struct {
	Context    context.Context
	PR         int
	Tag        string
	Demo       bool
	Env        []string
	FetchTitle bool
	FindPort   func(int) int
}

type Plan struct {
	Image    string
	Name     string
	Volume   string
	Label    string
	HostPort int
	Env      []string
	Platform string
	Pull     bool
	PRNumber int
}

func BuildPlan(opts Options) (*Plan, error) {
	p := &Plan{}
	ctx := opts.Context
	if ctx == nil {
		ctx = context.Background()
	}
	findPort := opts.FindPort
	if findPort == nil {
		findPort = docker.FindFreePort
	}

	if opts.PR > 0 {
		p.PRNumber = opts.PR
		p.Image = fmt.Sprintf("ghcr.io/homarr-labs/homarr-test:pr-%d", opts.PR)
		p.Name = fmt.Sprintf("homarr_pr_%d", opts.PR)
		p.Volume = fmt.Sprintf("homarr_pr_%d_data", opts.PR)
		p.Label = fmt.Sprintf("PR #%d", opts.PR)
		p.Pull = true
		p.Platform = "linux/amd64"
		if opts.FetchTitle {
			if pr, err := gh.GetPR(ctx, opts.PR); err == nil && pr.Title != "" {
				p.Label = fmt.Sprintf("PR #%d — %s", opts.PR, pr.Title)
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

	p.HostPort = findPort(7575)
	if p.HostPort == 0 {
		return nil, fmt.Errorf("no free host port is available")
	}
	p.Env = append(p.Env, opts.Env...)
	if opts.Demo {
		p.Env = append(p.Env, "DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true")
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
		if p.HostPort == 0 {
			return fmt.Errorf("no free host port is available: %w", err)
		}
		if !daemon {
			fmt.Fprintf(os.Stderr, "Port %d unavailable; retrying on %d.\n", previousPort, p.HostPort)
		}
	}
	return nil
}
