package platform

import "testing"

func TestOpenCommand(t *testing.T) {
	tests := []struct {
		goos string
		name string
	}{
		{goos: "darwin", name: "open"},
		{goos: "linux", name: "xdg-open"},
		{goos: "windows", name: "rundll32"},
	}
	for _, test := range tests {
		t.Run(test.goos, func(t *testing.T) {
			name, args, err := openCommand(test.goos, "https://example.com")
			if err != nil {
				t.Fatal(err)
			}
			if name != test.name || len(args) == 0 {
				t.Fatalf("command = %s %v", name, args)
			}
		})
	}
}
