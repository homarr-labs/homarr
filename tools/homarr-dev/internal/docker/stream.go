package docker

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

// StreamLine is one line of output from a streamed command. Err is set only on
// the final line, which also has Done set.
type StreamLine struct {
	Text string
	Err  error
	Done bool
}

// splitLines is a bufio.SplitFunc that treats both newline and carriage return
// as terminators so in-place progress updates arrive as discrete lines.
func splitLines(data []byte, atEOF bool) (advance int, token []byte, err error) {
	for index, char := range data {
		if char == '\n' || char == '\r' {
			return index + 1, data[:index], nil
		}
	}
	if atEOF && len(data) > 0 {
		return len(data), data, nil
	}
	return 0, nil, nil
}

// StreamCommand runs cmd with stdout and stderr merged and delivers its output
// line by line. The channel is closed after a final Done line carrying the exit
// status. Cancelling the command's context terminates the process.
func StreamCommand(cmd *exec.Cmd) (<-chan StreamLine, error) {
	reader, writer := io.Pipe()
	cmd.Stdout = writer
	cmd.Stderr = writer
	if err := cmd.Start(); err != nil {
		_ = reader.Close()
		_ = writer.Close()
		return nil, err
	}

	// Wait runs on its own goroutine and closes the write end, which is what
	// gives the scanner an EOF. Waiting first and closing afterwards deadlocks:
	// the scanner would block forever on a pipe this process still holds open.
	// Wait only returns once every byte has been copied into the pipe, so no
	// output can be lost to the close.
	waited := make(chan error, 1)
	go func() {
		err := cmd.Wait()
		_ = writer.Close()
		waited <- err
	}()

	lines := make(chan StreamLine, 256)
	go func() {
		defer close(lines)
		scanner := bufio.NewScanner(reader)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		scanner.Split(splitLines)
		last := ""
		for scanner.Scan() {
			text := strings.TrimRight(scanner.Text(), "\r\n")
			if strings.TrimSpace(text) == "" {
				continue
			}
			last = text
			lines <- StreamLine{Text: text}
		}
		_ = reader.Close()
		err := <-waited
		if err != nil && last != "" {
			err = fmt.Errorf("%w: %s", err, strings.TrimSpace(last))
		}
		lines <- StreamLine{Done: true, Err: err}
	}()
	return lines, nil
}

// StreamContainerLogs follows a container's logs, replaying the last tail lines
// first. The stream ends when the container stops or ctx is cancelled.
func StreamContainerLogs(ctx context.Context, name string, tail int) (<-chan StreamLine, error) {
	cmd := exec.CommandContext(ctx, "docker", "logs", "--follow", "--tail", fmt.Sprint(tail), name)
	cmd.Cancel = func() error { return cmd.Process.Kill() }
	return StreamCommand(cmd)
}

// BuildCommandStreaming returns a build command configured for BuildKit's plain
// progress output, which is the only format that can be parsed line by line.
func BuildCommandStreaming(ctx context.Context, options BuildOptions) (*exec.Cmd, error) {
	cmd, err := BuildCommand(ctx, options)
	if err != nil {
		return nil, err
	}
	cmd.Args = append(cmd.Args[:len(cmd.Args)-1], "--progress=plain", cmd.Args[len(cmd.Args)-1])
	cmd.Env = append(cmd.Environ(), "BUILDKIT_PROGRESS=plain", "DOCKER_BUILDKIT=1")
	return cmd, nil
}
