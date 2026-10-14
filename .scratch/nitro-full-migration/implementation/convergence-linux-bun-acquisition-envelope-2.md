# Linux Bun acquisition: selected v2 argument-only envelope

**AUTHORING ONLY; not an execution release.** This new report addresses only the independent AUTHOR HOLD P2 on parent-zsh heredoc backing. `convergence-linux-bun-acquisition-envelope.md` remains unchanged historical evidence. The complete selected command below replaces `-` plus heredoc with a single literal `-c` argument; no heredoc, here-string, source helper, command/process substitution, generator, encoded payload or backing-file allocation is part of this envelope.

The acquisition Python body is copied without intentional changes. Its decoded byte equivalence to the historical heredoc body, including its final newline, is an **expectation pending independent source comparison**, not a measured hash or completed syntax check. Standard shell single quoting carries all newlines/backslashes literally; the one inner apostrophe in the HTTP-header regex uses the ordinary four-character shell splice `'\''`: close the quote, escape an apostrophe outside it, reopen the quote. The command below is authoritative. No parser, function, request, resource limit, FD handling, clock, output schema, candidate ID or parent marker is redesigned. Selected **delivery-envelope v2** retains the existing `linux-bun-acquisition-matplan01-v1` association label and terminal nonce; neither is a capability or freshness proof.

## Fixed handoff / unchanged finite scope

- Future tool selection: `workdir` `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-linux-bun-binding-matplan01`, `background:false`, `timeout:35000`. B remains the same **unallocated/ABSENT future root**, per current authority state; this authoring did not inspect or allocate it. Later absence verification/allocation requires a separate explicit grant for fresh canonical owned501:20/0700 B/{records,home,tmp}; no collision repair or relocation.
- Client reads: enrolled env/Python/zsh binaries and Python stdlib; literal argv source, not stdin/script storage; B/directory metadata and membership, fresh output-FD metadata, literal Unix socket metadata and three bounded responses, stdout-FD metadata/readiness. No private config/history/environment files, global search, datafile body, directory archive, alternative endpoint or inventory. Interpreter/harness ordinary startup/exit behavior is not universal all-fault attestation; the selected shell command has no source-delivery staging redirection or allocation.
- Exactly the same conditional GET sequence on `/Users/ajnart/.orbstack/run/docker.sock`: `/v1.56/containers/637833a9b6c892692e255af4d7627a48b0ffba0f8811b8d6a7e6725a28d2df1a/json` → `/v1.56/containers/637833a9b6c892692e255af4d7627a48b0ffba0f8811b8d6a7e6725a28d2df1a/archive?path=%2Fusr%2Flocal%2Fbin%2Fbun` → first inspect again, only after prior validation/physical local closure. No extra request or retry. Previously reviewed internal daemon mount/setup/source-stat/possible placeholder/archive-event scope remains explicit; HTTP EOF is not daemon unmount proof.
- Only three exclusive output files: B/records/claim.json≤4096, bun.tar≤134283264, binding.json≤16384; O_EXCL/O_NOFOLLOW0600, successful archive/binding0400 after sync, physically attempted local closes; held/partial records retained without overwrite/unlink/recreate. A successfully synced/closed claim is required before any GET or binding write. No helper, extraction, executable copy or other allocation.
- Original wall+monotonic30s roots remain before any claim/write/GET, per socket operation≤min(5s,remaining); foreground35s is ordinary operational coverage, not exact physical-exit/transport/all-fault cleanup assurance. Unchanged caps: headers16384 while read, inspect1048576 each, stat4096 encoded/3072 decoded, Bun134217728, tar overhead65536, local PAX16384, chunk framing1048576/line1024. Strict JSON/inspect/stat/HTTP/manual tar/ELF rules are exactly those in the literal body, not weakened exceptions.

## Exact selected shell command

