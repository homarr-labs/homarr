package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

const testOrigin = "https://remote.homarr.test"

func testRelay(t *testing.T, change func(*config)) (*relay, string) {
	t.Helper()
	c := config{workers: 10, connections: 30, channels: 4, perIP: 30, upgrades: 100, payload: 1024 * 1024, buffered: 2 * 1024 * 1024, messages: 256, bytes: 16 * 1024 * 1024, handshake: 1000, origins: map[string]bool{testOrigin: true}}
	if change != nil {
		change(&c)
	}
	r := newRelay(c)
	server := httptest.NewServer(r)
	t.Cleanup(func() { r.stop(); server.Close() })
	return r, "ws" + strings.TrimPrefix(server.URL, "http")
}
func dial(t *testing.T, url string, origin string) *websocket.Conn {
	t.Helper()
	headers := http.Header{}
	if origin != "" {
		headers.Set("Origin", origin)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{HTTPHeader: headers})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = c.CloseNow() })
	return c
}
func send(t *testing.T, c *websocket.Conn, v any) {
	t.Helper()
	body, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err = c.Write(ctx, websocket.MessageText, body); err != nil {
		t.Fatal(err)
	}
}
func read(t *testing.T, c *websocket.Conn) map[string]json.RawMessage {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, v, err := c.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	f := decodeFrame(v)
	if f == nil {
		t.Fatalf("Invalid frame %q", v)
	}
	return f
}
func closed(t *testing.T, c *websocket.Conn, code websocket.StatusCode, reason string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, _, err := c.Read(ctx)
	if websocket.CloseStatus(err) != code {
		t.Fatalf("Close = %v, want %v", err, code)
	}
	if reason != "" && !strings.Contains(err.Error(), reason) {
		t.Fatalf("Missing reason %q: %v", reason, err)
	}
}

type identity struct {
	private        *ecdsa.PrivateKey
	id, capability string
	jwk            map[string]string
}

