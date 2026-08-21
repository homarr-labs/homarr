package run

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

// Cleanup releases a temporary checkout. It is always safe to call.
type Cleanup func()

func noCleanup() {}

// CurrentBuildOptions describes a build of the checkout that contains
// directory, recording the source and revision on the image so it can be
// rebuilt later without the user remembering where it came from.
func CurrentBuildOptions(ctx context.Context, tag, directory string) (docker.BuildOptions, error) {
	root, revision, err := checkoutDetails(ctx, directory)
	if err != nil {
		return docker.BuildOptions{}, err
	}
	return docker.BuildOptions{Context: root, Tag: tag, Source: root, Revision: revision}, nil
}

// PRBuildOptions clones a pull request into a temporary checkout and describes
// a build of it. The returned Cleanup must run once the build has finished.
//
// Progress is reported through log rather than written to stdout, because the
// caller is a background job rendering inside a TUI, not a shell.
func PRBuildOptions(ctx context.Context, number int, tag string, log func(string)) (docker.BuildOptions, Cleanup, error) {
	if number <= 0 {
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("PR number must be positive")
	}
	if log == nil {
		log = func(string) {}
	}
	temporaryRoot, err := os.MkdirTemp("", "homarr-pr-*")
	if err != nil {
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("create temporary checkout: %w", err)
	}
	cleanup := func() { _ = os.RemoveAll(temporaryRoot) }

	checkout := filepath.Join(temporaryRoot, "homarr")
	if err := os.MkdirAll(checkout, 0o755); err != nil {
		cleanup()
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("create checkout directory: %w", err)
	}

	repoURL := fmt.Sprintf("https://github.com/%s.git", gh.Repo)
	branchName := fmt.Sprintf("pr-%d", number)
	refSpec := fmt.Sprintf("refs/pull/%d/head:%s", number, branchName)

	log(fmt.Sprintf("fetching PR #%d (shallow) from %s", number, gh.Repo))
	initCmd := exec.CommandContext(ctx, "git", "init", checkout)
	if err := runLogged(initCmd, log); err != nil {
		cleanup()
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("init git repository: %w", err)
	}

	fetchCmd := exec.CommandContext(ctx, "git", "-C", checkout, "fetch", "--depth", "1", repoURL, refSpec)
	if err := runLogged(fetchCmd, log); err != nil {
		cleanup()
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("fetch PR #%d: %w", number, err)
	}

	checkoutCmd := exec.CommandContext(ctx, "git", "-C", checkout, "checkout", branchName)
	if err := runLogged(checkoutCmd, log); err != nil {
		cleanup()
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("checkout PR #%d: %w", number, err)
	}

	_, revision, err := checkoutDetails(ctx, checkout)
	if err != nil {
		cleanup()
		return docker.BuildOptions{}, noCleanup, err
	}
	log("building " + revision[:min(len(revision), 12)])
	return docker.BuildOptions{
		Context:  checkout,
		Tag:      tag,
		Source:   fmt.Sprintf("https://github.com/%s/pull/%d", gh.Repo, number),
		Revision: revision,
		PRNumber: number,
	}, cleanup, nil
}

// RebuildOptions describes a rebuild of an existing local image from the
// provenance recorded on it, whether that is a pull request or a checkout.
func RebuildOptions(ctx context.Context, image docker.Image, log func(string)) (docker.BuildOptions, Cleanup, error) {
	if image.PRNumber > 0 {
		return PRBuildOptions(ctx, image.PRNumber, image.Tag, log)
	}
	if image.Source == "" {
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("homarr:%s has no build source metadata", image.Tag)
	}
	if info, err := os.Stat(image.Source); err != nil || !info.IsDir() {
		return docker.BuildOptions{}, noCleanup, fmt.Errorf("build source %s is no longer available", image.Source)
	}
	options, err := CurrentBuildOptions(ctx, image.Tag, image.Source)
	return options, noCleanup, err
}

func runLogged(command *exec.Cmd, log func(string)) error {
	command.Env = append(
		os.Environ(),
		"MISE_TRUSTED_CONFIG_PATHS=*",
		"MISE_QUIET=1",
		"MISE_SILENT=1",
		"MISE_YES=1",
		"MISE_OVERRIDE_CONFIG_FILENAMES=",
	)
	lines, err := docker.StreamCommand(command)
	if err != nil {
		return err
	}
	for line := range lines {
		if line.Done {
			return line.Err
		}
		log(line.Text)
	}
	return nil
}