```zsh
builtin emulate -R zsh
if command /usr/bin/env -i \
  PATH=/usr/bin:/bin \
  HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-linux-bun-binding-matplan01/home \
  TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-linux-bun-binding-matplan01/tmp \
  /opt/homebrew/Cellar/python@3.15/3.15.0/Frameworks/Python.framework/Versions/3.15/bin/python3.15 -I -S -B -c 'import base64
import datetime
import decimal
import hashlib
import http.client
import json
import os
import re
import selectors
import socket
import stat
import sys
import tarfile
import time

ROOT_WALL = time.time_ns()
ROOT_MONO = time.monotonic_ns()
LAST_WALL = ROOT_WALL
LAST_MONO = ROOT_MONO
B = "/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-linux-bun-binding-matplan01"
ENDPOINT = "/Users/ajnart/.orbstack/run/docker.sock"
CID = "637833a9b6c892692e255af4d7627a48b0ffba0f8811b8d6a7e6725a28d2df1a"
IMAGE = "sha256:a81de950abb8b5d961ed8c1dcd345450fab8cda00ea3c11e7ec24a4ed4bb82ce"
DIGEST = "oven/bun@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895"
INSPECT = "/v1.56/containers/" + CID + "/json"
ARCHIVE = "/v1.56/containers/" + CID + "/archive?path=%2Fusr%2Flocal%2Fbin%2Fbun"
CANDIDATE = "linux-bun-acquisition-matplan01-v1"
MAX_ARCHIVE = 134283264
FILES = []
REQUESTS = []
CLEANUP = []


class Hold(Exception):
    pass


def need(condition, code):
    if not condition:
        raise Hold(code)


def fault(code):
    if len(CLEANUP) < 16:
        CLEANUP.append(code)


def check():
    global LAST_WALL, LAST_MONO
    wall = time.time_ns()
    mono = time.monotonic_ns()
    need(wall >= LAST_WALL and mono >= LAST_MONO, "clock-regressed")
    LAST_WALL, LAST_MONO = wall, mono
    remaining = min(30000000000 - (wall - ROOT_WALL), 30000000000 - (mono - ROOT_MONO))
    need(remaining > 0, "original-bound-expired")
    return remaining / 1000000000


def unique(pairs):
    value = {}
    for key, item in pairs:
        need(key not in value, "json-duplicate-key")
        value[key] = item
    return value


def nonfinite(value):
    raise Hold("json-nonfinite")


def decode(data):
    return json.loads(data.decode("utf-8", "strict"), object_pairs_hook=unique, parse_constant=nonfinite, parse_float=decimal.Decimal)


def encode(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False) + "\n").encode("ascii")


def integer(value):
    return type(value) is int


def timestamp(value):
    need(type(value) is str and len(value) <= 40, "timestamp-shape")
    need(re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})", value) is not None, "timestamp-shape")
    parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    delta = parsed.astimezone(datetime.timezone.utc) - datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)
    seconds = delta.days * 86400 + delta.seconds
    need(0 < seconds <= 253402300799, "timestamp-range")
    return seconds


def empty(value):
    return value is None or (type(value) in {list, dict, str} and len(value) == 0)


def project(value):
    need(type(value) is dict, "inspect-shape")
    need(value.get("Id") == CID and value.get("Image") == IMAGE and value.get("Platform") == "linux", "inspect-identity")
    state = value.get("State")
    host = value.get("HostConfig")
    need(type(state) is dict and type(host) is dict, "inspect-shape")
    need(state.get("Status") == "exited", "not-exited")
    for key in ["Running", "Paused", "Restarting", "Dead", "OOMKilled"]:
        need(state.get(key) is False, "state-not-clean")
    for key in ["Pid", "ExitCode"]:
        need(integer(state.get(key)) and state[key] == 0, "state-not-clean")
    need(type(state.get("Error")) is str and state["Error"] == "", "daemon-error-present")
    started = state.get("StartedAt")
    finished = state.get("FinishedAt")
    need(timestamp(finished) >= timestamp(started), "state-timestamp-order")
    need(host.get("ReadonlyRootfs") is True and host.get("Privileged") is False and host.get("AutoRemove") is False, "root-policy-mismatch")
    restart = host.get("RestartPolicy")
    need(type(restart) is dict and restart.get("Name") == "no" and integer(restart.get("MaximumRetryCount")) and restart["MaximumRetryCount"] == 0, "restart-policy-mismatch")
    need(empty(host.get("Binds")) and empty(host.get("VolumesFrom")), "unexpected-bind-policy")
    need(empty(host.get("StorageOpt")), "unexpected-storage-policy")
    tmpfs = host.get("Tmpfs")
    need(tmpfs == {"/work": "rw,nosuid,nodev,noexec,size=268435456,uid=501,gid=20,mode=0700"}, "tmpfs-mismatch")
    configured = host.get("Mounts")
    need(type(configured) is list and len(configured) == 2, "configured-mount-shape")
    targets = []
    for mount in configured:
        need(type(mount) is dict and mount.get("Type") == "bind" and mount.get("ReadOnly") is True, "configured-mount-policy")
        target = mount.get("Target")
        need(target in {"/control", "/assets/sqlite"} and target not in targets, "configured-mount-target")
        targets.append(target)
    mounts = value.get("Mounts")
    need(type(mounts) is list and len(mounts) in {2, 3}, "mount-shape")
    selected = []
    seen = set()
    for mount in mounts:
        need(type(mount) is dict, "mount-shape")
        destination = mount.get("Destination")
        need(type(destination) is str and destination in {"/control", "/assets/sqlite", "/work"} and destination not in seen, "mount-destination")
        seen.add(destination)
        if destination == "/work":
            need(mount.get("Type") == "tmpfs" and mount.get("RW") is True, "mount-policy")
            need(mount.get("Propagation") is None or mount.get("Propagation") == "", "tmpfs-propagation")
        else:
            need(mount.get("Type") == "bind" and mount.get("RW") is False and mount.get("Propagation") == "rprivate", "mount-policy")
        selected.append({"destination": destination, "type": mount["Type"], "rw": mount["RW"], "propagation": mount.get("Propagation")})
    need({"/control", "/assets/sqlite"}.issubset(seen), "mount-missing")
    return {
        "id": CID, "imageId": IMAGE, "platform": "linux",
        "state": {"status": "exited", "pid": state["Pid"], "exitCode": state["ExitCode"], "running": state["Running"], "paused": state["Paused"], "restarting": state["Restarting"], "dead": state["Dead"], "oomKilled": state["OOMKilled"], "errorPresent": False, "startedAt": started, "finishedAt": finished},
        "host": {"readonlyRootfs": host["ReadonlyRootfs"], "privileged": host["Privileged"], "autoRemove": host["AutoRemove"], "restart": {"name": restart["Name"], "maximumRetryCount": restart["MaximumRetryCount"]}, "bindsEmpty": True, "volumesFromEmpty": True, "storageOptEmpty": True, "configuredTargets": sorted(targets), "tmpfs": tmpfs},
        "mounts": sorted(selected, key=lambda item: item["destination"]),
    }


class ExclusiveFile:
    def __init__(self, name, limit):
        self.fd = None
        self.limit = limit
        self.sha = hashlib.sha256()
        self.task = {"name": name, "opened": False, "bytes": 0, "synced": False, "frozen": False, "closeAttempted": False, "closed": False}
        FILES.append(self)
        check()
        self.fd = os.open(B + "/records/" + name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        self.task["opened"] = True
        attributes = os.fstat(self.fd)
        need(stat.S_ISREG(attributes.st_mode) and attributes.st_uid == 501 and attributes.st_gid == 20 and attributes.st_nlink == 1 and stat.S_IMODE(attributes.st_mode) == 0o600, "output-identity")
        check()

    def write(self, data):
        need(self.fd is not None and self.task["bytes"] + len(data) <= self.limit, "file-bound")
        offset = 0
        while offset < len(data):
            check()
            count = os.write(self.fd, data[offset:])
            need(count > 0, "file-write-no-progress")
            self.sha.update(data[offset:offset + count])
            self.task["bytes"] += count
            offset += count
            check()

    def close(self):
        if self.fd is None:
            return
        fd, self.fd = self.fd, None
        self.task["closeAttempted"] = True
        try:
            os.close(fd)
            self.task["closed"] = True
        except BaseException:
            fault(self.task["name"] + "-close-unknown")

    def finish(self, frozen):
        check()
        os.fsync(self.fd)
        self.task["synced"] = True
        check()
        if frozen:
            os.fchmod(self.fd, 0o400)
            os.fsync(self.fd)
            self.task["frozen"] = True
            check()
        self.close()
        need(self.task["closed"], "file-close-unknown")
        check()
        self.task["sha256"] = self.sha.hexdigest()


def persist(name, value, limit, frozen):
    data = encode(value)
    need(len(data) <= limit, "json-output-bound")
    output = ExclusiveFile(name, limit)
    try:
        output.write(data)
        output.finish(frozen)
        return output.task["sha256"]
    finally:
        output.close()


class Wire:
    def __init__(self, connection, task):
        self.connection = connection
        self.task = task
        self.headers = True
        self.header_bytes = 0
        self.lines = 0
        self.names = set()
        self.closed = False

    def read(self, count):
        need(not self.closed and count > 0, "wire-state")
        self.connection.settimeout(min(5.0, check()))
        data = self.connection.recv(count)
        check()
        return data

    def readline(self, limit=1024):
        data = bytearray()
        ceiling = min(limit, 1024)
        if self.headers:
            ceiling = min(limit, 16384 - self.header_bytes)
        while len(data) < ceiling:
            block = self.read(1)
            need(block != b"", "http-line-truncated")
            data.extend(block)
            if self.headers:
                self.header_bytes += 1
            if block == b"\n":
                break
        line = bytes(data)
        need(line.endswith(b"\r\n"), "http-line-bound-or-shape")
        if self.headers:
            if self.lines == 0:
                match = re.fullmatch(rb"HTTP/1\.1 ([0-9]{3})(?: [\x20-\x7e]*)?\r\n", line)
                need(match is not None, "http-status-shape")
                self.task["status"] = int(match.group(1))
                need(self.task["status"] == 200, "http-status-not-200")
            elif line != b"\r\n":
                key, separator, value = line[:-2].partition(b":")
                need(separator == b":" and re.fullmatch(rb"[!#$%&'\''*+.^_`|~0-9A-Za-z-]+", key) is not None and re.fullmatch(rb"[\t\x20-\x7e]*", value) is not None, "http-header-shape")
                lowered = key.lower()
                need(lowered not in self.names, "http-header-duplicate")
                self.names.add(lowered)
            self.lines += 1
        return line

    def exact(self, count):
        data = bytearray()
        while len(data) < count:
            block = self.read(count - len(data))
            need(block != b"", "http-body-truncated")
            data.extend(block)
        return bytes(data)

    def close(self):
        self.closed = True


