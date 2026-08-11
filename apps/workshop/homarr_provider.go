package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	homarrProviderModelID   = "homarr/deepseek-v4-flash-latest"
	openRouterModelID       = "~deepseek/deepseek-v4-flash-latest"
	defaultDailyLimit       = 50
	maxProviderRequestUnits = 1000
	maxChatRequestBytes     = 8 << 20
	maxChatResponseBytes    = 8 << 20
	maxUpstreamErrorBytes   = 1 << 20
	openRouterDefaultURL    = "https://openrouter.ai/api/v1"
	providerRequestTimeout  = 5 * time.Minute
)

var errProviderResponseTooLarge = errors.New("provider response is too large")

var clientControlledRoutingFields = []string{"models", "provider", "route", "plugins", "transforms"}

type homarrProvider struct {
	apiKey     string
	baseURL    string
	dailyLimit int
	httpClient *http.Client
	now        func() time.Time
}

type quotaSnapshot struct {
	Limit     int       `json:"limit"`
	Used      int       `json:"used"`
	Remaining int       `json:"remaining"`
	ResetsAt  time.Time `json:"resetsAt"`
}

type requestUsage struct {
	InputTokens  int
	OutputTokens int
	TotalTokens  int
	Cost         float64
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
		group.GET("/usage", provider.usage).Bind(apis.RequireAuth("users"))
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
	if err != nil || parsedURL.Host == "" || (parsedURL.Scheme != "https" && parsedURL.Scheme != "http") {
		return nil, errors.New("HOMARR_AI_OPENROUTER_BASE_URL must be an absolute HTTP(S) URL")
	}

	dailyLimit := defaultDailyLimit
	if rawLimit := strings.TrimSpace(os.Getenv("HOMARR_AI_DAILY_REQUEST_LIMIT")); rawLimit != "" {
		value, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || value < 1 || value > 100_000 {
			return nil, errors.New("HOMARR_AI_DAILY_REQUEST_LIMIT must be an integer between 1 and 100000")
		}
		dailyLimit = value
	}

	return &homarrProvider{
		apiKey:     strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")),
		baseURL:    baseURL,
		dailyLimit: dailyLimit,
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
			"name":           "DeepSeek V4 Flash Latest",
			"description":    "Fast agentic model provided by the community-funded Homarr provider.",
			"owned_by":       "homarr",
			"context_length": 1_048_576,
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
	if requestBody.Model != homarrProviderModelID {
		return event.JSON(http.StatusBadRequest, openAIError("The Homarr provider offers only DeepSeek V4 Flash Latest."))
	}

	requestUnits := countRequestUnits(requestBody.Messages)
	if requestUnits > maxProviderRequestUnits {
		return event.JSON(http.StatusBadRequest, openAIError("A single Homarr provider request can use at most 1000 request units."))
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return event.JSON(http.StatusBadRequest, openAIError("The request body is not valid OpenAI chat JSON."))
	}
	sanitizeProviderPayload(payload)
	upstreamBody, err := json.Marshal(payload)
	if err != nil {
		return event.JSON(http.StatusBadRequest, openAIError("The request body could not be prepared."))
	}

	snapshot, privateRequest, publicActivity, err := provider.startRequest(event.App, event.Auth, requestUnits)
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
	startedAt := provider.now().UTC()
	upstreamRequest, err := http.NewRequestWithContext(
		event.Request.Context(),
		http.MethodPost,
		provider.baseURL+"/chat/completions",
		bytes.NewReader(upstreamBody),
	)
	if err != nil {
		provider.finishActivityWithRefund(event.App, privateRequest, publicActivity, "failed", requestUsage{}, startedAt, requestUnits)
		return event.JSON(http.StatusInternalServerError, openAIError("The Homarr provider request could not be prepared."))
	}
	upstreamRequest.Header.Set("Authorization", "Bearer "+provider.apiKey)
	upstreamRequest.Header.Set("Content-Type", "application/json")
	upstreamRequest.Header.Set("Accept", "text/event-stream, application/json")
	upstreamRequest.Header.Set("HTTP-Referer", "https://homarr.dev")
	upstreamRequest.Header.Set("X-Title", "Homarr Provider")
	upstreamRequest.Header.Set("X-OpenRouter-Metadata", "enabled")

	upstreamResponse, err := provider.httpClient.Do(upstreamRequest)
	if err != nil {
		provider.finishActivityWithRefund(event.App, privateRequest, publicActivity, "failed", requestUsage{}, startedAt, requestUnits)
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
		errorBody, _ := io.ReadAll(io.LimitReader(upstreamResponse.Body, maxUpstreamErrorBytes))
		provider.finishActivityWithRefund(event.App, privateRequest, publicActivity, "failed", requestUsage{}, startedAt, requestUnits)
		event.Response.Header().Set("X-Homarr-Quota-Remaining", strconv.Itoa(min(snapshot.Limit, snapshot.Remaining+requestUnits)))
		return event.Blob(upstreamResponse.StatusCode, contentType, errorBody)
	}

	if requestBody.Stream {
		capture := newSSEUsageCapture()
		event.Response.Header().Set("Content-Type", contentType)
		event.Response.WriteHeader(upstreamResponse.StatusCode)
		_, copyErr := io.Copy(flushingWriter{event.Response}, io.TeeReader(upstreamResponse.Body, capture))
		provider.finishActivity(event.App, privateRequest, publicActivity, statusForError(copyErr), capture.Usage(), startedAt)
		return nil
	}

	responseBody, readErr := readBoundedBody(upstreamResponse.Body, maxChatResponseBytes)
	if readErr != nil {
		provider.finishActivity(event.App, privateRequest, publicActivity, "failed", requestUsage{}, startedAt)
		return event.JSON(http.StatusBadGateway, openAIError("The model endpoint returned an invalid response."))
	}
	usage := usageFromJSON(responseBody)
	provider.finishActivity(event.App, privateRequest, publicActivity, "completed", usage, startedAt)
	return event.Blob(upstreamResponse.StatusCode, contentType, responseBody)
}

func sanitizeProviderPayload(payload map[string]any) {
	for _, field := range clientControlledRoutingFields {
		delete(payload, field)
	}
	payload["model"] = openRouterModelID
	payload["usage"] = map[string]any{"include": true}
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

func countRequestUnits(messages []providerMessage) int {
	units := 1
	for index := len(messages) - 1; index >= 0 && messages[index].Role == "tool"; index-- {
		units++
	}
	return units
}

func (provider *homarrProvider) quota(app core.App, user *core.Record) (quotaSnapshot, error) {
	now := provider.now().UTC()
	var snapshot quotaSnapshot
	err := app.RunInTransaction(func(txApp core.App) error {
		quota, current, err := provider.loadQuota(txApp, user, now)
		if err != nil {
			return err
		}
		snapshot = current
		return txApp.Save(quota)
	})
	return snapshot, err
}

func (provider *homarrProvider) loadQuota(app core.App, user *core.Record, now time.Time) (*core.Record, quotaSnapshot, error) {
	quota, err := app.FindFirstRecordByFilter("assistant_quotas", "user = {:user}", dbx.Params{"user": user.Id})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, quotaSnapshot{}, err
	}
	if quota == nil {
		collection, err := app.FindCollectionByNameOrId("assistant_quotas")
		if err != nil {
			return nil, quotaSnapshot{}, err
		}
		quota = core.NewRecord(collection)
		quota.Set("user", user.Id)
		quota.Set("dailyLimit", provider.dailyLimit)
	}
	if quota.GetString("day") != now.Format(time.DateOnly) {
		quota.Set("day", now.Format(time.DateOnly))
		quota.Set("used", 0)
		quota.Set("inputTokens", 0)
		quota.Set("outputTokens", 0)
		quota.Set("totalTokens", 0)
	}
	limit := quota.GetInt("dailyLimit")
	used := quota.GetInt("used")
	return quota, quotaSnapshot{
		Limit:     limit,
		Used:      used,
		Remaining: max(0, limit-used),
		ResetsAt:  time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC),
	}, nil
}

