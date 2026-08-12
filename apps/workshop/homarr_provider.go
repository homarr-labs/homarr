package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	homarrProviderModelID    = "homarr/model"
	homarrProviderModelName  = "Homarr model"
	defaultOpenRouterModelID = "~deepseek/deepseek-v4-flash-latest"
	maxChatInputTokens       = 256 * 1024
	maxChatOutputTokens      = 32 * 1024
	defaultDailyLimit        = 50
	defaultGlobalDailyLimit  = 10_000
	// The Homarr composer permits five 1 MB images, which expand to about 6.7 MB as
	// base64. Keep the authenticated transport bounded without confusing bytes with
	// model tokens; validate textual and image content separately below.
	maxChatRequestBytes    = 12_000_000
	maxChatTextBytes       = 4 * maxChatInputTokens
	maxChatImageDataBytes  = 1_400_000
	maxChatImages          = 5
	maxChatMessages        = 512
	maxChatResponseBytes   = 8 << 20
	maxWebSearchResults    = 5
	maxWebSearchUses       = 3
	openRouterDefaultURL   = "https://openrouter.ai/api/v1"
	providerRequestTimeout = 5 * time.Minute
)

var (
	errProviderResponseTooLarge = errors.New("provider response is too large")
	errInvalidTools             = errors.New("invalid request tools")
	errUnsupportedTool          = errors.New("unsupported request tool")
	errTooManyImages            = errors.New("too many images or image too large")
	errInputTooLarge            = errors.New("request exceeds model input limit")
)

var clientControlledRoutingFields = []string{
	"models", "provider", "route", "plugins", "transforms", "extra_body", "extra_headers",
}

var clientControlledCostFields = []string{
	"audio", "modalities", "logprobs", "top_logprobs", "prediction", "service_tier",
}

type homarrProvider struct {
	apiKey           string
	baseURL          string
	modelID          string
	dailyLimit       int
	globalDailyLimit int
	httpClient       *http.Client
	now              func() time.Time
}

type quotaSnapshot struct {
	Limit     int       `json:"limit"`
	Used      int       `json:"used"`
	Remaining int       `json:"remaining"`
	ResetsAt  time.Time `json:"resetsAt"`
}

type providerRequest struct {
	Model    string            `json:"model"`
	Messages []providerMessage `json:"messages"`
	Stream   bool              `json:"stream"`
}

type providerMessage struct {
	Role string `json:"role"`
}

type quotaExceededError struct {
	Snapshot quotaSnapshot
}

func (err *quotaExceededError) Error() string { return "daily Homarr provider allowance exhausted" }

func registerHomarrProvider(app *pocketbase.PocketBase) {
	provider, err := newHomarrProviderFromEnv()
	if err != nil {
		panic(err)
	}

	app.OnServe().BindFunc(func(event *core.ServeEvent) error {
		group := event.Router.Group("/api/ai")
		group.GET("/v1/models", provider.models)
		group.GET("/usage", provider.usage).
			Bind(apis.RequireAuth("users")).
			Unbind(apis.DefaultActivityLoggerMiddlewareId)
		group.POST("/v1/chat/completions", provider.chat).
			Bind(apis.RequireAuth("users"), apis.BodyLimit(maxChatRequestBytes)).
			Unbind(apis.DefaultActivityLoggerMiddlewareId)
		return event.Next()
	})
}