class SocketView:
    def __init__(self, wire):
        self.wire = wire

    def makefile(self, mode):
        need(mode == "rb", "http-reader-mode")
        return self.wire


class Body:
    def __init__(self, response, wire, task, maximum):
        self.wire = wire
        self.task = task
        self.maximum = maximum
        self.count = 0
        self.framing = 0
        self.ended = False
        self.chunk_left = 0
        self.chunk_crlf = False
        encoding = response.getheader("Content-Encoding")
        need(encoding is None or encoding.lower().strip() == "identity", "http-content-encoding")
        connection = response.getheader("Connection")
        need(connection is None or connection.lower().strip() == "close", "http-connection-policy")
        length = response.getheader("Content-Length")
        transfer = response.getheader("Transfer-Encoding")
        need((length is None) != (transfer is None), "http-framing-ambiguous")
        self.chunked = transfer is not None
        if self.chunked:
            need(transfer.lower().strip() == "chunked", "http-transfer-encoding")
        else:
            need(re.fullmatch(r"0|[1-9][0-9]{0,9}", length) is not None, "http-content-length")
            self.left = int(length)
            need(self.left <= maximum, "http-body-bound")

    def finish(self):
        need(self.wire.read(1) == b"", "http-trailing-bytes")
        self.ended = True
        self.task["bodyEOF"] = True
        self.task["socketEOF"] = True
        self.task["bodyBytes"] = self.count

    def read(self, count):
        if self.ended:
            return b""
        if self.chunked:
            if self.chunk_left == 0:
                if self.chunk_crlf:
                    need(self.wire.exact(2) == b"\r\n", "http-chunk-delimiter")
                    self.framing += 2
                    self.chunk_crlf = False
                line = self.wire.readline(1024)
                self.framing += len(line)
                need(self.framing <= 1048576, "http-chunk-framing-bound")
                need(re.fullmatch(rb"(?:0|[1-9a-fA-F][0-9a-fA-F]{0,7})\r\n", line) is not None, "http-chunk-shape")
                self.chunk_left = int(line[:-2], 16)
                need(self.chunk_left <= self.maximum - self.count, "http-body-bound")
                if self.chunk_left == 0:
                    need(self.wire.readline(2) == b"\r\n", "http-trailers-forbidden")
                    self.framing += 2
                    need(self.framing <= 1048576, "http-chunk-framing-bound")
                    self.finish()
                    return b""
            wanted = min(count, self.chunk_left, 65536)
        else:
            if self.left == 0:
                self.finish()
                return b""
            wanted = min(count, self.left, 65536)
        block = self.wire.read(wanted)
        need(block != b"", "http-body-truncated")
        self.count += len(block)
        need(self.count <= self.maximum, "http-body-bound")
        if self.chunked:
            self.chunk_left -= len(block)
            if self.chunk_left == 0:
                self.chunk_crlf = True
        else:
            self.left -= len(block)
        return block


