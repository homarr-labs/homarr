// Command homarr is the Homarr developer CLI. It builds and launches local
// images and pull-request builds, then manages them from an interactive
// terminal application where every slow operation runs in the background.
package main

import (
	"os"

	"github.com/homarr-labs/homarr/tools/homarr-dev/internal/cli"
)

func main() {
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
