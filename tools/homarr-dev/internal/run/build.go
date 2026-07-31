package run

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/gh"
)

func BuildCurrentImage(tag, directory string) error {
	return buildCurrentImage(context.Background(), tag, directory, os.Stdout, os.Stderr)
}

func buildCurrentImage(ctx context.Context, tag, directory string, stdout, stderr io.Writer) error {
	root, revision, err := checkoutDetails(ctx, directory)
	if err != nil {
		return err
	}
	return docker.BuildContext(ctx, docker.BuildOptions{Context: root, Tag: tag, Source: root, Revision: revision}, stdout, stderr)
}

func BuildPRImage(number int, tag string) error {
	return buildPRImage(context.Background(), number, tag, os.Stdout, os.Stderr)
}

func buildPRImage(ctx context.Context, number int, tag string, stdout, stderr io.Writer) error {
	if number <= 0 {
		return fmt.Errorf("PR number must be positive")
	}
	temporaryRoot, err := os.MkdirTemp("", "homarr-pr-*")
	if err != nil {
		return fmt.Errorf("create temporary checkout: %w", err)
	}
	defer os.RemoveAll(temporaryRoot)

	checkout := filepath.Join(temporaryRoot, "homarr")
	clone := exec.CommandContext(ctx, "gh", "repo", "clone", gh.Repo, checkout, "--", "--filter=blob:none")
	clone.Stdout = stdout
	clone.Stderr = stderr
	if err := clone.Run(); err != nil {
		return fmt.Errorf("clone %s: %w", gh.Repo, err)
	}
	command := exec.CommandContext(ctx, "gh", "pr", "checkout", strconv.Itoa(number), "--detach")
	command.Dir = checkout
	command.Stdout = stdout
	command.Stderr = stderr
	if err := command.Run(); err != nil {
		return fmt.Errorf("checkout PR #%d: %w", number, err)
	}
	_, revision, err := checkoutDetails(ctx, checkout)
	if err != nil {
		return err
	}
	return docker.BuildContext(ctx, docker.BuildOptions{
		Context:  checkout,
		Tag:      tag,
		Source:   fmt.Sprintf("https://github.com/%s/pull/%d", gh.Repo, number),
		Revision: revision,
		PRNumber: number,
	}, stdout, stderr)
}

func RebuildImage(image docker.Image) error {
	return RebuildImageContext(context.Background(), image, os.Stdout, os.Stderr)
}

func RebuildImageContext(ctx context.Context, image docker.Image, stdout, stderr io.Writer) error {
	if image.PRNumber > 0 {
		return buildPRImage(ctx, image.PRNumber, image.Tag, stdout, stderr)
	}
	if image.Source == "" {
		return fmt.Errorf("homarr:%s has no build source metadata", image.Tag)
	}
	if info, err := os.Stat(image.Source); err != nil || !info.IsDir() {
		return fmt.Errorf("build source %s is no longer available", image.Source)
	}
	return buildCurrentImage(ctx, image.Tag, image.Source, stdout, stderr)
}

func checkoutDetails(ctx context.Context, directory string) (root string, revision string, err error) {
	rootOutput, err := exec.CommandContext(ctx, "git", "-C", directory, "rev-parse", "--show-toplevel").CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("find Homarr checkout: %w: %s", err, strings.TrimSpace(string(rootOutput)))
	}
	root = strings.TrimSpace(string(rootOutput))
	if _, err := os.Stat(filepath.Join(root, "Dockerfile")); err != nil {
		return "", "", fmt.Errorf("%s is not a Homarr checkout", root)
	}
	revisionOutput, err := exec.CommandContext(ctx, "git", "-C", root, "rev-parse", "HEAD").CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("read checkout revision: %w: %s", err, strings.TrimSpace(string(revisionOutput)))
	}
	return root, strings.TrimSpace(string(revisionOutput)), nil
}
