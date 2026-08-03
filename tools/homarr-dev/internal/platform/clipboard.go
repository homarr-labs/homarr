package platform

import "github.com/atotto/clipboard"

func CopyText(value string) error {
	return clipboard.WriteAll(value)
}
