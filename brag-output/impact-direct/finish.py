from pathlib import Path
import subprocess,json
R=Path(__file__).resolve().parent
segments=[('intro-silent.mp4',0,9),('workshop-silent.mp4',0,7),('integrations-silent.mp4',0,10),('custom-silent.mp4',0,12),('assistant-silent.mp4',0,10),('../impact-paced/impact.mp4',46,1540/60),('../impact-workshop/widgets-silent.mp4',0,8),('statistics-silent.mp4',0,6),('../impact-paced/impact.mp4',5140/60,5),('header-silent.mp4',0,7),('../impact-paced/impact.mp4',5860/60,6),('ending-silent.mp4',0,7)]
assert abs(sum(d for _,_,d in segments)-6760/60)<.001
args=['ffmpeg','-y','-v','warning'];filters=[]
for i,(path,start,duration) in enumerate(segments):
 args+=['-ss',str(start),'-t',str(duration),'-i',str(R/path)]
 filters.append(f'[{i}:v]trim=duration={duration},setpts=PTS-STARTPTS,fps=60,setsar=1[v{i}]')
args+=['-i',str(R/'score.wav')]
filters.append(''.join(f'[v{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0[v]')
subprocess.run(args+['-filter_complex',';'.join(filters),'-map','[v]','-map',f'{len(segments)}:a','-t',str(6760/60),'-r','60','-c:v','libx264','-threads','8','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(R/'impact.mp4')],check=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(R/'impact.mp4')]))
v=next(s for s in info['streams'] if s['codec_type']=='video')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='60/1'
assert int(v['nb_frames'])==6760 and abs(float(info['format']['duration'])-6760/60)<.05
(R/'impact-metadata.json').write_text(json.dumps(info,indent=2))
for t,name in [(0,'impact.jpg'),(1.5,'intro-sweep.jpg'),(7.2,'intro-clear.jpg'),(10,'workshop.jpg'),(27,'custom.jpg'),(34,'concepts.jpg'),(42,'assistant.jpg'),(109,'ending.jpg')]:
 subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(R/'impact.mp4'),'-frames:v','1',str(R/name)],check=True)
print('Verified: 112.667s, 1920x1080, 60fps, 6760 frames.',flush=True)
