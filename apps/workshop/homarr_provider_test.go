package main

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestSanitizeProviderPayload(t *testing.T) {
	payload := map[string]any{
		"model":                 homarrProviderModelID,
		"models":                []string{"attacker/model"},
		"provider":              map[string]any{"order": []string{"attacker"}},
		"route":                 "fallback",
		"plugins":               []string{"web"},
		"transforms":            []string{"middle-out"},
		"max_tokens":            1_000_000,
		"max_completion_tokens": 1_000_000,
		"n":                     100,
		"parallel_tool_calls":   true,
		"extra_body":            map[string]any{"provider": map[string]any{"order": []string{"attacker"}}},
		"extra_headers":         map[string]any{"Authorization": "Bearer attacker"},
		"metadata":              map[string]any{"user": "private-user-id"},
		"audio":                 map[string]any{"format": "wav"},
		"modalities":            []string{"text", "audio"},
		"logprobs":              true,
		"top_logprobs":          20,
		"prediction":            map[string]any{"content": strings.Repeat("x", 100)},
		"service_tier":          "priority",
		"reasoning":             map[string]any{"effort": "high", "max_tokens": 1_000_000},
		"user":                  "private-user-id",
		"tools": []any{
			map[string]any{"type": "function", "function": map[string]any{"name": "board_list"}},
			map[string]any{
				"type":       "openrouter:web_search",
				"parameters": map[string]any{"max_results": 1000, "max_uses": 1000},
			},
			map[string]any{"type": "openrouter:web_search"},
		},
		"messages": []any{map[string]any{"role": "user", "content": "hello"}},
	}
	if err := sanitizeProviderPayload(payload, "mock/team-selected-model"); err != nil {
		t.Fatal(err)
	}
	for _, field := range clientControlledRoutingFields {
		if field == "provider" {
			continue
		}
		if _, exists := payload[field]; exists {
			t.Fatalf("client-controlled routing field %q was forwarded", field)
		}
	}
	for _, field := range clientControlledCostFields {
		if _, exists := payload[field]; exists {
			t.Fatalf("client-controlled cost field %q was forwarded", field)
		}
	}
	if payload["model"] != "mock/team-selected-model" {
		t.Fatalf("unexpected upstream model: %v", payload["model"])
	}
	if payload["max_completion_tokens"] != maxChatOutputTokens || payload["n"] != 1 || payload["parallel_tool_calls"] != false {
		t.Fatalf("unsafe generation controls were forwarded: %#v", payload)
	}
	if _, exists := payload["max_tokens"]; exists {
		t.Fatal("deprecated client max_tokens was forwarded")
	}
	if _, exists := payload["user"]; exists {
		t.Fatal("client user identifier was forwarded")
	}
	if _, exists := payload["metadata"]; exists {
		t.Fatal("client metadata was forwarded")
	}
	reasoning := payload["reasoning"].(map[string]any)
	if _, exists := reasoning["max_tokens"]; exists || reasoning["effort"] != "high" {
		t.Fatalf("reasoning budget was not bounded safely: %#v", reasoning)
	}
	tools := payload["tools"].([]any)
	if len(tools) != 2 {
		t.Fatalf("unexpected sanitized tool count: %d", len(tools))
	}
	webSearch := tools[1].(map[string]any)
	parameters := webSearch["parameters"].(map[string]any)
	if parameters["max_results"] != maxWebSearchResults || parameters["max_uses"] != maxWebSearchUses {
		t.Fatalf("web search limits were not enforced: %#v", parameters)
	}
	usage, err := json.Marshal(payload["usage"])
	if err != nil || string(usage) != `{"include":true}` {
		t.Fatalf("unexpected usage options: %s, %v", usage, err)
	}
	privacy := payload["provider"].(map[string]any)
	if privacy["zdr"] != true || privacy["data_collection"] != "deny" {
		t.Fatalf("upstream privacy controls were not enforced: %#v", privacy)
	}
}

