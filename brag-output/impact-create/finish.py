from pathlib import Path
import subprocess,json
R=Path(__file__).resolve().parent
def run(args):subprocess.run(args,check=True)
segments=[('intro-silent.mp4',0,7),('workshop-silent.mp4',0,7),('integrations-silent.mp4',0,12),('custom-silent.mp4',0,12),('assistant-silent.mp4',0,10),('../impact-upgrade/impact.mp4',8,29),('../impact-widgets/widgets-silent.mp4',0,8),('../impact-upgrade/impact.mp4',42,5),('../impact-ultimate/header-silent.mp4',0,7),('../impact-upgrade/impact.mp4',52,6),('ending-silent.mp4',0,4)]
args=['ffmpeg','-y','-v','warning']
filters=[]
for i,(path,start,duration) in enumerate(segments):
 args+=['-ss',str(start),'-t',str(duration),'-i',str(R/path)]
 filters.append(f'[{i}:v]trim=duration={duration},setpts=PTS-STARTPTS,setsar=1[v{i}]')
args+=['-i',str(R/'score.wav')]
filters.append(''.join(f'[v{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0[v]')
run(args+['-filter_complex',';'.join(filters),'-map','[v]','-map',f'{len(segments)}:a','-t','107','-r','60','-c:v','libx264','-threads','8','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(R/'impact.mp4')])
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(R/'impact.mp4')]))
v=next(s for s in info['streams'] if s['codec_type']=='video')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='60/1'
assert int(v['nb_frames'])==6420 and abs(float(info['format']['duration'])-107)<.1
(R/'impact-metadata.json').write_text(json.dumps(info,indent=2))
for t,name in [(0,'impact.jpg'),(10,'workshop.jpg'),(35,'ideas.jpg'),(20,'integrations.jpg'),(44,'assistant.jpg'),(94,'header.jpg'),(104.5,'ending.jpg')]:
 run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(R/'impact.mp4'),'-frames:v','1',str(R/name)])
print('Verified: 107s, 1920x1080, 60fps, 6420 frames. Poster is the actual first frame.',flush=True)