class TarStream:
    def __init__(self, body, output):
        self.body = body
        self.output = output

    def read(self, count):
        block = self.body.read(count)
        if block:
            self.output.write(block)
        return block

    def exact(self, count):
        data = bytearray()
        while len(data) < count:
            block = self.read(count - len(data))
            need(block != b"", "tar-truncated")
            data.extend(block)
        return bytes(data)

    def padding(self, size):
        count = (-size) % 512
        if count:
            need(self.exact(count) == bytes(count), "tar-padding-nonzero")


def header(block):
    need(len(block) == 512 and block != bytes(512), "tar-header-missing")
    need(block[257:263] == b"ustar\x00" and block[263:265] == b"00" and block[345:500] == bytes(155) and block[500:512] == bytes(12), "tar-header-format")
    need(block[157:257] == bytes(100), "tar-link-bytes")
    for start, end in [(100, 108), (108, 116), (116, 124), (124, 136), (136, 148), (148, 156), (329, 337), (337, 345)]:
        need(re.fullmatch(rb" *[0-7]+[\x00 ]*|[\x00 ]+", block[start:end]) is not None, "tar-numeric-format")
    value = tarfile.TarInfo.frombuf(block, "utf-8", "strict")
    need(value.name in {"bun", "PaxHeaders.0/bun"}, "tar-name-policy")
    raw_name = value.name.encode("ascii")
    need(block[:100] == raw_name + bytes(100 - len(raw_name)), "tar-name-bytes")
    need(value.chksum == sum(block[:148]) + 256 + sum(block[156:]), "tar-unsigned-checksum")
    need(value.linkname == "" and value.devmajor == 0 and value.devminor == 0, "tar-link-or-device")
    return value


