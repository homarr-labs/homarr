package run

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
)

func BuildCurrentImage(tag, directory string) error {
	return buildCurrentImage(context.Background(), tag, directory, os.Stdout, os.Stderr)
}

func buildCurrentImage(ctx context.Context, tag, directory string, stdout, stderr io.Writer) error {
	options, err := CurrentBuildOptions(ctx, tag, directory)
	if err != nil {
		return err
	}
	return docker.BuildContext(ctx, options, stdout, stderr)
}

func BuildPRImage(number int, tag string) error {
	return buildPRImage(context.Background(), number, tag, os.Stdout, os.Stderr)
}

func buildPRImage(ctx context.Context, number int, tag string, stdout, stderr io.Writer) error {
	options, cleanup, err := PRBuildOptions(ctx, number, tag, func(line string) {
		_, _ = fmt.Fprintln(stdout, line)
	})
	if err != nil {
		return err
	}
	defer cleanup()
	return docker.BuildContext(ctx, options, stdout, stderr)
}

func prFetchArgs(repoURL, refSpec string) []string {
	return []string{"fetch", "--depth=1", repoURL, refSpec}
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
	cmdRoot := exec.CommandContext(ctx, "git", "-C", directory, "rev-parse", "--show-toplevel")
	cmdRoot.Env = append(
		os.Environ(),
		"MISE_TRUSTED_CONFIG_PATHS=*",
		"MISE_QUIET=1",
		"MISE_SILENT=1",
		"MISE_YES=1",
		"MISE_OVERRIDE_CONFIG_FILENAMES=",
	)
	rootOutput, err := cmdRoot.CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("find Homarr checkout: %w: %s", err, strings.TrimSpace(string(rootOutput)))
	}
	root = strings.TrimSpace(string(rootOutput))
	if _, err := os.Stat(filepath.Join(root, "Dockerfile")); err != nil {
		return "", "", fmt.Errorf("%s is not a Homarr checkout", root)
	}
	cmdRev := exec.CommandContext(ctx, "git", "-C", root, "rev-parse", "HEAD")
	cmdRev.Env = append(
		os.Environ(),
		"MISE_TRUSTED_CONFIG_PATHS=*",
		"MISE_QUIET=1",
		"MISE_SILENT=1",
		"MISE_YES=1",
		"MISE_OVERRIDE_CONFIG_FILENAMES=",
	)
	revisionOutput, err := cmdRev.CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("read checkout revision: %w: %s", err, strings.TrimSpace(string(revisionOutput)))
	}
	return root, strings.TrimSpace(string(revisionOutput)), nil
}