func (provider *homarrProvider) startRequest(
	app core.App,
	user *core.Record,
	requestUnits int,
) (quotaSnapshot, *core.Record, *core.Record, error) {
	var snapshot quotaSnapshot
	var privateRequest *core.Record
	var publicActivity *core.Record
	err := app.RunInTransaction(func(txApp core.App) error {
		quota, current, err := provider.loadQuota(txApp, user, provider.now().UTC())
		if err != nil {
			return err
		}
		if requestUnits > current.Remaining {
			return &quotaExceededError{Snapshot: current}
		}

		privateCollection, err := txApp.FindCollectionByNameOrId("assistant_requests")
		if err != nil {
			return err
		}
		publicCollection, err := txApp.FindCollectionByNameOrId("assistant_activity")
		if err != nil {
			return err
		}
		privateRequest = core.NewRecord(privateCollection)
		publicActivity = core.NewRecord(publicCollection)
		for _, record := range []*core.Record{privateRequest, publicActivity} {
			record.Set("status", "processing")
			record.Set("model", homarrProviderModelID)
			record.Set("requestUnits", requestUnits)
		}
		privateRequest.Set("user", user.Id)

		if err := txApp.Save(publicActivity); err != nil {
			return err
		}
		privateRequest.Set("publicActivity", publicActivity.Id)
		if err := txApp.Save(privateRequest); err != nil {
			return err
		}
		current.Used += requestUnits
		current.Remaining = max(0, current.Limit-current.Used)
		quota.Set("used", current.Used)
		snapshot = current
		return txApp.Save(quota)
	})
	return snapshot, privateRequest, publicActivity, err
}