func newHomarrProviderFromEnv() (*homarrProvider, error) {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("HOMARR_AI_OPENROUTER_BASE_URL")), "/")
	if baseURL == "" {
		baseURL = openRouterDefaultURL
	}
	parsedURL, err := url.Parse(baseURL)
	if err != nil || parsedURL.Host == "" || (parsedURL.Scheme != "https" && parsedURL.Scheme != "http") ||
		parsedURL.User != nil || parsedURL.RawQuery != "" || parsedURL.Fragment != "" {
		return nil, errors.New("HOMARR_AI_OPENROUTER_BASE_URL must be an absolute HTTP(S) URL without credentials, a query, or a fragment")
	}
	if parsedURL.Scheme != "https" && strings.TrimSpace(os.Getenv("HOMARR_AI_ALLOW_INSECURE_UPSTREAM")) != "true" {
		return nil, errors.New("HOMARR_AI_OPENROUTER_BASE_URL must use HTTPS unless HOMARR_AI_ALLOW_INSECURE_UPSTREAM=true")
	}

	modelID := strings.TrimSpace(os.Getenv("HOMARR_AI_OPENROUTER_MODEL"))
	if modelID == "" {
		modelID = defaultOpenRouterModelID
	}
	if len(modelID) > 256 || strings.IndexFunc(modelID, func(value rune) bool {
		return unicode.IsSpace(value) || unicode.IsControl(value)
	}) >= 0 {
		return nil, errors.New("HOMARR_AI_OPENROUTER_MODEL must be a non-empty model identifier of at most 256 characters")
	}

	dailyLimit := defaultDailyLimit
	if rawLimit := strings.TrimSpace(os.Getenv("HOMARR_AI_DAILY_REQUEST_LIMIT")); rawLimit != "" {
		value, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || value < 1 || value > 100_000 {
			return nil, errors.New("HOMARR_AI_DAILY_REQUEST_LIMIT must be an integer between 1 and 100000")
		}
		dailyLimit = value
	}
	globalDailyLimit := defaultGlobalDailyLimit
	if rawLimit := strings.TrimSpace(os.Getenv("HOMARR_AI_GLOBAL_DAILY_REQUEST_LIMIT")); rawLimit != "" {
		value, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || value < 1 || value > 10_000_000 {
			return nil, errors.New("HOMARR_AI_GLOBAL_DAILY_REQUEST_LIMIT must be an integer between 1 and 10000000")
		}
		globalDailyLimit = value
	}

	return &homarrProvider{
		apiKey:           strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")),
		baseURL:          baseURL,
		modelID:          modelID,
		dailyLimit:       dailyLimit,
		globalDailyLimit: globalDailyLimit,
		httpClient: &http.Client{
			Timeout: providerRequestTimeout,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
		now: time.Now,
	}, nil
}

func (provider *homarrProvider) models(event *core.RequestEvent) error {
	if provider.apiKey == "" {
		return event.JSON(http.StatusServiceUnavailable, openAIError("The Homarr provider is not configured."))
	}
	return event.JSON(http.StatusOK, map[string]any{
		"object": "list",
		"data": []map[string]any{{
			"id":             homarrProviderModelID,
			"object":         "model",
			"name":           homarrProviderModelName,
			"description":    "The tool-capable model selected by the Homarr team.",
			"owned_by":       "homarr",
			"context_length": maxChatInputTokens,
			"supported_parameters": []string{
				"tools", "tool_choice", "reasoning", "include_reasoning", "structured_outputs",
			},
			"architecture": map[string]any{
				"input_modalities":  []string{"text", "image"},
				"output_modalities": []string{"text"},
			},
		}},
	})
}

func (provider *homarrProvider) usage(event *core.RequestEvent) error {
	snapshot, err := provider.quota(event.App, event.Auth)
	if err != nil {
		return event.InternalServerError("The Homarr provider allowance could not be loaded.", nil)
	}
	return event.JSON(http.StatusOK, snapshot)
}

