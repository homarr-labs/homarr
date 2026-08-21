package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// Volume is a Docker volume that belongs to a Homarr instance.
type Volume struct {
	Name       string
	Driver     string
	Mountpoint string
	Size       string
	InUse      bool
}

// PRNumber returns the pull request a volume stores data for, or zero.
func (v Volume) PRNumber() int {
	var number int
	if _, err := fmt.Sscanf(v.Name, "homarr_pr_%d_data", &number); err == nil {
		return number
	}
	return 0
}

// Tag returns the local image tag a volume stores data for, or an empty string.
func (v Volume) Tag() string {
	if v.PRNumber() > 0 {
		return ""
	}
	name := strings.TrimPrefix(v.Name, "homarr_")
	if name == v.Name {
		return ""
	}
	return strings.TrimSuffix(name, "_data")
}

// ListVolumes returns the Homarr data volumes, optionally annotated with disk
// usage when includeSizes is true.
func ListVolumes(ctx context.Context, includeSizes bool) ([]Volume, error) {
	out, err := exec.CommandContext(ctx, "docker", "volume", "ls", "--filter", "name=homarr", "--format", "{{json .}}").Output()
	if err != nil {
		return nil, fmt.Errorf("list Homarr volumes: %w", err)
	}
	volumes, err := parseVolumeList(out)
	if err != nil {
		return nil, err
	}
	var sizes map[string]string
	if includeSizes {
		sizes = volumeSizes(ctx)
	}
	inUse := volumesInUse(ctx)
	for index := range volumes {
		if sizes != nil {
			if size, known := sizes[volumes[index].Name]; known {
				volumes[index].Size = size
			}
		}
		volumes[index].InUse = inUse[volumes[index].Name]
	}
	return volumes, nil
}

func parseVolumeList(output []byte) ([]Volume, error) {
	volumes := make([]Volume, 0)
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if line == "" {
			continue
		}
		var row struct {
			Name       string
			Driver     string
			Mountpoint string
			Size       string
		}
		if err := json.Unmarshal([]byte(line), &row); err != nil {
			return nil, fmt.Errorf("parse Docker volume: %w", err)
		}
		// buildx keeps its cache in volumes that match the same name filter.
		if !strings.HasPrefix(row.Name, "homarr_") && row.Name != "homarr" {
			continue
		}
		size := row.Size
		if size == "N/A" {
			size = ""
		}
		volumes = append(volumes, Volume{Name: row.Name, Driver: row.Driver, Mountpoint: row.Mountpoint, Size: size})
	}
	return volumes, nil
}

// volumeSizes reads reclaimable space per volume. `docker system df -v` is slow
// and optional, so failures degrade to unknown sizes rather than an error.
func volumeSizes(ctx context.Context) map[string]string {
	sizes := make(map[string]string)
	out, err := exec.CommandContext(ctx, "docker", "system", "df", "-v", "--format", "{{json .Volumes}}").Output()
	if err != nil {
		return sizes
	}
	var rows []struct {
		Name string
		Size string
	}
	if err := json.Unmarshal(out, &rows); err != nil {
		return sizes
	}
	for _, row := range rows {
		if row.Size != "" && row.Size != "N/A" {
			sizes[row.Name] = row.Size
		}
	}
	return sizes
}

func volumesInUse(ctx context.Context) map[string]bool {
	inUse := make(map[string]bool)
	out, err := exec.CommandContext(ctx, "docker", "ps", "-a", "--filter", "name=homarr", "--format", "{{.Mounts}}").Output()
	if err != nil {
		return inUse
	}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		for _, mount := range strings.Split(line, ",") {
			if mount = strings.TrimSpace(mount); mount != "" {
				inUse[mount] = true
			}
		}
	}
	return inUse
}

// RemoveVolume deletes a volume and the instance data it holds.
func RemoveVolume(ctx context.Context, name string) error {
	out, err := exec.CommandContext(ctx, "docker", "volume", "rm", name).CombinedOutput()
	if err != nil {
		return fmt.Errorf("remove volume %s: %w: %s", name, err, strings.TrimSpace(string(out)))
	}
	return nil
}

// RemoveImage force-deletes a local image, including any tags pointing at it.
func RemoveImage(ctx context.Context, reference string) error {
	out, err := exec.CommandContext(ctx, "docker", "image", "rm", "-f", reference).CombinedOutput()
	if err != nil {
		return fmt.Errorf("remove image %s: %w: %s", reference, err, strings.TrimSpace(string(out)))
	}
	return nil
}
