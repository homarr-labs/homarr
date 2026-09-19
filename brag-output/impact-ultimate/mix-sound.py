from pathlib import Path
import wave,array,math,json
r=Path(__file__).parent.parent/'composition/assets';rate=48000;duration=107;n=rate*duration
channels=[array.array('f',[0])*n,array.array('f',[0])*n]
with wave.open(str(r/'ultimate/bed.wav')) as f:
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
old=json.loads((Path(__file__).parent.parent/'impact-upgrade/sound-cues.json').read_text())
for item in old:
 t=item['time']
 if t<8:t+=14
 elif t<37:t+=18
 elif t<42:t+=40
 elif t<52:t+=43
 else:t+=45
 cue(t,item['sound'],item['gain'],item['pan'])
for item in json.loads((Path(__file__).parent.parent/'impact-widgets/sound-cues.json').read_text()):
 cue(55+item[0],item[1],.8)
for t in [0.1,7.1,14.1,20.8,63.1,69.1,77.1,90.1,103.1,103.6,104.2,104.8,105.5,106.1]:cue(t,'pop',.85)
for t in [6.7,13.7,25.7,62.7,68.7,76.7,84.7,89.7,96.7,102.7]:cue(t,'swoosh',.8)
cue(103.45,'success',.9)
peak=max(max(abs(x) for x in c) for c in channels);pcm=array.array('h')
for i in range(n):
 fade=min(1,(duration-i/rate)/.6)
 for c in range(2):pcm.append(int(channels[c][i]*fade*min(1,.85/peak)*32767))
with wave.open(str(r/'ultimate/score-raw.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(Path(__file__).parent/'sound-cues.json').write_text(json.dumps(cues,indent=2))
print('Mixed',len(cues),'TIKS cues; source peak',peak)