def pax(data):
    values = {}
    offset = 0
    while offset < len(data):
        end = data.find(b" ", offset)
        need(end > offset and end - offset <= 5, "pax-length-shape")
        length_text = data[offset:end]
        need(re.fullmatch(rb"[1-9][0-9]{0,4}", length_text) is not None, "pax-length-shape")
        length = int(length_text)
        need(end + 1 < offset + length <= len(data) and data[offset + length - 1:offset + length] == b"\n", "pax-record-bound")
        key, separator, raw = data[end + 1:offset + length - 1].partition(b"=")
        need(separator == b"=" and key in {b"mtime", b"atime", b"ctime"} and key not in values, "pax-key-policy")
        need(re.fullmatch(rb"[0-9]{1,12}(?:\.[0-9]{1,9})?", raw) is not None, "pax-time-shape")
        number = decimal.Decimal(raw.decode("ascii"))
        need(number.is_finite() and 0 <= number <= 253402300799, "pax-time-range")
        values[key] = number
        offset += length
    need(len(values) > 0, "pax-empty")
    return values


def path_stat(response):
    text = response.getheader("X-Docker-Container-Path-Stat")
    need(type(text) is str and 0 < len(text) <= 4096, "path-stat-header-bound")
    raw = base64.b64decode(text.encode("ascii"), validate=True)
    need(len(raw) <= 3072 and base64.b64encode(raw).decode("ascii") == text, "path-stat-base64")
    value = decode(raw)
    need(type(value) is dict and set(value) == {"name", "size", "mode", "mtime", "linkTarget"}, "path-stat-shape")
    need(value["name"] == "bun" and value["linkTarget"] == "", "path-stat-path-or-link")
    need(integer(value["size"]) and 64 <= value["size"] <= 134217728, "path-stat-size")
    need(integer(value["mode"]) and 0 <= value["mode"] <= 0o777 and value["mode"] & 0o111 != 0, "path-stat-not-regular-executable")
    timestamp(value["mtime"])
    return value