func newIdentity(t *testing.T) identity {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return identity{private: key, id: hash(elliptic.Marshal(key.Curve, key.X, key.Y)), capability: randomID(), jwk: map[string]string{"kty": "EC", "crv": "P-256", "x": b64.EncodeToString(key.X.FillBytes(make([]byte, 32))), "y": b64.EncodeToString(key.Y.FillBytes(make([]byte, 32)))}}
}
func registration(t *testing.T, key identity, nonce string) map[string]any {
	t.Helper()
	body, _ := json.Marshal([]string{"homarr-relay-register-v1", key.id, nonce})
	h := sha256.Sum256(body)
	r, s, err := ecdsa.Sign(rand.Reader, key.private, h[:])
	if err != nil {
		t.Fatal(err)
	}
	sig := append(r.FillBytes(make([]byte, 32)), s.FillBytes(make([]byte, 32))...)
	return map[string]any{"type": "register", "publicKey": key.jwk, "signature": b64.EncodeToString(sig), "capabilityHash": hash([]byte(key.capability))}
}
func register(t *testing.T, url string, key identity) (*websocket.Conn, string) {
	t.Helper()
	c := dial(t, url+"/workers/"+key.id, "")
	challenge := read(t, c)
	send(t, c, registration(t, key, str(challenge, "nonce")))
	f := read(t, c)
	if str(f, "type") != "registered" || str(f, "workerId") != key.id {
		t.Fatal("Registration mismatch")
	}
	return c, str(f, "generation")
}
func connect(t *testing.T, url string, key identity) (*websocket.Conn, string, string) {
	t.Helper()
	c := dial(t, url+"/connect/"+key.id, testOrigin)
	send(t, c, map[string]string{"type": "connect", "capability": key.capability})
	f := read(t, c)
	if str(f, "type") != "connected" {
		t.Fatal("Connection mismatch")
	}
	return c, str(f, "channelId"), str(f, "generation")
}
func TestIdentityIsolationAndReplacement(t *testing.T) {
	_, url := testRelay(t, nil)
	key := newIdentity(t)
	w, generation := register(t, url, key)
	client, id, cg := connect(t, url, key)
	if cg != generation {
		t.Fatal("Generation mismatch")
	}
	if str(read(t, w), "channelId") != id {
		t.Fatal("Channel mismatch")
	}
	other, _ := register(t, url, newIdentity(t))
	send(t, other, map[string]string{"type": "channel.message", "channelId": id, "payload": "injected"})
	send(t, w, map[string]string{"type": "channel.message", "channelId": id, "payload": "authorized"})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, body, err := client.Read(ctx)
	if err != nil || string(body) != "authorized" {
		t.Fatalf("Isolation: %q %v", body, err)
	}
	replacement, nextGeneration := register(t, url, key)
	if nextGeneration == generation {
		t.Fatal("Generation reused")
	}
	closed(t, client, 1000, "Worker reconnected")
	closed(t, w, 1012, "Worker reconnected")
	_, nextID, nextCG := connect(t, url, key)
	if nextCG != nextGeneration || str(read(t, replacement), "channelId") != nextID {
		t.Fatal("Replacement lost ownership")
	}
}
func TestHandshakeSecurity(t *testing.T) {
	_, url := testRelay(t, func(c *config) { c.handshake = 100 })
	key := newIdentity(t)
	attacker := dial(t, url+"/workers/"+key.id, "")
	_ = read(t, attacker)
	send(t, attacker, registration(t, key, randomID()))
	closed(t, attacker, 1008, "Worker proof rejected")
	w, _ := register(t, url, key)
	wrong := dial(t, url+"/connect/"+key.id, testOrigin)
	send(t, wrong, map[string]string{"type": "connect", "capability": randomID()})
	closed(t, wrong, 1008, "Connection rejected")
	send(t, w, map[string]string{"type": "ping"})
	if str(read(t, w), "type") != "pong" {
		t.Fatal("Invalid capability reached worker")
	}
	binary := dial(t, url+"/connect/"+key.id, testOrigin)
	if err := binary.Write(context.Background(), websocket.MessageBinary, []byte{1}); err != nil {
		t.Fatal(err)
	}
	closed(t, binary, 1003, "Text frames required")
	idle := dial(t, url+"/connect/"+key.id, testOrigin)
	closed(t, idle, 1008, "Handshake timed out")
}
func TestAdmissionPolicies(t *testing.T) {
	_, url := testRelay(t, func(c *config) { c.token = "secret" })
	id := randomID()
	endpoint := "http" + strings.TrimPrefix(url, "ws")
	for _, tc := range []struct {
		path, origin, authorization string
		status                      int
	}{{"/connect/" + id, "", "", 403}, {"/connect/" + id, "https://attacker.invalid", "", 403}, {"/workers/" + id, testOrigin, "", 403}, {"/workers/" + id, "", "", 401}, {"/connect/" + id + "?capability=secret", testOrigin, "", 400}} {
		req, _ := http.NewRequest("GET", endpoint+tc.path, nil)
		req.Header.Set("Upgrade", "websocket")
		req.Header.Set("Origin", tc.origin)
		req.Header.Set("Authorization", tc.authorization)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.status {
			t.Fatalf("%s status %d want %d", tc.path, res.StatusCode, tc.status)
		}
	}
}
func TestLimitsAndSlowReceiver(t *testing.T) {
	_, url := testRelay(t, func(c *config) { c.channels = 1; c.messages = 3; c.buffered = 1024 })
	key := newIdentity(t)
	w, _ := register(t, url, key)
	_, id, _ := connect(t, url, key)
	_ = read(t, w)
	extra := dial(t, url+"/connect/"+key.id, testOrigin)
	send(t, extra, map[string]string{"type": "connect", "capability": key.capability})
	closed(t, extra, 1013, "Worker channel limit reached")
	send(t, w, map[string]string{"type": "channel.message", "channelId": id, "payload": strings.Repeat("x", 2048)})
	if str(read(t, w), "type") != "channel.close" {
		t.Fatal("Backpressure did not remove channel")
	}
	send(t, w, map[string]string{"type": "ping"})
	_ = read(t, w)
	send(t, w, map[string]string{"type": "ping"})
	closed(t, w, 1008, "Connection rate limit reached")
}

func TestAdmissionAndFrameBounds(t *testing.T) {
	for _, tc := range []struct {
		name   string
		change func(*config)
		status int
	}{
		{"global", func(c *config) { c.connections = 1 }, 503},
		{"IP", func(c *config) { c.perIP = 1 }, 429},
		{"upgrades", func(c *config) { c.upgrades = 1 }, 429},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, url := testRelay(t, tc.change)
			_ = dial(t, url+"/connect/"+randomID(), testOrigin)
			req, _ := http.NewRequest("GET", "http"+strings.TrimPrefix(url, "ws")+"/connect/"+randomID(), nil)
			req.Header.Set("Upgrade", "websocket")
			req.Header.Set("Origin", testOrigin)
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			res.Body.Close()
			if res.StatusCode != tc.status {
				t.Fatalf("Admission = %d, want %d", res.StatusCode, tc.status)
			}
		})
	}
	t.Run("worker and frame", func(t *testing.T) {
		_, url := testRelay(t, func(c *config) { c.workers = 1; c.payload = 512 })
		key := newIdentity(t)
		worker, _ := register(t, url, key)
		otherKey := newIdentity(t)
		other := dial(t, url+"/workers/"+otherKey.id, "")
		nonce := str(read(t, other), "nonce")
		send(t, other, registration(t, otherKey, nonce))
		closed(t, other, 1013, "Relay capacity reached")
		client, channel, _ := connect(t, url, key)
		_ = read(t, worker)
		if err := client.Write(context.Background(), websocket.MessageText, []byte(strings.Repeat("x", 1024))); err != nil {
			t.Fatal(err)
		}
		closed(t, client, 1009, "")
		frame := read(t, worker)
		if str(frame, "type") != "channel.close" || str(frame, "channelId") != channel {
			t.Fatal("Oversized frame reached worker")
		}
	})
}