func (provider *homarrProvider) chat(event *core.RequestEvent) error {
	if provider.apiKey == "" {
		return event.JSON(http.StatusServiceUnavailable, openAIError("The Homarr provider is not configured."))
	}

	body, err := io.ReadAll(io.LimitReader(event.Request.Body, maxChatRequestBytes+1))
	if err != nil || len(body) > maxChatRequestBytes {
		return event.JSON(http.StatusRequestEntityTooLarge, openAIError("The request is too large."))
	}

	var requestBody providerRequest
	if err := json.Unmarshal(body, &requestBody); err != nil || len(requestBody.Messages) == 0 {
		return event.JSON(http.StatusBadRequest, openAIError("The request body is not valid OpenAI chat JSON."))
	}
	if len(requestBody.Messages) > maxChatMessages {
		return event.JSON(http.StatusBadRequest, openAIError("The request contains too many messages."))
	}
	if requestBody.Model != homarrProviderModelID {
		return event.JSON(http.StatusBadRequest, openAIError("The Homarr provider offers only the Homarr model."))
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return event.JSON(http.StatusBadRequest, openAIError("The request body is not valid OpenAI chat JSON."))
	}
	if err := validateProviderInput(payload); err != nil {
		message := "The request exceeds the Homarr model input limit."
		if errors.Is(err, errTooManyImages) {
			message = "The request contains too many images or an image that is too large."
		}
		return event.JSON(http.StatusRequestEntityTooLarge, openAIError(message))
	}
	if err := sanitizeProviderPayload(payload, provider.modelID); err != nil {
		message := "The request contains an unsupported tool."
		if errors.Is(err, errInvalidTools) {
			message = "The request tools are not valid."
		}
		return event.JSON(http.StatusBadRequest, openAIError(message))
	}
	upstreamBody, err := json.Marshal(payload)
	if err != nil {
		return event.JSON(http.StatusBadRequest, openAIError("The request body could not be prepared."))
	}

	upstreamRequest, err := http.NewRequestWithContext(
		event.Request.Context(),
		http.MethodPost,
		provider.baseURL+"/chat/completions",
		bytes.NewReader(upstreamBody),
	)
	if err != nil {
		return event.JSON(http.StatusInternalServerError, openAIError("The Homarr provider request could not be prepared."))
	}
	snapshot, err := provider.startRequest(event.App, event.Auth)
	if err != nil {
		var quotaErr *quotaExceededError
		if errors.As(err, &quotaErr) {
			event.Response.Header().Set("X-Homarr-Quota-Limit", strconv.Itoa(quotaErr.Snapshot.Limit))
			event.Response.Header().Set("X-Homarr-Quota-Remaining", "0")
			event.Response.Header().Set("X-Homarr-Quota-Reset", quotaErr.Snapshot.ResetsAt.Format(time.RFC3339))
			return event.JSON(http.StatusTooManyRequests, openAIError("Your daily Homarr provider allowance is exhausted."))
		}
		return event.JSON(http.StatusInternalServerError, openAIError("The Homarr provider request could not be started."))
	}
	upstreamRequest.Header.Set("Authorization", "Bearer "+provider.apiKey)
	upstreamRequest.Header.Set("Content-Type", "application/json")
	upstreamRequest.Header.Set("Accept", "text/event-stream, application/json")
	upstreamRequest.Header.Set("HTTP-Referer", "https://homarr.dev")
	upstreamRequest.Header.Set("X-Title", "Homarr Provider")
	upstreamRequest.Header.Set("X-OpenRouter-Metadata", "enabled")

	upstreamResponse, err := provider.httpClient.Do(upstreamRequest)
	if err != nil {
		return event.JSON(http.StatusBadGateway, openAIError("The model endpoint could not be reached."))
	}
	defer func() { _ = upstreamResponse.Body.Close() }()

	event.Response.Header().Set("Cache-Control", "no-store")
	event.Response.Header().Set("X-Accel-Buffering", "no")
	event.Response.Header().Set("X-Homarr-Quota-Limit", strconv.Itoa(snapshot.Limit))
	event.Response.Header().Set("X-Homarr-Quota-Remaining", strconv.Itoa(snapshot.Remaining))
	event.Response.Header().Set("X-Homarr-Quota-Reset", snapshot.ResetsAt.Format(time.RFC3339))
	if requestID := upstreamResponse.Header.Get("X-Request-Id"); requestID != "" {
		event.Response.Header().Set("X-Request-Id", requestID)
	}

	contentType := upstreamResponse.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	if upstreamResponse.StatusCode < 200 || upstreamResponse.StatusCode >= 300 {
		return event.JSON(safeUpstreamStatus(upstreamResponse.StatusCode), openAIError("The model endpoint rejected the request."))
	}

	if requestBody.Stream {
		event.Response.Header().Set("Content-Type", contentType)
		event.Response.WriteHeader(upstreamResponse.StatusCode)
		_, _ = copyBounded(flushingWriter{event.Response}, upstreamResponse.Body, maxChatResponseBytes)
		return nil
	}

	responseBody, readErr := readBoundedBody(upstreamResponse.Body, maxChatResponseBytes)
	if readErr != nil {
		return event.JSON(http.StatusBadGateway, openAIError("The model endpoint returned an invalid response."))
	}
	return event.Blob(upstreamResponse.StatusCode, contentType, responseBody)
}