def archive(body, response):
    observed = path_stat(response)
    output = ExclusiveFile("bun.tar", MAX_ARCHIVE)
    stream = TarStream(body, output)
    info = header(stream.exact(512))
    times = {}
    if info.type == tarfile.XHDTYPE:
        need(info.name == "PaxHeaders.0/bun" and 0 < info.size <= 16384, "pax-header-policy")
        times = pax(stream.exact(info.size))
        stream.padding(info.size)
        info = header(stream.exact(512))
    need(info.type in {tarfile.REGTYPE, tarfile.AREGTYPE} and info.name == "bun", "tar-member-policy")
    need(info.size == observed["size"] and info.mode == observed["mode"] and info.mtime == timestamp(observed["mtime"]), "tar-stat-mismatch")
    if b"mtime" in times:
        need(times[b"mtime"] == decimal.Decimal(info.mtime), "pax-mtime-mismatch")
    payload = hashlib.sha256()
    first = bytearray()
    left = info.size
    while left:
        block = stream.exact(min(left, 65536))
        payload.update(block)
        if len(first) < 64:
            first.extend(block[:64 - len(first)])
        left -= len(block)
    need(first[:4] == b"\x7fELF" and first[4] == 2 and first[5] == 1 and first[6] == 1 and int.from_bytes(first[18:20], "little") == 183, "elf-identity-mismatch")
    stream.padding(info.size)
    need(stream.exact(1024) == bytes(1024), "tar-terminator-missing")
    while True:
        block = stream.read(65536)
        if not block:
            break
        need(block == bytes(len(block)), "tar-trailing-member-or-data")
    need(output.task["bytes"] % 512 == 0 and output.task["bytes"] - info.size <= 65536, "tar-total-padding-bound")
    output.finish(True)
    return {"pathStat": observed, "member": {"name": "bun", "type": "regular", "bytes": info.size, "mode": info.mode, "mtimeSeconds": info.mtime, "paxTimes": {key.decode("ascii"): str(value) for key, value in times.items()}, "elfClass": 64, "elfEndian": "little", "elfMachine": 183}, "bunExecutable": "/usr/local/bin/bun", "bunExecutableSha256": payload.hexdigest(), "archiveBytes": output.task["bytes"], "archiveSha256": output.task["sha256"]}


def request(kind):
    check()
    ordinal = len(REQUESTS) + 1
    need((ordinal, kind) in {(1, "before"), (2, "archive"), (3, "after")}, "request-sequence")
    path = INSPECT
    maximum = 1048576
    media = "application/json"
    if kind == "archive":
        path, maximum, media = ARCHIVE, MAX_ARCHIVE, "application/x-tar"
    task = {"ordinal": ordinal, "kind": kind, "startedWallNs": LAST_WALL, "startedMonotonicNs": LAST_MONO, "sent": False, "bodyEOF": False, "socketEOF": False, "responseClosed": False, "socketClosed": False}
    REQUESTS.append(task)
    connection = None
    response = None
    value = None
    try:
        connection = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        connection.settimeout(min(5.0, check()))
        connection.connect(ENDPOINT)
        check()
        data = ("GET " + path + " HTTP/1.1\r\nHost: localhost\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n").encode("ascii")
        offset = 0
        while offset < len(data):
            connection.settimeout(min(5.0, check()))
            count = connection.send(data[offset:])
            need(count > 0, "http-send-no-progress")
            task["sent"] = True
            offset += count
            check()
        wire = Wire(connection, task)
        response = http.client.HTTPResponse(SocketView(wire), method="GET")
        response.begin()
        wire.headers = False
        task["headerBytes"] = wire.header_bytes
        need(response.status == 200 and response.version == 11, "http-status-or-version")
        content_type = response.getheader("Content-Type")
        need(type(content_type) is str and content_type.lower().strip() in {media, media + "; charset=utf-8"}, "http-content-type")
        body = Body(response, wire, task, maximum)
        if kind == "archive":
            value = archive(body, response)
        else:
            encoded = bytearray()
            while True:
                block = body.read(65536)
                if not block:
                    break
                encoded.extend(block)
            value = project(decode(bytes(encoded)))
        need(task["bodyEOF"] and task["socketEOF"], "http-eof-unconfirmed")
        check()
    finally:
        if response is not None:
            try:
                response.close()
                task["responseClosed"] = True
            except BaseException:
                fault(kind + "-response-close-unknown")
        if connection is not None:
            try:
                connection.close()
                task["socketClosed"] = True
            except BaseException:
                fault(kind + "-socket-close-unknown")
    need(task["responseClosed"] and task["socketClosed"] and not CLEANUP, "http-close-unconfirmed")
    check()
    task["settledWallNs"] = LAST_WALL
    task["settledMonotonicNs"] = LAST_MONO
    return value


