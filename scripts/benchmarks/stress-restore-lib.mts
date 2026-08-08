/**
 * Pure helpers for the dashboard stress benchmark (`stress-restore.mts`).
 *
 * Kept free of Docker/Playwright so the measurement maths and the container
 * snapshot script stay unit-testable.
 */

export type ProcessSample = {
  command: string;
  parentPid: number;
  pid: number;
  pssBytes: number;
  rssBytes: number;
};

export type StressCheckpoint = {
  name: string;
  capturedAt: string;
  elapsedMs: number;
  container: {
    currentBytes: number;
    peakBytes: number | null;
    anonymousBytes: number;
    fileBytes: number;
  };
  processes: ProcessSample[];
  redis: { usedMemoryBytes: number; peakMemoryBytes: number } | null;
};

/**
 * Emitted inside the container and parsed by `parseStressSnapshot`.
 *
 * cgroup v2 `memory.current` is the number that matters for a container memory
 * limit (it is what the OOM killer compares against), so it is the headline
 * metric rather than the sum of process RSS, which double-counts shared pages.
 */
export const stressMemoryScript = String.raw`
echo "memory_current=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0)"
memory_peak="$(cat /sys/fs/cgroup/memory.peak 2>/dev/null || true)"
case "$memory_peak" in ''|'max') ;; *) echo "memory_peak=$memory_peak" ;; esac
awk '/^anon / { print "cgroup_anon=" $2 } /^file / { print "cgroup_file=" $2 }' /sys/fs/cgroup/memory.stat 2>/dev/null
for status_file in /proc/[0-9]*/status; do
  [ -r "$status_file" ] || continue
  process_dir="$(dirname "$status_file")"
  process_values="$(awk '/^Name:/ { name=$2 } /^Pid:/ { pid=$2 } /^PPid:/ { ppid=$2 } /^VmRSS:/ { rss=$2 } END { if (rss == "") rss=0; print pid "|" ppid "|" rss "|" name }' "$status_file" 2>/dev/null)"
  process_pss="$(awk '/^Pss:/ { print $2 }' "$process_dir/smaps_rollup" 2>/dev/null || echo 0)"
  [ -n "$process_pss" ] || process_pss=0
  [ -n "$process_values" ] && echo "process=$process_values|$process_pss"
done
redis_info="$(redis-cli INFO memory 2>/dev/null | tr -d '\r' || true)"
redis_used="$(printf '%s\n' "$redis_info" | awk -F: '/^used_memory:/ { print $2 }')"
redis_peak="$(printf '%s\n' "$redis_info" | awk -F: '/^used_memory_peak:/ { print $2 }')"
if [ -n "$redis_used" ] && [ -n "$redis_peak" ]; then
  echo "redis_used_memory=$redis_used"
  echo "redis_used_memory_peak=$redis_peak"
fi
`;

const readNumericLine = (input: string, key: string) => {
  const match = new RegExp(`^${key}[=:]\\s*(\\d+)`, "m").exec(input);
  return match?.[1] === undefined ? null : Number(match[1]);
};

export const parseStressSnapshot = (name: string, elapsedMs: number, output: string): StressCheckpoint => {
  const currentBytes = readNumericLine(output, "memory_current");
  if (currentBytes === null) throw new Error(`Snapshot "${name}" is missing memory_current`);

  const processes = output
    .split("\n")
    .filter((line) => line.startsWith("process="))
    .flatMap<ProcessSample>((line) => {
      const [pid, parentPid, rssKiB, command, pssKiB] = line.slice("process=".length).split("|");
      if (!pid || !parentPid || rssKiB === undefined || !command) return [];
      return [
        {
          pid: Number(pid),
          parentPid: Number(parentPid),
          rssBytes: Number(rssKiB) * 1024,
          pssBytes: Number(pssKiB ?? 0) * 1024,
          command,
        },
      ];
    });

  const redisUsed = readNumericLine(output, "redis_used_memory");
  const redisPeak = readNumericLine(output, "redis_used_memory_peak");

  return {
    name,
    capturedAt: new Date().toISOString(),
    elapsedMs,
    container: {
      currentBytes,
      peakBytes: readNumericLine(output, "memory_peak"),
      anonymousBytes: readNumericLine(output, "cgroup_anon") ?? 0,
      fileBytes: readNumericLine(output, "cgroup_file") ?? 0,
    },
    processes,
    redis: redisUsed === null || redisPeak === null ? null : { usedMemoryBytes: redisUsed, peakMemoryBytes: redisPeak },
  };
};