func TestSanitizeProviderPayloadRejectsUnsupportedServerTools(t *testing.T) {
	payload := map[string]any{"tools": []any{map[string]any{"type": "openrouter:computer"}}}
	if err := sanitizeProviderPayload(payload, "mock/team-selected-model"); err == nil {
		t.Fatal("expected unsupported server tool to be rejected")
	}
}

func TestSafeUpstreamStatus(t *testing.T) {
	for _, status := range []int{401, 403} {
		if actual := safeUpstreamStatus(status); actual != 502 {
			t.Fatalf("expected upstream %d to become 502, got %d", status, actual)
		}
	}
	if actual := safeUpstreamStatus(429); actual != 429 {
		t.Fatalf("expected upstream 429 to be preserved, got %d", actual)
	}
}

func TestValidateProviderInput(t *testing.T) {
	payload := map[string]any{
		"messages": []any{map[string]any{
			"role": "user",
			"content": []any{map[string]any{
				"type":      "image_url",
				"image_url": map[string]any{"url": "data:image/png;base64," + strings.Repeat("a", 1_300_000)},
			}},
		}},
	}
	if err := validateProviderInput(payload); err != nil {
		t.Fatalf("expected a supported Homarr image request, got %v", err)
	}
	payload["messages"] = []any{map[string]any{"role": "user", "content": strings.Repeat("x", maxChatTextBytes+1)}}
	if err := validateProviderInput(payload); !errors.Is(err, errInputTooLarge) {
		t.Fatalf("expected oversized text input to be rejected, got %v", err)
	}
	payload["messages"] = []any{map[string]any{
		"role": "user",
		"content": []any{map[string]any{
			"type":      "image_url",
			"image_url": map[string]any{"url": "data:image/png;base64," + strings.Repeat("a", maxChatImageDataBytes)},
		}},
	}}
	if err := validateProviderInput(payload); !errors.Is(err, errTooManyImages) {
		t.Fatalf("expected oversized image input to be rejected, got %v", err)
	}
	payload["messages"] = []any{map[string]any{
		"role": "user",
		"content": []any{map[string]any{
			"type":      "image_url",
			"image_url": map[string]any{"url": "https://attacker.example/expensive-image.png"},
		}},
	}}
	if err := validateProviderInput(payload); !errors.Is(err, errRemoteImage) {
		t.Fatalf("expected a remote image URL to be rejected, got %v", err)
	}
	payload["messages"] = []any{map[string]any{
		"role": "user",
		"content": []any{
			map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
			map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
			map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
			map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
			map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
		},
	}}
	if err := validateProviderInput(payload); err != nil {
		t.Fatalf("expected five uploaded images to be accepted, got %v", err)
	}
	payload["messages"].([]any)[0].(map[string]any)["content"] = append(
		payload["messages"].([]any)[0].(map[string]any)["content"].([]any),
		map[string]any{"type": "image_url", "image_url": map[string]any{"url": "data:image/png;base64,YQ=="}},
	)
	if err := validateProviderInput(payload); !errors.Is(err, errTooManyImages) {
		t.Fatalf("expected six uploaded images to be rejected, got %v", err)
	}
}

func TestProviderInFlightLimits(t *testing.T) {
	provider := &homarrProvider{inFlightByUser: make(map[string]int)}
	if !provider.acquireRequest("one") {
		t.Fatal("expected the first user request to be admitted")
	}
	if !provider.acquireRequest("one") {
		t.Fatal("expected the second user request to be admitted")
	}
	if provider.acquireRequest("one") {
		t.Fatal("expected the third user request to be rejected")
	}
	provider.releaseRequest("one")
	provider.releaseRequest("one")
	for index := range maxGlobalInFlight {
		if !provider.acquireRequest(string(rune(index + 1))) {
			t.Fatalf("expected global request %d to be admitted", index)
		}
	}
	if provider.acquireRequest("overflow") {
		t.Fatal("expected the global in-flight limit to reject overflow")
	}
}