def preflight():
    need(os.getuid() == 501 and os.getgid() == 20 and os.getcwd() == B, "owner-or-cwd")
    for path in [B, B + "/records", B + "/home", B + "/tmp"]:
        check()
        attributes = os.lstat(path)
        need(stat.S_ISDIR(attributes.st_mode) and attributes.st_uid == 501 and attributes.st_gid == 20 and stat.S_IMODE(attributes.st_mode) == 0o700 and os.path.realpath(path) == path, "private-directory")
    need(set(os.listdir(B)) == {"records", "home", "tmp"}, "allocation-members")
    for path in [B + "/records", B + "/home", B + "/tmp"]:
        need(os.listdir(path) == [], "allocation-not-empty")
    endpoint = os.lstat(ENDPOINT)
    need(stat.S_ISSOCK(endpoint.st_mode) and endpoint.st_uid == 501 and endpoint.st_gid == 20 and stat.S_IMODE(endpoint.st_mode) == 0o755 and os.path.realpath(ENDPOINT) == ENDPOINT, "endpoint-identity")
    os.umask(0o077)
    check()
    return {"path": ENDPOINT, "device": endpoint.st_dev, "inode": endpoint.st_ino, "uid": endpoint.st_uid, "gid": endpoint.st_gid, "mode": stat.S_IMODE(endpoint.st_mode)}


def run():
    primary = None
    before = None
    after = None
    measured = None
    endpoint = None
    claim_digest = None
    binding_digest = None
    try:
        endpoint = preflight()
        claim_digest = persist("claim.json", {"version": 1, "candidateId": CANDIDATE, "releaseAssociation": "external-exact-envelope-review-and-release", "requests": [INSPECT, ARCHIVE, INSPECT], "endpoint": ENDPOINT, "rootWallNs": ROOT_WALL, "rootMonotonicNs": ROOT_MONO, "totalMs": 30000, "retry": False, "state": "consumed-before-first-get"}, 4096, False)
        before = request("before")
        measured = request("archive")
        after = request("after")
        need(before == after, "inspect-projection-changed")
        final_endpoint = os.lstat(ENDPOINT)
        need((final_endpoint.st_dev, final_endpoint.st_ino, final_endpoint.st_uid, final_endpoint.st_gid, stat.S_IMODE(final_endpoint.st_mode)) == (endpoint["device"], endpoint["inode"], endpoint["uid"], endpoint["gid"], endpoint["mode"]) and stat.S_ISSOCK(final_endpoint.st_mode) and os.path.realpath(ENDPOINT) == ENDPOINT, "endpoint-changed")
        check()
    except BaseException as error:
        primary = str(error) if type(error) is Hold else "acquisition-operation-failed"
    finally:
        for output in FILES:
            output.close()
    complete = primary is None and not CLEANUP and len(REQUESTS) == 3 and before == after and measured is not None
    receipt = {"version": 1, "candidateId": CANDIDATE, "outcome": "candidate-bound" if complete else "held", "primary": primary, "cleanup": list(CLEANUP), "endpoint": endpoint, "apiPrefix": "/v1.56", "containerId": CID, "imageId": IMAGE, "repoDigest": DIGEST, "before": before, "after": after, "requests": REQUESTS, "priorFiles": [dict(output.task) for output in FILES], "fileCloseScope": "claim-and-archive-before-binding-write", "rootWallNs": ROOT_WALL, "rootMonotonicNs": ROOT_MONO, "totalMs": 30000, "retry": False, "associationBasis": "retained-canonical-Bun1.4.2-probe-and-same-image-readonly-unaffected-mounts-and-coordinator-continuity", "limitations": ["archive-get-internal-mount-setup-and-event", "no-measured-parent-symlink-inventory", "no-image-layer-hash", "http-eof-not-daemon-unmount-proof", "requires-external-review-and-terminal-protocol"]}
    if complete:
        receipt["measured"] = measured
    try:
        if claim_digest is not None:
            check()
            receipt["claimSha256"] = claim_digest
            binding_digest = persist("binding.json", receipt, 16384, complete)
            check()
    except BaseException as error:
        code = str(error) if type(error) is Hold else "binding-write-failed"
        if primary is None:
            primary = code
        else:
            fault("binding-write-held")
    finally:
        for output in FILES:
            output.close()
    complete = complete and primary is None and not CLEANUP and binding_digest is not None and len(FILES) == 3 and all(output.task["closed"] and output.task["synced"] for output in FILES) and all(output.task["frozen"] for output in FILES[1:])
    result = {"version": 1, "candidateId": CANDIDATE, "outcome": "candidate-bound" if complete else "held", "primary": primary, "cleanup": list(CLEANUP), "requests": REQUESTS, "files": [dict(output.task) for output in FILES], "rootWallNs": ROOT_WALL, "rootMonotonicNs": ROOT_MONO, "totalMs": 30000, "retry": False, "publication": "requires-exact-envelope-terminal-status-and-independent-byte-association-review"}
    if binding_digest is not None:
        result["bindingSha256"] = binding_digest
    return result


