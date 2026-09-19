from pathlib import Path
import subprocess,json
R=Path(__file__).resolve().parent
segments=[('intro-silent.mp4',0,7,1),('../impact-workshop/impact.mp4',7,29,1),('assistant-silent.mp4',0,10,1),('../impact-workshop/impact.mp4',46,10,1.5),('../impact-workshop/impact.mp4',56,64,1)]
args=['ffmpeg','-y','-v','warning'];filters=[]
for i,(path,start,duration,speed) in enumerate(segments):
 args+=['-ss',str(start),'-t',str(duration),'-i',str(R/path)]
 filters.append(f'[{i}:v]trim=duration={duration},setpts=(PTS-STARTPTS)/{speed},fps=60,setsar=1[v{i}]')
args+=['-i',str(R/'score.wav')]
filters.append(''.join(f'[v{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0[v]')
subprocess.run(args+['-filter_complex',';'.join(filters),'-map','[v]','-map',f'{len(segments)}:a','-t',str(7000/60),'-r','60','-c:v','libx264','-threads','8','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(R/'impact.mp4')],check=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(R/'impact.mp4')]))
v=next(s for s in info['streams'] if s['codec_type']=='video')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='60/1'
assert int(v['nb_frames'])==7000 and abs(float(info['format']['duration'])-7000/60)<.05
(R/'impact-metadata.json').write_text(json.dumps(info,indent=2))
for t,name in [(0,'impact.jpg'),(42,'assistant.jpg'),(48,'drag.jpg'),(51,'selection.jpg'),(108.67,'ending.jpg')]:
 subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(R/'impact.mp4'),'-frames:v','1',str(R/name)],check=True)
print('Verified: 116.667s, 1920x1080, 60fps, 7000 frames.',flush=True)