func safeUpstreamStatus(status int) int {
	if status == http.StatusUnauthorized || status == http.StatusForbidden {
		return http.StatusBadGateway
	}
	return status
}

func sanitizeProviderPayload(payload map[string]any, upstreamModelID string) error {
	for _, field := range clientControlledRoutingFields {
		delete(payload, field)
	}
	for _, field := range clientControlledCostFields {
		delete(payload, field)
	}
	delete(payload, "max_completion_tokens")
	delete(payload, "max_tokens")
	delete(payload, "metadata")
	delete(payload, "user")
	if reasoning, ok := payload["reasoning"].(map[string]any); ok {
		delete(reasoning, "max_tokens")
	}

	if rawTools, exists := payload["tools"]; exists {
		tools, ok := rawTools.([]any)
		if !ok {
			return errInvalidTools
		}
		sanitizedTools := make([]any, 0, len(tools))
		webSearchAdded := false
		for _, rawTool := range tools {
			tool, ok := rawTool.(map[string]any)
			if !ok {
				return errUnsupportedTool
			}
			switch tool["type"] {
			case "function":
				sanitizedTools = append(sanitizedTools, tool)
			case "openrouter:web_search":
				if !webSearchAdded {
					sanitizedTools = append(sanitizedTools, map[string]any{
						"type": "openrouter:web_search",
						"parameters": map[string]any{
							"max_results": maxWebSearchResults,
							"max_uses":    maxWebSearchUses,
						},
					})
					webSearchAdded = true
				}
			default:
				return errUnsupportedTool
			}
		}
		payload["tools"] = sanitizedTools
	}

	payload["model"] = upstreamModelID
	payload["max_completion_tokens"] = maxChatOutputTokens
	payload["n"] = 1
	payload["parallel_tool_calls"] = false
	payload["usage"] = map[string]any{"include": true}
	payload["provider"] = map[string]any{"zdr": true, "data_collection": "deny"}
	return nil
}

func validateProviderInput(payload map[string]any) error {
	textBytes := 0
	imageCount := 0
	var walk func(any) error
	walk = func(value any) error {
		switch typed := value.(type) {
		case string:
			if strings.HasPrefix(typed, "data:image/") {
				imageCount++
				if imageCount > maxChatImages || len(typed) > maxChatImageDataBytes {
					return errTooManyImages
				}
				return nil
			}
			textBytes += len(typed)
			if textBytes > maxChatTextBytes {
				return errInputTooLarge
			}
		case []any:
			for _, item := range typed {
				if err := walk(item); err != nil {
					return err
				}
			}
		case map[string]any:
			for key, item := range typed {
				textBytes += len(key)
				if textBytes > maxChatTextBytes {
					return errInputTooLarge
				}
				if err := walk(item); err != nil {
					return err
				}
			}
		}
		return nil
	}
	return walk(payload)
}

func copyBounded(writer io.Writer, reader io.Reader, limit int64) (int64, error) {
	written, err := io.Copy(writer, io.LimitReader(reader, limit))
	if err != nil {
		return written, err
	}
	var extra [1]byte
	read, err := reader.Read(extra[:])
	if read > 0 {
		return written, errProviderResponseTooLarge
	}
	if err != nil && !errors.Is(err, io.EOF) {
		return written, err
	}
	return written, nil
}