func TestCompletionModelAlias(t *testing.T) {
	body, err := aliasCompletionBody([]byte(`{"id":"one","model":"private/model","choices":[]}`))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(body), "private/model") || !strings.Contains(string(body), `"model":"homarr/model"`) {
		t.Fatalf("private upstream model leaked in JSON: %s", body)
	}
	var stream strings.Builder
	_, err = copyAliasedSSE(
		&stream,
		strings.NewReader("data: {\"id\":\"one\",\"model\":\"private/model\",\"choices\":[]}\n\ndata: [DONE]\n\n"),
		1024,
	)
	if err != nil || strings.Contains(stream.String(), "private/model") ||
		!strings.Contains(stream.String(), `"model":"homarr/model"`) {
		t.Fatalf("private upstream model leaked in SSE: %s, %v", stream.String(), err)
	}
}

func TestProviderEnvironment(t *testing.T) {
	t.Setenv("OPENROUTER_API_KEY", "test-key")
	t.Setenv("HOMARR_AI_OPENROUTER_BASE_URL", "https://router.example/v1/")
	t.Setenv("HOMARR_AI_OPENROUTER_MODEL", "mock/team-selected-model")
	t.Setenv("HOMARR_AI_DAILY_REQUEST_LIMIT", "75")
	t.Setenv("HOMARR_AI_GLOBAL_DAILY_REQUEST_LIMIT", "900")
	provider, err := newHomarrProviderFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if provider.apiKey != "test-key" || provider.baseURL != "https://router.example/v1" ||
		provider.modelID != "mock/team-selected-model" || provider.dailyLimit != 75 || provider.globalDailyLimit != 900 {
		t.Fatalf("unexpected provider config: %#v", provider)
	}

	t.Setenv("HOMARR_AI_DAILY_REQUEST_LIMIT", "0")
	if _, err := newHomarrProviderFromEnv(); err == nil {
		t.Fatal("expected invalid daily limit to fail")
	}

	t.Setenv("HOMARR_AI_DAILY_REQUEST_LIMIT", "50")
	for _, unsafeURL := range []string{
		"https://user:password@router.example/v1",
		"https://router.example/v1?key=secret",
		"https://router.example/v1#fragment",
	} {
		t.Setenv("HOMARR_AI_OPENROUTER_BASE_URL", unsafeURL)
		if _, err := newHomarrProviderFromEnv(); err == nil {
			t.Fatalf("expected unsafe upstream URL %q to fail", unsafeURL)
		}
	}
	t.Setenv("HOMARR_AI_OPENROUTER_BASE_URL", "http://router.example/v1")
	if _, err := newHomarrProviderFromEnv(); err == nil {
		t.Fatal("expected an insecure upstream to fail without an explicit development opt-in")
	}
}

func TestReadBoundedBody(t *testing.T) {
	body, err := readBoundedBody(strings.NewReader("1234"), 4)
	if err != nil || string(body) != "1234" {
		t.Fatalf("unexpected bounded body: %q, %v", body, err)
	}
	if _, err := readBoundedBody(strings.NewReader("12345"), 4); err != errProviderResponseTooLarge {
		t.Fatalf("expected response size error, got %v", err)
	}
}

func TestCopyBounded(t *testing.T) {
	var target strings.Builder
	written, err := copyBounded(&target, strings.NewReader("1234"), 4)
	if err != nil || written != 4 || target.String() != "1234" {
		t.Fatalf("unexpected bounded copy: %q, %d, %v", target.String(), written, err)
	}

	target.Reset()
	written, err = copyBounded(&target, strings.NewReader("12345"), 4)
	if err != errProviderResponseTooLarge || written != 4 || target.String() != "1234" {
		t.Fatalf("expected bounded copy failure, got %q, %d, %v", target.String(), written, err)
	}
}
