"""Original synthesized electronic bed and editorial cues; no third-party music."""
import math,random,wave,array
from pathlib import Path
rate=48000;duration=53;n=rate*duration;samples=array.array('f',[0])*n;rng=random.Random(90218)
def tone(start,length,freq,amp,kind='pluck'):
 offset=int(start*rate)
 for i in range(int(length*rate)):
  t=i/rate;env=min(1,t/.008)*math.exp(-t*8)
  phase=2*math.pi*freq*t
  v=math.sin(phase)+.15*math.sin(phase*2)
  if kind=='kick':v=math.sin(2*math.pi*(46*t+6*(1-math.exp(-t*30))));env=math.exp(-t*13)
  if kind=='bass':env=min(1,t/.008)*math.exp(-t*4)
  if offset+i<n:samples[offset+i]+=amp*env*v
for beat in range(106):
 t=beat*.5;bar=beat//8;root=[110,87.307,130.813,98][bar%4]
 tone(t,.32,50,.18,'kick')
 if beat%2==1:
  for j in range(5000):
   if int(t*rate)+j<n:samples[int(t*rate)+j]+=(rng.random()*2-1)*.032*math.exp(-j/1200)
 tone(t,.44,root,.07,'bass')
 for step in range(2):
  f=root*[4,6,5,8][(beat*2+step)%4];tone(t+step*.25,.22,f,.022)
# Soft swells underneath the frame wipes.
for start in [7.7,15.7,23.7,28.7,33.7,38.7,43.7,49.7]:
 prev=0
 for j in range(int(.5*rate)):
  prev=.92*prev+.08*(rng.random()*2-1);env=math.sin(math.pi*j/(.5*rate))**2
  samples[int(start*rate)+j]+=.22*prev*env
# Physical placement / resize cues, quieter than scene transitions.
for start in [.55,3.2,8.8,10.8,12.7,15.0,16.8,20.7,25.5,30.6,35.5,40.2]:
 tone(start,.15,170,.10)
# Closing two-note accent.
tone(50.2,.6,523.25,.08);tone(50.42,.6,659.25,.065)
peak=max(abs(x) for x in samples);pcm=array.array('h')
for i,x in enumerate(samples):
 t=i/rate;fade=min(1,t/.25,(duration-t)/1.3);v=x*.72/max(peak,.75)*max(0,fade)
 pcm.append(int(max(-1,min(1,v))*32767))
out=Path(__file__).parent.parent/'composition/assets/showcases/bed-raw.wav'
with wave.open(str(out),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
print(out)
