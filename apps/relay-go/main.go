// Standalone benchmark candidate for homarr-relay-v1; payloads remain opaque.
package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode/utf8"
)

var identifier = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)
var route = regexp.MustCompile(`^/(workers|connect)/([A-Za-z0-9_-]{43})$`)
var b64 = base64.RawURLEncoding.Strict()

type config struct {
	host, token                                                                                          string
	port, workers, connections, channels, perIP, upgrades, payload, buffered, messages, bytes, handshake int
	origins                                                                                              map[string]bool
}

func setting(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	n, err := strconv.ParseInt(value, 10, 53)
	if err != nil || n < 1 {
		log.Fatalf("Invalid %s", name)
	}
	return int(n)
}
func loadConfig() config {
	c := config{host: os.Getenv("HOST"), token: os.Getenv("RELAY_REGISTRATION_TOKEN"), origins: map[string]bool{}}
	if c.host == "" {
		c.host = "0.0.0.0"
	}
	origins, exists := os.LookupEnv("RELAY_ALLOWED_ORIGINS")
	if !exists {
		origins = "https://remote.homarr.dev"
	}
	for _, origin := range strings.Split(origins, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			c.origins[origin] = true
		}
	}
	c.port = setting("PORT", 8787)
	c.workers = setting("RELAY_MAX_WORKERS", 1000)
	c.connections = setting("RELAY_MAX_CONNECTIONS", 4096)
	c.channels = setting("RELAY_MAX_CHANNELS_PER_WORKER", 64)
	c.perIP = setting("RELAY_MAX_CONNECTIONS_PER_IP", 128)
	c.upgrades = setting("RELAY_MAX_UPGRADES_PER_MINUTE", 120)
	c.payload = setting("RELAY_MAX_PAYLOAD_LENGTH", 1048576)
	c.buffered = setting("RELAY_MAX_BUFFERED_BYTES", 2097152)
	c.messages = setting("RELAY_MAX_MESSAGES_PER_SECOND", 256)
	c.bytes = setting("RELAY_MAX_BYTES_PER_SECOND", 16777216)
	c.handshake = setting("RELAY_HANDSHAKE_TIMEOUT_MS", 5000)
	return c
}
func randomID() string {
	var v [32]byte
	if _, err := rand.Read(v[:]); err != nil {
		panic(err)
	}
	return b64.EncodeToString(v[:])
}
func hash(v []byte) string { h := sha256.Sum256(v); return b64.EncodeToString(h[:]) }

type sourceLimit struct {
	since            time.Time
	upgrades, active int
}
type worker struct {
	socket                     *peer
	generation, capabilityHash string
	channels                   map[string]*peer
}
type relay struct {
	mu       sync.Mutex // Owns admission and routing state; also preserves enqueue order.
	config   config
	workers  map[string]*worker
	peers    map[*peer]bool
	sources  map[string]*sourceLimit
	active   int
	stopping bool
}
type peer struct {
	relay                    *relay
	ws                       *websocket.Conn
	role, id, source, nonce  string
	worker                   *worker
	channel                  string
	ready, closed, verifying bool // Owned by relay.mu.
	timer                    *time.Timer
	window                   time.Time
	messages, bytes          int
	outMu                    sync.Mutex // Never acquire relay.mu while held.
	queue                    [][]byte
	queued                   int // Includes the in-flight write.
	wake                     chan struct{}
	done                     chan struct{}
}