def emit(result):
    check()
    data = b"NITRO_LINUX_BUN_ACQUISITION " + encode(result)
    need(len(data) <= 16384, "final-frame-bound")
    attributes = os.fstat(1)
    need(stat.S_ISFIFO(attributes.st_mode) or stat.S_ISSOCK(attributes.st_mode), "output-not-pipe")
    os.set_blocking(1, False)
    selector = selectors.DefaultSelector()
    try:
        selector.register(1, selectors.EVENT_WRITE)
        offset = 0
        while offset < len(data):
            if not selector.select(min(0.05, check())):
                continue
            try:
                count = os.write(1, data[offset:])
            except BlockingIOError:
                continue
            need(count > 0, "output-no-progress")
            offset += count
            check()
    finally:
        try:
            selector.close()
        except BaseException:
            fault("stdout-selector-close-unknown")
    need(not CLEANUP, "output-cleanup-unconfirmed")
    check()


code = 1
try:
    result = run()
    emit(result)
    check()
    if result["outcome"] == "candidate-bound" and not CLEANUP:
        code = 0
except BaseException:
    code = 1
sys.exit(code)
'
then
  nitro_terminal_rc=0
else
  nitro_terminal_rc=$?
fi
builtin printf 'NITRO_TERMINAL_linux_bun_matplan01_v1 {"version":1,"shellPid":%d,"status":%d}\n' "$$" "$nitro_terminal_rc"
builtin exit "$nitro_terminal_rc"
```

## Unchanged output oracle and distinct review gate

The entire returned protocol must be exactly the complete `NITRO_LINUX_BUN_ACQUISITION` JSON line≤16384 followed by the original `NITRO_TERMINAL_linux_bun_matplan01_v1` parent JSON line≤512, final newline, total≤16896, no extra stdout/stderr/command-output bytes. Strict duplicate/nonfinite/schema/ID/root checks, candidate-bound/no primary/no cleanup, exactly three200/EOF/response+socket-closed requests, three actual file sync/close facts, archive/binding freeze, full matching stat/member/payload/raw archive facts, identical selected before/after and actual binding digest, **parent numeric status0**, and no timeout/truncation/cancellation/loss/contradiction remain mandatory. The parent waits for the sole foreground env/Python command and records its actual status immediately; the protocol is not exact30s physical-exit or35s transport timing/universal daemon/reaping proof. Partial/nonzero/late/missing/ambiguous results stay UNKNOWN/quarantined; no output or acquisition retry, alternate CID, cleanup API or killer.

1. Independently review **this exact v2 command**, not the historical held heredoc command. Compare its one shell-decoded `-c` argument with the entire historical Python body, including spacing, backslashes and trailing newline; require the sole inner-apostrophe splice to decode to the original apostrophe. Source comparison is still pending. Any authorized subsequent static syntax/AST or selected-tool-byte authentication is a separate coordinator action, not performed here. P2 is proposed corrected, not self-cleared by this report or by prior approval of the Python body.
2. Bind actual selected-command bytes/tool identities and named exclusive-writer/quarantine ownership through the real independent review/release records, not invented self-approval hashes or a new nonce. The lease must cover B/parents, selected tools, socket and stopped-CID/image/readonly/mount continuity. Ordinary supported image association and disclosed archive mount/event effects must still be accepted.
3. Only a distinct explicit allocation plus exact metadata-read/three-file-write release permits allocation/invocation. Prior conditional plan approval or reviewer finding no other qualifying acquisition defect does **not** grant it. B is not prepared by authoring this Markdown.
4. Actual byte receipt reconciliation/publication and transfer of the measured Linux leaf to the frozen-child image binding remain subsequent independent decisions. No fake Bun SHA or premature `bunExecutableMeasured:true`. Static native copying/index publication, new-memory initialization, CREATE/START/exec/force, boot, real data, SQL/DB, restore and cutover permissions remain false/separate. Preserve consumed control, accepted old metadata/DB/context outputs, and product14's active static checks.

Only this new report was written. No execution, command, GET/Engine action, AST/syntax/hash check, allocation, materialization, mode change, source-product/data/private-config access or nested agent occurred; original report and product lanes remain untouched.
