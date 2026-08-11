package main

import (
	"encoding/json"
	"math"
	"strings"
	"testing"
	"time"
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
	if err := sanitizeProviderPayload(payload); err != nil {
		t.Fatal(err)
	}
	for _, field := range clientControlledRoutingFields {
		if _, exists := payload[field]; exists {
			t.Fatalf("client-controlled routing field %q was forwarded", field)
		}
	}
	if payload["model"] != openRouterModelID {
		t.Fatalf("unexpected upstream model: %v", payload["model"])
	}
	if payload["max_tokens"] != maxChatOutputTokens || payload["n"] != 1 || payload["parallel_tool_calls"] != false {
		t.Fatalf("unsafe generation controls were forwarded: %#v", payload)
	}
	if _, exists := payload["max_completion_tokens"]; exists {
		t.Fatal("client max_completion_tokens was forwarded")
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
}

func TestSanitizeProviderPayloadRejectsUnsupportedServerTools(t *testing.T) {
	payload := map[string]any{"tools": []any{map[string]any{"type": "openrouter:computer"}}}
	if err := sanitizeProviderPayload(payload); err == nil {
		t.Fatal("expected unsupported server tool to be rejected")
	}
}

func TestCountRequestUnits(t *testing.T) {
	tests := []struct {
		name     string
		messages []providerMessage
		want     int
	}{
		{name: "user request", messages: []providerMessage{{Role: "user"}}, want: 1},
		{
			name: "parallel tool results",
			messages: []providerMessage{
				{Role: "user"},
				{Role: "assistant"},
				{Role: "tool"},
				{Role: "tool"},
			},
			want: 3,
		},
		{
			name: "historical tools are not charged again",
			messages: []providerMessage{
				{Role: "user"},
				{Role: "assistant"},
				{Role: "tool"},
				{Role: "assistant"},
				{Role: "user"},
			},
			want: 1,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := countRequestUnits(test.messages); got != test.want {
				t.Fatalf("countRequestUnits() = %d, want %d", got, test.want)
			}
		})
	}
}

func TestSSEUsageCaptureHandlesFragmentedEvents(t *testing.T) {
	capture := newSSEUsageCapture()
	chunks := []string{
		"data: {\"id\":\"gen-test\",\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n",
		"data: {\"usage\":{\"prompt_tokens\":12,\"completion_",
		"tokens\":7,\"total_tokens\":19,\"cost\":0.00041}}\n\n",
		"data: [DONE]\n\n",
	}
	for _, chunk := range chunks {
		if _, err := capture.Write([]byte(chunk)); err != nil {
			t.Fatal(err)
		}
	}

	usage := capture.Usage()
	if usage.InputTokens != 12 || usage.OutputTokens != 7 || usage.TotalTokens != 19 {
		t.Fatalf("unexpected usage: %+v", usage)
	}
	if math.Abs(usage.Cost-0.00041) > 0.0000001 {
		t.Fatalf("unexpected cost: %f", usage.Cost)
	}
}

func TestProviderEnvironment(t *testing.T) {
	t.Setenv("OPENROUTER_API_KEY", "test-key")
	t.Setenv("HOMARR_AI_OPENROUTER_BASE_URL", "https://router.example/v1/")
	t.Setenv("HOMARR_AI_DAILY_REQUEST_LIMIT", "75")
	provider, err := newHomarrProviderFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if provider.apiKey != "test-key" || provider.baseURL != "https://router.example/v1" || provider.dailyLimit != 75 {
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

func TestRequestBelongsToQuotaDay(t *testing.T) {
	startedAt := time.Date(2026, 8, 12, 1, 30, 0, 0, time.FixedZone("CEST", 2*60*60))
	if !requestBelongsToQuotaDay("2026-08-11", startedAt) {
		t.Fatal("expected request to match its UTC start day")
	}
	if requestBelongsToQuotaDay("2026-08-12", startedAt) {
		t.Fatal("request usage must not be added after the quota record resets")
	}
}
