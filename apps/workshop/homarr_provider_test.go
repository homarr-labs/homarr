package main

import (
	"math"
	"testing"
)

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
