from pathlib import Path
import array,json,math,subprocess,wave
R=Path(__file__).resolve().parent.parent;O=Path(__file__).resolve().parent
rate=48000;duration=6760/60;n=round(rate*duration)
channels=[array.array('f',[0])*n,array.array('f',[0])*n]
cues=[]
for item in json.loads((R/'impact-paced/sound-cues.json').read_text()):
 item=dict(item);t=item['time']
 if t<7:t*=9/7
 elif t<103+2/3:t+=2
 else:t=105+2/3+(t-(103+2/3))*7/13
 item['time']=t;cues.append(item)
for t in [.1,4.4]:cues.append({'time':t,'sound':'swoosh','gain':.45,'pan':0})
for cue in cues:
 with wave.open(str(R/'composition/assets/refined/tiks'/f"{cue['sound']}.wav")) as f:
  assert f.getframerate()==rate and f.getnchannels()==1 and f.getsampwidth()==2
  pcm=array.array('h',f.readframes(f.getnframes()))
 peak=max(abs(x) for x in pcm)/32768
 target={'click':.21,'hover':.065,'pop':.23,'swoosh':.19,'success':.26,'toggle':.20}[cue['sound']]
 for i,x in enumerate(pcm):
  j=round(cue['time']*rate)+i
  if j>=n:break
  value=x/32768*target/max(peak,.001)*cue['gain']
  channels[0][j]+=value*math.sqrt((1-cue['pan'])/2)
  channels[1][j]+=value*math.sqrt((1+cue['pan'])/2)
pcm=array.array('h')
for i in range(n):
 for c in range(2):pcm.append(round(max(-1,min(1,channels[c][i]))*32767))
with wave.open(str(O/'effects.wav'),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(O/'sound-cues.json').write_text(json.dumps(cues,indent=2))
filters=f'[0:a]atrim=duration={duration},asetpts=PTS-STARTPTS,loudnorm=I=-21:TP=-4:LRA=8,afade=t=in:d=0.18,afade=t=out:st={duration-2}:d=2[music];[1:a]afade=t=out:st={duration-.7}:d=0.7[fx];[music][fx]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-17:TP=-2.5:LRA=7[a]'
subprocess.run(['ffmpeg','-y','-v','warning','-i',str(R/'music-source/go-funk-user.mp3'),'-i',str(O/'effects.wav'),'-filter_complex',filters,'-map','[a]','-ar',str(rate),'-ac','2','-c:a','pcm_s16le',str(O/'score.wav')],check=True)
print('Mixed user-provided Go Funk and',len(cues),'TIKS accents for',duration,'seconds.')
