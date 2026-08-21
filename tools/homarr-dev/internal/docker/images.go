package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const (
	SourceLabel   = "org.homarr.dev.source"
	RevisionLabel = "org.homarr.dev.revision"
	PRLabel       = "org.homarr.dev.pr"
)

var tagPattern = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$`)

type Image struct {
	ID       string
	Tag      string
	Source   string
	Revision string
	PRNumber int
	Size     string
	Created  string
}

func (image Image) Reference() string {
	return "homarr:" + image.Tag
}

type imageListRow struct {
	ID           string
	Repository   string
	Tag          string
	Size         string
	CreatedSince string
}

func parseImageList(output []byte) ([]Image, error) {
	images := make([]Image, 0)
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if line == "" {
			continue
		}
		var row imageListRow
		if err := json.Unmarshal([]byte(line), &row); err != nil {
			return nil, fmt.Errorf("parse local Docker image: %w", err)
		}
		if row.Repository == "homarr" && row.Tag != "<none>" {
			images = append(images, Image{ID: row.ID, Tag: row.Tag, Size: row.Size, Created: row.CreatedSince})
		}
	}
	return images, nil
}

func ListLocalImages(ctx context.Context) ([]Image, error) {
	out, err := exec.CommandContext(ctx, "docker", "image", "ls", "--filter", "reference=homarr:*", "--format", "{{json .}}").Output()
	if err != nil {
		return nil, fmt.Errorf("list local Homarr images: %w", err)
	}
	images, err := parseImageList(out)
	if err != nil {
		return nil, err
	}
	labelsByImage, err := inspectImageLabels(ctx, images)
	if err != nil {
		return nil, err
	}
	for index, labels := range labelsByImage {
		images[index].Source = labels[SourceLabel]
		images[index].Revision = labels[RevisionLabel]
		images[index].PRNumber, _ = strconv.Atoi(labels[PRLabel])
	}
	return images, nil
}

func inspectImageLabels(ctx context.Context, images []Image) ([]map[string]string, error) {
	if len(images) == 0 {
		return nil, nil
	}
	args := []string{"image", "inspect", "--format", "{{json .Config.Labels}}"}
	for _, image := range images {
		args = append(args, image.Reference())
	}
	out, err := exec.CommandContext(ctx, "docker", args...).Output()
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(out)), "\n")
		if len(lines) == len(images) {
			labelsByImage := make([]map[string]string, len(images))
			valid := true
			for index, line := range lines {
				labelsByImage[index] = make(map[string]string)
				if line == "null" || line == "" {
					continue
				}
				if err := json.Unmarshal([]byte(line), &labelsByImage[index]); err != nil {
					valid = false
					break
				}
			}
			if valid {
				return labelsByImage, nil
			}
		}
	}

	labelsByImage := make([]map[string]string, len(images))
	for index, image := range images {
		labelsByImage[index] = make(map[string]string)
		singleOut, singleErr := exec.CommandContext(ctx, "docker", "image", "inspect", "--format", "{{json .Config.Labels}}", image.Reference()).Output()
		if singleErr != nil {
			continue
		}
		trimmed := strings.TrimSpace(string(singleOut))
		if trimmed == "" || trimmed == "null" {
			continue
		}
		_ = json.Unmarshal([]byte(trimmed), &labelsByImage[index])
	}
	return labelsByImage, nil
}

type BuildOptions struct {
	Context  string
	Tag      string
	Source   string
	Revision string
	PRNumber int
}

func BuildCommand(ctx context.Context, options BuildOptions) (*exec.Cmd, error) {
	if !tagPattern.MatchString(options.Tag) {
		return nil, fmt.Errorf("invalid image name %q", options.Tag)
	}
	contextPath, err := filepath.Abs(options.Context)
	if err != nil {
		return nil, fmt.Errorf("resolve build context: %w", err)
	}
	if info, err := os.Stat(filepath.Join(contextPath, "Dockerfile")); err != nil || info.IsDir() {
		return nil, fmt.Errorf("%s does not contain a Dockerfile", contextPath)
	}
	args := []string{"build", "--label", SourceLabel + "=" + options.Source, "--label", RevisionLabel + "=" + options.Revision}
	if options.PRNumber > 0 {
		args = append(args, "--label", fmt.Sprintf("%s=%d", PRLabel, options.PRNumber))
	}
	args = append(args, "-t", "homarr:"+options.Tag, ".")
	command := exec.CommandContext(ctx, "docker", args...)
	command.Dir = contextPath
	return command, nil
}

func BuildContext(ctx context.Context, options BuildOptions, stdout, stderr io.Writer) error {
	command, err := BuildCommand(ctx, options)
	if err != nil {
		return err
	}
	command.Stdout = stdout
	command.Stderr = stderr
	if err := command.Run(); err != nil {
		return fmt.Errorf("build homarr:%s: %w", options.Tag, err)
	}
	return nil
}
