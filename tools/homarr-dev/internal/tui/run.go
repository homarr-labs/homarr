package tui

import tea "charm.land/bubbletea/v2"

// Run starts the interactive application. showInstances opens directly on the
// instances screen instead of the development browser.
func Run(showInstances bool) error {
	model := New(showInstances)
	program := tea.NewProgram(model)
	final, err := program.Run()
	// Background work outlives the render loop unless it is stopped here, and a
	// stray `docker logs --follow` would keep the terminal's child process alive
	// after the CLI has exited.
	if quit, ok := final.(Model); ok {
		quit.tasks.CancelAll()
		quit.logs.Close()
	}
	return err
}

// RunDev opens the development browser.
func RunDev() error { return Run(false) }

// RunDashboard opens the instances screen.
func RunDashboard() error { return Run(true) }
