package cli

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/docker"
	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/run"
)

func (a *App) buildCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "build [name]",
		Short: "Build a local Homarr image from this checkout or a pull request",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			tag := ""
			if len(args) > 0 {
				tag = args[0]
			}
			if a.buildPR < 0 {
				return fmt.Errorf("PR number must be positive")
			}
			if a.buildPR > 0 {
				if tag == "" {
					tag = fmt.Sprintf("pr-%d", a.buildPR)
				}
				return run.BuildPRImage(a.buildPR, tag)
			}
			if tag == "" {
				return fmt.Errorf("image name is required when --pr is not set")
			}
			return run.BuildCurrentImage(tag, ".")
		},
	}
	cmd.Flags().IntVarP(&a.buildPR, "pr", "p", 0, "Build a pull request in a temporary checkout")
	return cmd
}

func (a *App) rebuildCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "rebuild <name>",
		Short: "Rebuild a local image from its recorded checkout or pull request",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			image, err := findLocalImage(cmd, args[0])
			if err != nil {
				return err
			}
			return run.RebuildImage(image)
		},
	}
}

// findLocalImage resolves a tag or full reference to a local image, so both
// `homarr rebuild dev` and `homarr rebuild homarr:dev` work.
func findLocalImage(cmd *cobra.Command, name string) (docker.Image, error) {
	images, err := docker.ListLocalImages(cmd.Context())
	if err != nil {
		return docker.Image{}, err
	}
	tag := name
	if strings.Contains(name, ":") {
		_, tag = docker.SplitImageReference(name)
	}
	for _, image := range images {
		if image.Tag == tag {
			return image, nil
		}
	}
	return docker.Image{}, fmt.Errorf("local image homarr:%s was not found", tag)
}
