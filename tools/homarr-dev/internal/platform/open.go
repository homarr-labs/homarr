package platform

import (
	"fmt"
	"os/exec"
	"runtime"
)

func OpenURL(url string) error {
	name, args, err := openCommand(runtime.GOOS, url)
	if err != nil {
		return err
	}
	return exec.Command(name, args...).Start()
}

var platformOpeners = map[string]func(string) (string, []string){
	"darwin":  func(u string) (string, []string) { return "open", []string{u} },
	"linux":   func(u string) (string, []string) { return "xdg-open", []string{u} },
	"windows": func(u string) (string, []string) { return "rundll32", []string{"url.dll,FileProtocolHandler", u} },
}

func openCommand(goos, url string) (string, []string, error) {
	if opener, supported := platformOpeners[goos]; supported {
		name, args := opener(url)
		return name, args, nil
	}
	return "", nil, fmt.Errorf("opening URLs is not supported on %s", goos)
}
