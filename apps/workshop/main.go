package main

import (
	"compress/gzip"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/hook"
	"github.com/pocketbase/pocketbase/tools/osutils"
	"github.com/pocketbase/pocketbase/tools/router"
)

func main() {
	app := pocketbase.New()

	var hooksDir string
	app.RootCmd.PersistentFlags().StringVar(&hooksDir, "hooksDir", "", "the directory with the JS app hooks")

	var hooksWatch bool
	app.RootCmd.PersistentFlags().BoolVar(&hooksWatch, "hooksWatch", true, "auto restart on JS hook changes")

	var hooksPool int
	app.RootCmd.PersistentFlags().IntVar(&hooksPool, "hooksPool", 15, "the number of prewarmed JS runtimes")

	var migrationsDir string
	app.RootCmd.PersistentFlags().StringVar(&migrationsDir, "migrationsDir", "", "the directory with JS migrations")

	var automigrate bool
	app.RootCmd.PersistentFlags().BoolVar(&automigrate, "automigrate", true, "enable automatic migrations")

	var publicDir string
	app.RootCmd.PersistentFlags().StringVar(&publicDir, "publicDir", defaultPublicDir(), "the static files directory")

	var indexFallback bool
	app.RootCmd.PersistentFlags().BoolVar(&indexFallback, "indexFallback", false, "serve index.html for missing paths")

	_ = app.RootCmd.ParseFlags(os.Args[1:])

	jsvm.MustRegister(app, jsvm.Config{
		MigrationsDir: migrationsDir,
		HooksDir:      hooksDir,
		HooksWatch:    hooksWatch,
		HooksPoolSize: hooksPool,
	})
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  automigrate,
		Dir:          migrationsDir,
	})

	registerHomarrProvider(app)
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(event *core.ServeEvent) error {
			if !event.Router.HasRoute(http.MethodGet, "/{path...}") {
				event.Router.GET("/{path...}", staticWebsite(os.DirFS(publicDir), indexFallback)).Bind(
					staticCompression(),
				)
			}
			return event.Next()
		},
		Priority: 999,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// staticCompression returns gzip middleware with a 1024-byte buffering threshold.
// It skips requests with a nonempty Range header, recognized compressed asset
// extensions, or a gzip quality value that cannot be parsed or is nonpositive.
// Invalid quality values disable compression without returning a parse error;
// errors from the delegated middleware and downstream handlers are propagated.
func staticCompression() *hook.Handler[*core.RequestEvent] {
	compression := apis.GzipWithConfig(apis.GzipConfig{Level: gzip.BestSpeed, MinLength: 1024})
	compress := compression.Func
	compression.Func = func(event *core.RequestEvent) error {
		// A compressed 206 response no longer matches its Content-Range and cannot be cached as a video range.
		if event.Request.Header.Get("Range") != "" || isCompressedAsset(event.Request.URL.Path) {
			return event.Next()
		}
		// PocketBase's middleware matches "gzip" without checking its quality value.
		// Respect clients that explicitly refuse it before delegating compression.
		for _, encoding := range strings.Split(event.Request.Header.Get("Accept-Encoding"), ",") {
			name, parameters, _ := strings.Cut(encoding, ";")
			if !strings.EqualFold(strings.TrimSpace(name), "gzip") {
				continue
			}
			for _, parameter := range strings.Split(parameters, ";") {
				key, value, found := strings.Cut(parameter, "=")
				if !found || !strings.EqualFold(strings.TrimSpace(key), "q") {
					continue
				}
				quality, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
				if err != nil || quality <= 0 {
					event.Response.Header().Add("Vary", "Accept-Encoding")
					return event.Next()
				}
			}
		}
		return compress(event)
	}
	return compression
}

// isCompressedAsset reports whether path has a recognized compressed image,
// video, or font extension, ignoring case. It does not inspect file contents.
func isCompressedAsset(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".png", ".webm", ".webp", ".woff", ".woff2":
		return true
	default:
		return false
	}
}

// staticWebsite serves fsys through a route with a "{path...}" wildcard, applies
// path-based cache headers, and preserves query strings in canonical redirects.
// If indexFallback is true, missing resources first fall back to root index.html.
// Remaining file-not-found errors outside /api/ serve 404.html with status 404
// when readable; otherwise the original error is returned. Other serving errors
// and errors writing the 404 response are propagated. Serving errors and custom
// 404 responses set Cache-Control to no-store. A nil fsys panics.
func staticWebsite(fsys fs.FS, indexFallback bool) func(*core.RequestEvent) error {
	serve := apis.Static(fsys, indexFallback)
	return func(event *core.RequestEvent) error {
		event.Response.Header().Set("Cache-Control", staticCacheControl(event.Request.URL.Path))
		if event.Request.URL.RawQuery != "" {
			// PocketBase's canonical file/directory redirects omit the request query.
			event.Response = &staticRedirectResponse{event.Response, event.Request.URL.RawQuery}
		}
		err := serve(event)
		if err != nil {
			event.Response.Header().Set("Cache-Control", "no-store")
		}
		if !errors.Is(err, router.ErrFileNotFound) || strings.HasPrefix(event.Request.URL.Path, "/api/") {
			return err
		}
		page, readErr := fs.ReadFile(fsys, "404.html")
		if readErr != nil {
			return err
		}
		event.Response.Header().Set("Cache-Control", "no-store")
		return event.HTML(http.StatusNotFound, string(page))
	}
}

// staticCacheControl returns the cache policy for a URL path without its query.
// Workshop, marketplace, and runtime configuration paths use no-store; Next.js
// build assets are immutable for one year. Recognized asset paths or extensions
// use 600-second browser and 86400-second shared-cache lifetimes; other paths
// use 60 and 300 seconds, respectively. Prefix matching is case-sensitive;
// extension matching is case-insensitive. Response status is not considered.
func staticCacheControl(path string) string {
	if path == "/workshop-runtime-config.js" {
		return "no-store"
	}
	for _, prefix := range []string{"/workshop", "/marketplace"} {
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return "no-store"
		}
	}
	if strings.HasPrefix(path, "/_next/static/") {
		return "public, max-age=31536000, immutable"
	}
	for _, prefix := range []string{"/img/", "/media/", "/videos/", "/data/", "/custom-widgets/"} {
		if strings.HasPrefix(path, prefix) {
			return "public, max-age=600, s-maxage=86400"
		}
	}
	switch strings.ToLower(filepath.Ext(path)) {
	case ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".png", ".svg", ".ttf", ".webm", ".webp", ".woff", ".woff2":
		return "public, max-age=600, s-maxage=86400"
	default:
		return "public, max-age=60, s-maxage=300"
	}
}

type staticRedirectResponse struct {
	http.ResponseWriter
	query string
}

func (response *staticRedirectResponse) WriteHeader(status int) {
	if location := response.Header().Get("Location"); status == http.StatusMovedPermanently && location != "" {
		response.Header().Set("Location", location+"?"+response.query)
	}
	response.ResponseWriter.WriteHeader(status)
}

func defaultPublicDir() string {
	if osutils.IsProbablyGoRun() {
		return "./pb_public"
	}
	return filepath.Join(os.Args[0], "../pb_public")
}
