"""Mix an available Go Funk audio file under the existing 107-second film."""
from pathlib import Path
import array, json, math, subprocess, sys, wave
R = Path(__file__).resolve().parent.parent
O = R / 'impact-ultimate'
source = Path(sys.argv[1]).resolve()
if not source.is_file():
    raise SystemExit('Pass the downloaded Go Funk audio file as the first argument.')
rate = 48000
duration = 107
frames = rate * duration
channels = [array.array('f', [0]) * frames, array.array('f', [0]) * frames]
for cue in json.loads((O / 'sound-cues.json').read_text()):
    with wave.open(str(R / 'composition/assets/refined/tiks' / (cue['sound'] + '.wav'))) as f:
        assert f.getframerate() == rate and f.getnchannels() == 1 and f.getsampwidth() == 2
        pcm = array.array('h', f.readframes(f.getnframes()))
    peak = max(abs(x) for x in pcm) / 32768
    target = {'click': .21, 'hover': .065, 'pop': .23, 'swoosh': .19, 'success': .26, 'toggle': .20}[cue['sound']]
    for i, sample in enumerate(pcm):
        j = round(cue['time'] * rate) + i
        if j >= frames:
            break
        value = sample / 32768 * target / max(peak, .001) * cue['gain']
        channels[0][j] += value * math.sqrt((1 - cue['pan']) / 2)
        channels[1][j] += value * math.sqrt((1 + cue['pan']) / 2)
pcm = array.array('h')
for i in range(frames):
    for c in range(2):
        pcm.append(round(max(-1, min(1, channels[c][i])) * 32767))
fx = R / 'music-source/effects.wav'
with wave.open(str(fx), 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(rate)
    f.writeframes(pcm.tobytes())
score = O / 'go-funk-score.wav'
filters = '[0:a]atrim=duration=107,asetpts=PTS-STARTPTS,loudnorm=I=-20:TP=-3:LRA=8,afade=t=in:d=0.15,afade=t=out:st=104.4:d=2.6[music];[1:a]afade=t=out:st=106.4:d=0.6[fx];[music][fx]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-17:TP=-2.5:LRA=7[a]'
subprocess.run(['ffmpeg', '-y', '-v', 'warning', '-stream_loop', '-1', '-i', str(source), '-i', str(fx), '-filter_complex', filters, '-map', '[a]', '-ar', str(rate), '-ac', '2', '-c:a', 'pcm_s16le', str(score)], check=True)
output = O / 'impact-go-funk.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'warning', '-i', str(O / 'impact.mp4'), '-i', str(score), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', str(duration), '-movflags', '+faststart', str(output)], check=True)
print(output)