/** Node processes only — `next-server` plus any child it forks. */
export const getNodeProcesses = (checkpoint: StressCheckpoint) =>
  checkpoint.processes.filter((process) => /node|next/i.test(process.command));

export const sumNodeRssBytes = (checkpoint: StressCheckpoint) =>
  getNodeProcesses(checkpoint).reduce((total, process) => total + process.rssBytes, 0);

/** Largest single node process — the Next.js server in a normal container. */
export const getPrimaryNodeRssBytes = (checkpoint: StressCheckpoint) =>
  getNodeProcesses(checkpoint).reduce((max, process) => Math.max(max, process.rssBytes), 0);

export const toMiB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

/**
 * Least-squares slope over (elapsedMs, bytes), reported per hour. A large
 * positive slope across the idle soak is the signature of a retention leak
 * rather than of ordinary warm-up.
 */
export const getGrowthBytesPerHour = (samples: { elapsedMs: number; bytes: number }[]) => {
  if (samples.length < 2) return null;
  const n = samples.length;
  const meanX = samples.reduce((sum, s) => sum + s.elapsedMs, 0) / n;
  const meanY = samples.reduce((sum, s) => sum + s.bytes, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const sample of samples) {
    const dx = sample.elapsedMs - meanX;
    numerator += dx * (sample.bytes - meanY);
    denominator += dx * dx;
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 3_600_000);
};

export const summarizeStress = (checkpoints: StressCheckpoint[], soakPrefix = "soak") => {
  const containerMiBByName = (name: string) => {
    const checkpoint = checkpoints.find((candidate) => candidate.name === name);
    return checkpoint ? toMiB(checkpoint.container.currentBytes) : null;
  };
  // Anonymous memory is the number to compare across runs: memory.current also
  // counts reclaimable page cache, which swings tens of MiB with unrelated disk I/O.
  const anonMiBByName = (name: string) => {
    const checkpoint = checkpoints.find((candidate) => candidate.name === name);
    return checkpoint ? toMiB(checkpoint.container.anonymousBytes) : null;
  };
  const soakSamples = checkpoints
    .filter((checkpoint) => checkpoint.name.startsWith(soakPrefix))
    .map((checkpoint) => ({ elapsedMs: checkpoint.elapsedMs, bytes: checkpoint.container.anonymousBytes }));

  const peak = checkpoints.reduce(
    (max, checkpoint) => Math.max(max, checkpoint.container.peakBytes ?? checkpoint.container.currentBytes),
    0,
  );

  return {
    checkpointCount: checkpoints.length,
    containerMiB: Object.fromEntries(
      checkpoints.map((checkpoint) => [checkpoint.name, toMiB(checkpoint.container.currentBytes)]),
    ),
    nodeRssMiB: Object.fromEntries(
      checkpoints.map((checkpoint) => [checkpoint.name, toMiB(sumNodeRssBytes(checkpoint))]),
    ),
    anonMiB: Object.fromEntries(
      checkpoints.map((checkpoint) => [checkpoint.name, toMiB(checkpoint.container.anonymousBytes)]),
    ),
    // Primary comparison metric: anonymous (non-reclaimable) memory.
    headline: {
      bootIdleAnonMiB: anonMiBByName("01-boot-idle"),
      boardLoadedAnonMiB: anonMiBByName("04-board-loaded"),
      afterStressAnonMiB: anonMiBByName("05-after-stress"),
      bootIdleMiB: containerMiBByName("01-boot-idle"),
      boardLoadedMiB: containerMiBByName("04-board-loaded"),
      afterStressMiB: containerMiBByName("05-after-stress"),
      peakMiB: toMiB(peak),
      soakAnonGrowthMiBPerHour: (() => {
        const slope = getGrowthBytesPerHour(soakSamples);
        return slope === null ? null : toMiB(slope);
      })(),
    },
    redisPeakMiB: (() => {
      const peaks = checkpoints.flatMap((c) => (c.redis ? [c.redis.peakMemoryBytes] : []));
      return peaks.length === 0 ? null : toMiB(Math.max(...peaks));
    })(),
  };
};
