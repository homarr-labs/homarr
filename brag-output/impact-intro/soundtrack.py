"""Deterministic 120 BPM intro sting, mixed with existing licensed TIKS assets."""
from pathlib import Path
import array, math, random, wave, json

R=Path(__file__).parent
A=R.parent/'composition/assets'
rate=48000
duration=7
n=rate*duration
left=array.array('f',[0])*n
right=array.array('f',[0])*n
rng=random.Random(220918)
def tone(start,length,freq,gain,kind='pluck'):
    offset=round(start*rate)
    for i in range(round(length*rate)):
        j=offset+i
        if j>=n: break
        t=i/rate
        envelope=min(1,t/.006)*math.exp(-t*7)
        value=math.sin(2*math.pi*freq*t)+.18*math.sin(4*math.pi*freq*t)
        if kind=='kick':
            value=math.sin(2*math.pi*(46*t+6*(1-math.exp(-t*30))))
            envelope=math.exp(-t*13)
        value*=envelope*gain
        left[j]+=value
        right[j]+=value
for beat in range(14):
    t=beat*.5
    root=[110,110,130.813,98][min(3,beat//4)]
    tone(t,.35,50,.23,'kick')
    tone(t,.4,root,.11)
    for step in range(2):
        tone(t+step*.25,.24,root*[4,6,5,8][(beat*2+step)%4],.043)
    if beat%2:
        for i in range(5000):
            j=round(t*rate)+i
            if j<n:
                value=(rng.random()*2-1)*.038*math.exp(-i/1100)
                left[j]+=value;right[j]+=value
# Short accelerating ticks and a filtered upward swell into the first feature.
for t in [5.5,5.75,6,6.25,6.375,6.5,6.625]:tone(t,.07,880,.028)
prev=0
for i in range(round(1.3*rate)):
    j=round(5.7*rate)+i
    if j>=n:break
    prev=.85*prev+.15*(rng.random()*2-1)
    gain=(i/(1.3*rate))**1.6*.28
    left[j]+=prev*gain;right[j]+=prev*gain
cues=[(.02,'swoosh',.11),(.18,'click',.1),(.38,'pop',.22),(.8,'success',.12),(1.5,'hover',.05),(2.5,'hover',.05),(3.5,'hover',.05),(4.5,'hover',.05),(6.7,'swoosh',.20)]
for start,name,gain in cues:
    with wave.open(str(A/f'refined/tiks/{name}.wav')) as f:
        assert f.getframerate()==rate and f.getsampwidth()==2
        data=array.array('h',f.readframes(f.getnframes()))
    peak=max(abs(v) for v in data)
    for i,value in enumerate(data):
        j=round(start*rate)+i
        if j>=n:break
        value=value/peak*gain
        left[j]+=value;right[j]+=value
pcm=array.array('h')
for i in range(n):
    fade=min(1,i/240,(n-i)/240)
    for channel in [left,right]:pcm.append(round(max(-.9,min(.9,channel[i]*fade))*32767))
with wave.open(str(R/'intro-raw.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(R/'intro-sound-cues.json').write_text(json.dumps(cues,indent=2))
