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
		"model":      homarrProviderModelID,
		"models":     []string{"attacker/model"},
		"provider":   map[string]any{"order": []string{"attacker"}},
		"route":      "fallback",
		"plugins":    []string{"web"},
		"transforms": []string{"middle-out"},
		"messages":   []any{map[string]any{"role": "user", "content": "hello"}},
	}
	sanitizeProviderPayload(payload)
	for _, field := range clientControlledRoutingFields {
		if _, exists := payload[field]; exists {
			t.Fatalf("client-controlled routing field %q was forwarded", field)
		}
	}
	if payload["model"] != openRouterModelID {
		t.Fatalf("unexpected upstream model: %v", payload["model"])
	}
	usage, err := json.Marshal(payload["usage"])
	if err != nil || string(usage) != `{"include":true}` {
		t.Fatalf("unexpected usage options: %s, %v", usage, err)
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

func TestRequestBelongsToQuotaDay(t *testing.T) {
	startedAt := time.Date(2026, 8, 12, 1, 30, 0, 0, time.FixedZone("CEST", 2*60*60))
	if !requestBelongsToQuotaDay("2026-08-11", startedAt) {
		t.Fatal("expected request to match its UTC start day")
	}
	if requestBelongsToQuotaDay("2026-08-12", startedAt) {
		t.Fatal("request usage must not be added after the quota record resets")
	}
}
