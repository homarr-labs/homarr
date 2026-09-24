package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"
)

func TestStaticWebsite(t *testing.T) {
	files := fstest.MapFS{
		"index.html":      {Data: []byte("Home")},
		"404.html":        {Data: []byte("Page not found")},
		"api/search":      {Data: []byte(`{"type":"advanced"}`)},
		"llms.txt":        {Data: []byte("# Docs")},
		"docs/index.html": {Data: []byte("Documentation")},
	}
	for _, scenario := range []struct {
		path   string
		status int
		body   string
	}{
		{"/docs/missing", http.StatusNotFound, "Page not found"},
		{"/api/search?q=board", http.StatusOK, `{"type":"advanced"}`},
		{"/llms.txt", http.StatusOK, "# Docs"},
	} {
		t.Run(scenario.path, func(t *testing.T) {
			event := new(core.RequestEvent)
			event.Request = httptest.NewRequest(http.MethodGet, scenario.path, nil)
			event.Request.SetPathValue(apis.StaticWildcardParam, strings.TrimPrefix(event.Request.URL.Path, "/"))
			response := httptest.NewRecorder()
			event.Response = response
			if err := staticWebsite(files, false)(event); err != nil {
				t.Fatal(err)
			}
			if response.Code != scenario.status || response.Body.String() != scenario.body {
				t.Fatalf("got %d %q", response.Code, response.Body.String())
			}
		})
	}
	event := new(core.RequestEvent)
	event.Request = httptest.NewRequest(http.MethodGet, "/api/missing", nil)
	event.Request.SetPathValue(apis.StaticWildcardParam, "api/missing")
	event.Response = httptest.NewRecorder()
	if err := staticWebsite(files, false)(event); !errors.Is(err, router.ErrFileNotFound) {
		t.Fatalf("missing API should retain API error, got %v", err)
	}
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		event := new(core.RequestEvent)
		event.Request = httptest.NewRequest(method, "/docs?example=1", nil)
		event.Request.SetPathValue(apis.StaticWildcardParam, "docs")
		response := httptest.NewRecorder()
		event.Response = response
		if err := staticWebsite(files, false)(event); err != nil {
			t.Fatal(err)
		}
		if response.Code != http.StatusMovedPermanently || response.Header().Get("Location") != "/docs/?example=1" {
			t.Fatalf("%s redirect lost query: %d %s", method, response.Code, response.Header().Get("Location"))
		}
	}
}