func newRelay(c config) *relay {
	return &relay{config: c, workers: map[string]*worker{}, peers: map[*peer]bool{}, sources: map[string]*sourceLimit{}}
}
func (p *peer) finishLocked(code websocket.StatusCode, reason string) {
	if p.closed {
		return
	}
	p.closed = true
	if p.timer != nil {
		p.timer.Stop()
	}
	delete(p.relay.peers, p)
	p.relay.active--
	p.relay.sources[p.source].active--
	close(p.done)
	p.outMu.Lock()
	p.queue = nil
	p.outMu.Unlock()
	if w := p.worker; w != nil {
		if p.role == "workers" {
			if p.relay.workers[p.id] == w {
				delete(p.relay.workers, p.id)
			}
			for id, c := range w.channels {
				delete(w.channels, id)
				c.finishLocked(1000, "Worker disconnected")
			}
		} else if w.channels[p.channel] == p {
			delete(w.channels, p.channel)
			w.socket.sendLocked(map[string]any{"type": "channel.close", "channelId": p.channel})
		}
	}
	// Close waits for the peer; keep that wait outside the routing mutex.
	go func() { _ = p.ws.Close(code, reason) }()
}
func (p *peer) sendLocked(frame any) bool {
	if p.closed {
		return false
	}
	var body []byte
	if s, ok := frame.(string); ok {
		body = []byte(s)
	} else {
		body, _ = json.Marshal(frame)
	}
	p.outMu.Lock()
	if p.queued > p.relay.config.buffered-len(body) || len(p.queue) >= 4096 {
		p.outMu.Unlock()
		p.finishLocked(1013, "Receiver is too slow")
		return false
	}
	p.queued += len(body)
	p.queue = append(p.queue, body)
	p.outMu.Unlock()
	select {
	case p.wake <- struct{}{}:
	default:
	}
	return true
}
func (p *peer) writeLoop() {
	for {
		select {
		case <-p.done:
			return
		case <-p.wake:
		}
		for {
			p.outMu.Lock()
			if len(p.queue) == 0 {
				p.outMu.Unlock()
				break
			}
			body := p.queue[0]
			p.queue[0] = nil
			p.queue = p.queue[1:]
			p.outMu.Unlock()
			ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
			err := p.ws.Write(ctx, websocket.MessageText, body)
			cancel()
			p.outMu.Lock()
			p.queued -= len(body)
			p.outMu.Unlock()
			if err != nil {
				p.relay.mu.Lock()
				p.finishLocked(1013, "Receiver is too slow")
				p.relay.mu.Unlock()
				return
			}
		}
	}
}
func (r *relay) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	match := route.FindStringSubmatch(req.URL.Path)
	if match == nil {
		w.Header().Set("Content-Type", "application/json")
		switch req.URL.Path {
		case "/health/live":
			if req.Method == "GET" {
				fmt.Fprint(w, `{"status":"ok"}`)
				return
			}
		case "/health/ready":
			if req.Method == "GET" {
				r.mu.Lock()
				stopping := r.stopping
				r.mu.Unlock()
				if stopping {
					w.WriteHeader(503)
					fmt.Fprint(w, `{"status":"stopping"}`)
				} else {
					fmt.Fprint(w, `{"status":"ok","protocol":"homarr-relay-v1"}`)
				}
				return
			}
		}
		w.WriteHeader(404)
		fmt.Fprint(w, `{"error":"Not found"}`)
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	reject := func(code int, message string) { http.Error(w, message, code) }
	if r.stopping {
		reject(503, "Unavailable")
		return
	}
	if req.Method != "GET" || !strings.EqualFold(req.Header.Get("Upgrade"), "websocket") {
		reject(426, "WebSocket upgrade required")
		return
	}
	if req.URL.RawQuery != "" || req.URL.ForceQuery {
		reject(400, "Query parameters are not supported")
		return
	}
	role, id := match[1], match[2]
	origin := req.Header.Get("Origin")
	if role == "connect" && (origin == "" || !r.config.origins[origin]) {
		reject(403, "Origin rejected")
		return
	}
	if role == "workers" && origin != "" {
		reject(403, "Worker origin rejected")
		return
	}
	if role == "workers" && r.config.token != "" && subtle.ConstantTimeCompare([]byte(req.Header.Get("Authorization")), []byte("Bearer "+r.config.token)) != 1 {
		reject(401, "Registration rejected")
		return
	}
	if r.active >= r.config.connections {
		reject(503, "Relay capacity reached")
		return
	}
	source, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		source = req.RemoteAddr
	}
	now := time.Now()
	limit := r.sources[source]
	if limit == nil {
		if len(r.sources) >= 8192 {
			reject(503, "Relay capacity reached")
			return
		}
		limit = &sourceLimit{since: now}
		r.sources[source] = limit
	}
	if now.Sub(limit.since) >= time.Minute {
		limit.since = now
		limit.upgrades = 0
	}
	if limit.upgrades >= r.config.upgrades || limit.active >= r.config.perIP {
		reject(429, "Connection rate limit reached")
		return
	}
	limit.upgrades++
	limit.active++
	r.active++
	// Origin already checked exactly above, including scheme and port.
	ws, err := websocket.Accept(w, req, &websocket.AcceptOptions{InsecureSkipVerify: true, CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		limit.active--
		r.active--
		return
	}
	ws.SetReadLimit(int64(r.config.payload))
	p := &peer{relay: r, ws: ws, role: role, id: id, source: source, nonce: randomID(), window: now, wake: make(chan struct{}, 1), done: make(chan struct{})}
	r.peers[p] = true
	p.timer = time.AfterFunc(time.Duration(r.config.handshake)*time.Millisecond, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if !p.ready {
			p.finishLocked(1008, "Handshake timed out")
		}
	})
	if role == "workers" {
		p.sendLocked(map[string]any{"type": "challenge", "nonce": p.nonce})
	}
	go p.writeLoop()
	go p.readLoop()
}
func (p *peer) readLoop() {
	defer func() {
		p.relay.mu.Lock()
		p.finishLocked(1000, "Connection closed")
		p.relay.mu.Unlock()
	}()
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
		kind, body, err := p.ws.Read(ctx)
		cancel()
		if err != nil {
			return
		}
		p.relay.mu.Lock()
		if p.closed {
			p.relay.mu.Unlock()
			return
		}
		if kind != websocket.MessageText {
			p.finishLocked(1003, "Text frames required")
		} else if !utf8.Valid(body) {
			p.finishLocked(1007, "Invalid UTF-8")
		} else {
			p.messageLocked(body)
		}
		closed := p.closed
		p.relay.mu.Unlock()
		if closed {
			return
		}
	}
}
func decodeFrame(body []byte) map[string]json.RawMessage {
	var f map[string]json.RawMessage
	if json.Unmarshal(body, &f) != nil {
		return nil
	}
	return f
}
func str(f map[string]json.RawMessage, key string) string {
	var s string
	_ = json.Unmarshal(f[key], &s)
	return s
}
func isString(f map[string]json.RawMessage, key string) bool {
	v := f[key]
	return len(v) > 0 && v[0] == '"'
}
func (p *peer) messageLocked(body []byte) {
	r := p.relay
	now := time.Now()
	if len(body) > r.config.payload {
		p.finishLocked(1009, "Frame too large")
		return
	}
	if now.Sub(p.window) >= time.Second {
		p.window = now
		p.messages = 0
		p.bytes = 0
	}
	p.messages++
	p.bytes += len(body)
	if p.messages > r.config.messages || p.bytes > r.config.bytes {
		p.finishLocked(1008, "Connection rate limit reached")
		return
	}
	if p.verifying {
		p.finishLocked(1008, "Handshake in progress")
		return
	}
	if p.role == "connect" && p.ready {
		if p.worker == nil || r.workers[p.id] != p.worker {
			p.finishLocked(1012, "Worker disconnected")
			return
		}
		if !p.worker.socket.sendLocked(map[string]any{"type": "channel.message", "channelId": p.channel, "payload": string(body)}) {
			p.finishLocked(1013, "Worker unavailable")
		}
		return
	}
	f := decodeFrame(body)
	if f == nil {
		p.finishLocked(1008, "Invalid frame")
		return
	}
	if !p.ready {
		if p.role == "workers" {
			p.registerLocked(f)
		} else {
			p.connectLocked(f)
		}
		return
	}
	w := p.worker
	if w == nil || r.workers[p.id] != w {
		p.finishLocked(1012, "Worker disconnected")
		return
	}
	kind := str(f, "type")
	if kind == "ping" {
		p.sendLocked(map[string]any{"type": "pong"})
		return
	}
	if !isString(f, "channelId") {
		p.finishLocked(1008, "Invalid channel")
		return
	}
	id := str(f, "channelId")
	if kind == "channel.close" {
		if c := w.channels[id]; c != nil {
			delete(w.channels, id)
			c.finishLocked(1000, "Channel closed")
		}
		return
	}
	if kind == "channel.message" && isString(f, "payload") {
		if c := w.channels[id]; c != nil {
			c.sendLocked(str(f, "payload"))
		}
		return
	}
	p.finishLocked(1008, "Invalid worker frame")
}
func publicKey(f map[string]json.RawMessage) (*ecdsa.PublicKey, bool) {
	key := decodeFrame(f["publicKey"])
	if key == nil || str(key, "kty") != "EC" || str(key, "crv") != "P-256" || key["d"] != nil {
		return nil, false
	}
	x, e1 := b64.DecodeString(str(key, "x"))
	y, e2 := b64.DecodeString(str(key, "y"))
	if e1 != nil || e2 != nil || len(x) != 32 || len(y) != 32 {
		return nil, false
	}
	pub := &ecdsa.PublicKey{Curve: elliptic.P256(), X: new(big.Int).SetBytes(x), Y: new(big.Int).SetBytes(y)}
	return pub, pub.Curve.IsOnCurve(pub.X, pub.Y)
}
func (p *peer) registerLocked(f map[string]json.RawMessage) {
	pub, valid := publicKey(f)
	signature := str(f, "signature")
	capabilityHash := str(f, "capabilityHash")
	if str(f, "type") != "register" || !valid || len(signature) != 86 || !identifier.MatchString(capabilityHash) {
		p.finishLocked(1008, "Invalid worker registration")
		return
	}
	p.verifying = true
	go func() {
		sig, err := b64.DecodeString(signature)
		challenge, _ := json.Marshal([]string{"homarr-relay-register-v1", p.id, p.nonce})
		digest := sha256.Sum256(challenge)
		accepted := hash(elliptic.Marshal(pub.Curve, pub.X, pub.Y)) == p.id && err == nil && len(sig) == 64 && ecdsa.Verify(pub, digest[:], new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:]))
		p.relay.mu.Lock()
		defer p.relay.mu.Unlock()
		if p.closed {
			return
		}
		if !accepted {
			p.finishLocked(1008, "Worker proof rejected")
			return
		}
		p.registerVerifiedLocked(capabilityHash)
	}()
}
func (p *peer) registerVerifiedLocked(capabilityHash string) {
	r := p.relay
	previous := r.workers[p.id]
	if previous == nil && len(r.workers) >= r.config.workers {
		p.finishLocked(1013, "Relay capacity reached")
		return
	}
	if previous != nil {
		for id, c := range previous.channels {
			delete(previous.channels, id)
			c.finishLocked(1000, "Worker reconnected")
		}
		previous.socket.finishLocked(1012, "Worker reconnected")
	}
	w := &worker{socket: p, generation: randomID(), capabilityHash: capabilityHash, channels: map[string]*peer{}}
	p.worker = w
	p.ready = true
	p.verifying = false
	p.timer.Stop()
	r.workers[p.id] = w
	p.sendLocked(map[string]any{"type": "registered", "workerId": p.id, "generation": w.generation})
}
func (p *peer) connectLocked(f map[string]json.RawMessage) {
	capability := str(f, "capability")
	if str(f, "type") != "connect" || !identifier.MatchString(capability) {
		p.finishLocked(1008, "Invalid connection capability")
		return
	}
	p.verifying = true
	go func() {
		digest := hash([]byte(capability))
		p.relay.mu.Lock()
		defer p.relay.mu.Unlock()
		if p.closed {
			return
		}
		p.connectVerifiedLocked(digest)
	}()
}
func (p *peer) connectVerifiedLocked(digest string) {
	w := p.relay.workers[p.id]
	if w == nil || subtle.ConstantTimeCompare([]byte(digest), []byte(w.capabilityHash)) != 1 {
		p.finishLocked(1008, "Connection rejected")
		return
	}
	if len(w.channels) >= p.relay.config.channels {
		p.finishLocked(1013, "Worker channel limit reached")
		return
	}
	p.worker = w
	p.channel = randomID()
	p.ready = true
	p.verifying = false
	p.timer.Stop()
	w.channels[p.channel] = p
	if !w.socket.sendLocked(map[string]any{"type": "channel.open", "channelId": p.channel}) {
		p.finishLocked(1013, "Worker unavailable")
		return
	}
	p.sendLocked(map[string]any{"type": "connected", "channelId": p.channel, "generation": w.generation, "maxPayloadLength": p.relay.config.payload})
}
func (r *relay) prune() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for ip, limit := range r.sources {
		if limit.active == 0 && time.Since(limit.since) > time.Minute {
			delete(r.sources, ip)
		}
	}
}
func (r *relay) stop() {
	r.mu.Lock()
	r.stopping = true
	peers := make([]*peer, 0, len(r.peers))
	for p := range r.peers {
		peers = append(peers, p)
	}
	for _, p := range peers {
		p.finishLocked(1001, "Relay stopping")
	}
	r.mu.Unlock()
	for _, p := range peers {
		_ = p.ws.CloseNow()
	}
}
func main() {
	c := loadConfig()
	r := newRelay(c)
	server := &http.Server{Addr: net.JoinHostPort(c.host, strconv.Itoa(c.port)), Handler: r, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 120 * time.Second, WriteTimeout: 10 * time.Second, MaxHeaderBytes: 16 * 1024}
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-signals
		r.stop()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}()
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			r.prune()
		}
	}()
	log.Printf("Homarr Go relay candidate listening on port %d", c.port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