func readBoundedBody(reader io.Reader, limit int64) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > limit {
		return nil, errProviderResponseTooLarge
	}
	return body, nil
}

func (provider *homarrProvider) quota(app core.App, user *core.Record) (quotaSnapshot, error) {
	now := provider.now().UTC()
	var snapshot quotaSnapshot
	err := app.RunInTransaction(func(txApp core.App) error {
		quota, current, quotaChanged, err := provider.loadQuota(txApp, user, now)
		if err != nil {
			return err
		}
		globalQuota, globalRemaining, globalQuotaChanged, err := provider.loadGlobalQuota(txApp, now)
		if err != nil {
			return err
		}
		current.Remaining = min(current.Remaining, globalRemaining)
		snapshot = current
		if globalQuotaChanged {
			if err := txApp.Save(globalQuota); err != nil {
				return err
			}
		}
		if quotaChanged {
			return txApp.Save(quota)
		}
		return nil
	})
	return snapshot, err
}

func (provider *homarrProvider) loadGlobalQuota(app core.App, now time.Time) (*core.Record, int, bool, error) {
	quota, err := app.FindFirstRecordByFilter("assistant_global_quota", "key = 'default'")
	if err != nil {
		return nil, 0, false, err
	}
	changed := false
	if quota.GetString("day") != now.Format(time.DateOnly) {
		quota.Set("day", now.Format(time.DateOnly))
		quota.Set("used", 0)
		changed = true
	}
	return quota, max(0, provider.globalDailyLimit-quota.GetInt("used")), changed, nil
}

func (provider *homarrProvider) loadQuota(
	app core.App,
	user *core.Record,
	now time.Time,
) (*core.Record, quotaSnapshot, bool, error) {
	quota, err := app.FindFirstRecordByFilter("assistant_quotas", "user = {:user}", dbx.Params{"user": user.Id})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, quotaSnapshot{}, false, err
	}
	changed := false
	if quota == nil {
		collection, err := app.FindCollectionByNameOrId("assistant_quotas")
		if err != nil {
			return nil, quotaSnapshot{}, false, err
		}
		quota = core.NewRecord(collection)
		quota.Set("user", user.Id)
		changed = true
	}
	if quota.GetString("day") != now.Format(time.DateOnly) {
		quota.Set("day", now.Format(time.DateOnly))
		quota.Set("used", 0)
		changed = true
	}
	limit := provider.dailyLimit
	used := quota.GetInt("used")
	return quota, quotaSnapshot{
		Limit:     limit,
		Used:      used,
		Remaining: max(0, limit-used),
		ResetsAt:  time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC),
	}, changed, nil
}

func (provider *homarrProvider) startRequest(
	app core.App,
	user *core.Record,
) (quotaSnapshot, error) {
	var snapshot quotaSnapshot
	err := app.RunInTransaction(func(txApp core.App) error {
		now := provider.now().UTC()
		quota, current, _, err := provider.loadQuota(txApp, user, now)
		if err != nil {
			return err
		}
		globalQuota, globalRemaining, _, err := provider.loadGlobalQuota(txApp, now)
		if err != nil {
			return err
		}
		if current.Remaining < 1 || globalRemaining < 1 {
			return &quotaExceededError{Snapshot: current}
		}
		current.Used++
		current.Remaining = max(0, current.Limit-current.Used)
		quota.Set("used", current.Used)
		globalQuota.Set("used", globalQuota.GetInt("used")+1)
		snapshot = current
		if err := txApp.Save(globalQuota); err != nil {
			return err
		}
		return txApp.Save(quota)
	})
	return snapshot, err
}

func openAIError(message string) map[string]any {
	return map[string]any{"error": map[string]any{"message": message, "type": "homarr_provider_error"}}
}

type flushingWriter struct {
	http.ResponseWriter
}

func (writer flushingWriter) Write(chunk []byte) (int, error) {
	written, err := writer.ResponseWriter.Write(chunk)
	if flusher, ok := writer.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
	return written, err
}
