package docker

import (
	"os"
	"testing"
)

func TestParseImageListFiltersHomarrTags(t *testing.T) {
	output := []byte("{\"ID\":\"sha256:1\",\"Repository\":\"homarr\",\"Tag\":\"dev\"}\n{\"ID\":\"sha256:2\",\"Repository\":\"other\",\"Tag\":\"dev\"}\n")
	images, err := parseImageList(output)
	if err != nil {
		t.Fatal(err)
	}
	if len(images) != 1 || images[0].Reference() != "homarr:dev" {
		t.Fatalf("images = %#v, want homarr:dev", images)
	}
}

func TestInspectImageLabelsWithNoImages(t *testing.T) {
	labels, err := inspectImageLabels(t.Context(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if labels != nil {
		t.Fatalf("labels = %#v, want nil", labels)
	}
}

func TestBuildCommandIncludesProvenance(t *testing.T) {
	command, err := BuildCommand(t.Context(), BuildOptions{
		Context:  "../../../..",
		Tag:      "feature",
		Source:   "/tmp/homarr",
		Revision: "abc123",
		PRNumber: 42,
	})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"docker", "build", "--label", SourceLabel + "=/tmp/homarr", "--label", RevisionLabel + "=abc123", "--label", PRLabel + "=42", "-t", "homarr:feature", "."}
	if len(command.Args) != len(want) {
		t.Fatalf("args = %v, want %v", command.Args, want)
	}
	for index := range want {
		if command.Args[index] != want[index] {
			t.Fatalf("args = %v, want %v", command.Args, want)
		}
	}
}

func TestListLocalImagesIntegration(t *testing.T) {
	wantTag := os.Getenv("HOMARR_TEST_LOCAL_IMAGE")
	if wantTag == "" {
		t.Skip("set HOMARR_TEST_LOCAL_IMAGE to a local homarr image tag")
	}
	images, err := ListLocalImages(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for _, image := range images {
		if image.Tag == wantTag {
			if image.Source == "" || image.Revision == "" {
				t.Fatalf("image %#v is missing provenance", image)
			}
			return
		}
	}
	t.Fatalf("homarr:%s was not discovered", wantTag)
}