func (provider *homarrProvider) finishActivity(
	app core.App,
	privateRequest *core.Record,
	publicActivity *core.Record,
	status string,
	usage requestUsage,
	startedAt time.Time,
) {
	provider.finishActivityWithRefund(app, privateRequest, publicActivity, status, usage, startedAt, 0)
}

func (provider *homarrProvider) finishActivityWithRefund(
	app core.App,
	privateRequest *core.Record,
	publicActivity *core.Record,
	status string,
	usage requestUsage,
	startedAt time.Time,
	refundUnits int,
) {
	durationMs := max(0, int(provider.now().UTC().Sub(startedAt).Milliseconds()))
	err := app.RunInTransaction(func(txApp core.App) error {
		for _, record := range []*core.Record{privateRequest, publicActivity} {
			record.Set("status", status)
			record.Set("inputTokens", usage.InputTokens)
			record.Set("outputTokens", usage.OutputTokens)
			record.Set("totalTokens", usage.TotalTokens)
			record.Set("durationMs", durationMs)
			record.Set("cost", usage.Cost)
			if err := txApp.Save(record); err != nil {
				return err
			}
		}
		quota, err := txApp.FindFirstRecordByFilter(
			"assistant_quotas",
			"user = {:user}",
			dbx.Params{"user": privateRequest.GetString("user")},
		)
		if err != nil {
			return err
		}
		if !requestBelongsToQuotaDay(quota.GetString("day"), startedAt) {
			return nil
		}
		if refundUnits > 0 {
			quota.Set("used", max(0, quota.GetInt("used")-refundUnits))
		}
		quota.Set("inputTokens", quota.GetInt("inputTokens")+usage.InputTokens)
		quota.Set("outputTokens", quota.GetInt("outputTokens")+usage.OutputTokens)
		quota.Set("totalTokens", quota.GetInt("totalTokens")+usage.TotalTokens)
		return txApp.Save(quota)
	})
	if err != nil {
		log.Printf("Homarr provider accounting update failed for status %q", status)
	}
}

func requestBelongsToQuotaDay(day string, startedAt time.Time) bool {
	return day == startedAt.UTC().Format(time.DateOnly)
}

func statusForError(err error) string {
	if err != nil {
		return "failed"
	}
	return "completed"
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

type sseUsageCapture struct {
	pending []byte
	usage   requestUsage
}

func newSSEUsageCapture() *sseUsageCapture { return &sseUsageCapture{} }

func (capture *sseUsageCapture) Write(chunk []byte) (int, error) {
	capture.pending = append(capture.pending, chunk...)
	for {
		end := bytes.IndexByte(capture.pending, '\n')
		if end < 0 {
			break
		}
		line := bytes.TrimSuffix(capture.pending[:end], []byte{'\r'})
		if bytes.HasPrefix(line, []byte("data: ")) {
			capture.mergeUsage(bytes.TrimPrefix(line, []byte("data: ")))
		}
		capture.pending = capture.pending[end+1:]
	}
	if len(capture.pending) > maxUpstreamErrorBytes {
		capture.pending = nil
	}
	return len(chunk), nil
}

func (capture *sseUsageCapture) mergeUsage(data []byte) {
	if bytes.Equal(data, []byte("[DONE]")) || !bytes.Contains(data, []byte(`"usage"`)) {
		return
	}
	usage := usageFromJSON(data)
	if usage.InputTokens != 0 || usage.OutputTokens != 0 || usage.TotalTokens != 0 || usage.Cost != 0 {
		capture.usage = usage
	}
}

func (capture *sseUsageCapture) Usage() requestUsage { return capture.usage }

func usageFromJSON(data []byte) requestUsage {
	var payload struct {
		Usage struct {
			PromptTokens     int     `json:"prompt_tokens"`
			CompletionTokens int     `json:"completion_tokens"`
			TotalTokens      int     `json:"total_tokens"`
			Cost             float64 `json:"cost"`
		} `json:"usage"`
	}
	if json.Unmarshal(data, &payload) != nil {
		return requestUsage{}
	}
	return requestUsage{
		InputTokens:  payload.Usage.PromptTokens,
		OutputTokens: payload.Usage.CompletionTokens,
		TotalTokens:  payload.Usage.TotalTokens,
		Cost:         payload.Usage.Cost,
	}
}
