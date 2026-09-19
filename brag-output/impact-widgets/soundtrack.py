from pathlib import Path
import array,wave,json
R=Path(__file__).parent;A=R.parent/'composition/assets';rate=48000;n=rate*8
with wave.open(str(A/'upgrade/bed.wav')) as f:
    f.setpos(16*f.getframerate());data=array.array('h',f.readframes(8*f.getframerate()));nc=f.getnchannels();assert f.getframerate()==rate
left=array.array('f',(data[i*nc]/32768*.85 for i in range(n)));right=array.array('f',left)
cues=[(.08,'pop',.13),(.24,'pop',.12),(.72,'click',.19),(5.15,'toggle',.19),(6.34,'click',.19),(7.72,'swoosh',.14)]
for t,name,gain in cues:
    with wave.open(str(A/f'refined/tiks/{name}.wav')) as f:pcm=array.array('h',f.readframes(f.getnframes()))
    peak=max(abs(x) for x in pcm)
    for i,x in enumerate(pcm):
        j=round(t*rate)+i
        if j>=n:break
        left[j]+=x/peak*gain;right[j]+=x/peak*gain
pcm=array.array('h')
for i in range(n):
    for channel in [left,right]:pcm.append(round(max(-.9,min(.9,channel[i]))*32767))
with wave.open(str(R/'widgets-raw.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(R/'sound-cues.json').write_text(json.dumps(cues,indent=2))
