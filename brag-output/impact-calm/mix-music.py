from pathlib import Path
import array
import json
import math
import subprocess
import wave

R = Path(__file__).resolve().parent.parent
O = Path(__file__).resolve().parent
rate = 48000
duration = 6760 / 60
n = round(rate * duration)
channels = [array.array("f", [0]) * n, array.array("f", [0]) * n]
cues = []

for item in json.loads((R / "impact-paced/sound-cues.json").read_text()):
    item = dict(item)
    time = item["time"]
    if time < 7:
        time *= 9 / 7
    elif time < 103 + 2 / 3:
        time += 2
    else:
        time = 105 + 2 / 3 + (time - (103 + 2 / 3)) * 7 / 13
    item["time"] = time
    if 6 <= time < 105.2:
        cues.append(item)

ending_start = 105 + 2 / 3
cues.extend(
    [
        {"time": 0.1, "sound": "swoosh", "gain": 0.32, "pan": 0},
        {"time": 2.5, "sound": "swoosh", "gain": 0.5, "pan": 0},
        {"time": ending_start + 0.15, "sound": "swoosh", "gain": 0.34, "pan": 0},
        {"time": ending_start + 1.15, "sound": "pop", "gain": 1.25, "pan": -0.8},
        {"time": ending_start + 1.15, "sound": "pop", "gain": 1.25, "pan": 0.8},
    ]
)

for cue in cues:
    with wave.open(str(R / "composition/assets/refined/tiks" / f"{cue['sound']}.wav")) as source:
        assert source.getframerate() == rate
        assert source.getnchannels() == 1
        assert source.getsampwidth() == 2
        pcm = array.array("h", source.readframes(source.getnframes()))
    peak = max(abs(value) for value in pcm) / 32768
    target = {
        "click": 0.21,
        "hover": 0.065,
        "pop": 0.23,
        "swoosh": 0.19,
        "success": 0.26,
        "toggle": 0.20,
    }[cue["sound"]]
    for index, sample in enumerate(pcm):
        output_index = round(cue["time"] * rate) + index
        if output_index >= n:
            break
        value = sample / 32768 * target / max(peak, 0.001) * cue["gain"]
        channels[0][output_index] += value * math.sqrt((1 - cue["pan"]) / 2)
        channels[1][output_index] += value * math.sqrt((1 + cue["pan"]) / 2)

pcm = array.array("h")
for index in range(n):
    for channel in range(2):
        pcm.append(round(max(-1, min(1, channels[channel][index])) * 32767))

with wave.open(str(O / "effects.wav"), "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(pcm.tobytes())

(O / "sound-cues.json").write_text(json.dumps(cues, indent=2))
filters = (
    f"[0:a]atrim=duration={duration},asetpts=PTS-STARTPTS,loudnorm=I=-21:TP=-4:LRA=8,"
    f"afade=t=in:d=0.18,afade=t=out:st={duration - 2}:d=2[music];"
    f"[1:a]afade=t=out:st={duration - 0.7}:d=0.7[fx];"
    "[music][fx]amix=inputs=2:duration=first:normalize=0,"
    "loudnorm=I=-17:TP=-2.5:LRA=7[a]"
)
subprocess.run(
    [
        "ffmpeg",
        "-y",
        "-v",
        "warning",
        "-i",
        str(R / "music-source/go-funk-user.mp3"),
        "-i",
        str(O / "effects.wav"),
        "-filter_complex",
        filters,
        "-map",
        "[a]",
        "-ar",
        str(rate),
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        str(O / "score.wav"),
    ],
    check=True,
)
print(f"Mixed music with {len(cues)} TIKS accents for {duration:.3f} seconds.")
