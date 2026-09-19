from pathlib import Path
import wave,array,math,json
r=Path(__file__).parent.parent/'composition/assets';rate=48000;duration=43;n=rate*duration
channels=[array.array('f',[0])*n,array.array('f',[0])*n]
with wave.open(str(r/'explained/score.wav')) as f:
 assert f.getsampwidth()==2
 old=array.array('h',f.readframes(f.getnframes()));nc=f.getnchannels();sr=f.getframerate()
 for i in range(n):
  si=min(int(i*sr/rate),len(old)//nc-1)
  for c in range(2):channels[c][i]=old[si*nc+min(c,nc-1)]/32768*.70
cues=[]
def cue(t,name,gain=.8,pan=0):
 cues.append({'time':t,'sound':name,'gain':gain,'pan':pan})
 with wave.open(str(r/f'refined/tiks/{name}.wav')) as f:pcm=array.array('h',f.readframes(f.getnframes()))
 peak=max(abs(x) for x in pcm)/32768;target={'click':.21,'hover':.065,'pop':.23,'swoosh':.19,'success':.26,'toggle':.20}[name]
 for i,x in enumerate(pcm):
  j=round(t*rate)+i
  if j>=n:break
  v=x/32768*target/max(peak,.001)*gain
  channels[0][j]+=v*math.sqrt((1-pan)/2);channels[1][j]+=v*math.sqrt((1+pan)/2)
for t in [7.85,15.85,19.85,24.85,29.85,34.85,39.85]:cue(t,'swoosh',1)
for t in [.35,3.12,16.45,25.35,30.45,35.4]:cue(t,'pop',.8)
cue(26.1,'click',.8,.2);cue(27.25,'pop',.8,-.5);cue(27.8,'toggle',.6,.2)
# Times follow the 1.12x recording's real pickup/drop and resize boundaries.
for t in [8.55,10.63,12.22,13.69]:cue(t,'click',1,-.25)
for t in [9.97,11.6,13.36,15.04]:cue(t,'pop',.75,.25)
cue(20.95,'click',1,-.3);cue(21.48,'toggle',.8,.1);cue(24.4,'click',.7,-.3)
cue(40.08,'pop',1.3,-.7);cue(40.19,'pop',1.1,.7);cue(40.45,'success',1)
for i,t in enumerate([40.33,40.55,40.78,41.01,41.24,41.49,41.76]):cue(t,'hover',.8,math.sin(i*2))
peak=max(max(abs(x) for x in c) for c in channels);pcm=array.array('h')
for i in range(n):
 fade=min(1,(duration-i/rate)/.6)
 for c in range(2):pcm.append(int(channels[c][i]*fade*min(1,.85/peak)*32767))
with wave.open(str(r/'dashboard-cut/score-raw.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(Path(__file__).parent/'sound-cues.json').write_text(json.dumps(cues,indent=2))
print('Mixed',len(cues),'TIKS cues; source peak',peak)
