from pathlib import Path
import subprocess,json
R=Path(__file__).parent
def run(args):subprocess.run(args,check=True)
filters='[0:v]setpts=PTS-STARTPTS[v0];[1:v]split=2[s1][s2];[s1]trim=end=37,setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[s2]trim=start=37:end=61,setpts=PTS-STARTPTS[v3];[v0][v1][v2][v3]concat=n=4:v=1:a=0[v];[3:a]atrim=duration=7,asetpts=PTS-STARTPTS[a0];[1:a]asplit=2[q1][q2];[q1]atrim=end=37,asetpts=PTS-STARTPTS[a1];[4:a]atrim=duration=8,asetpts=PTS-STARTPTS[a2];[q2]atrim=start=37:end=61,asetpts=PTS-STARTPTS[a3];[a0][a1][a2][a3]concat=n=4:v=0:a=1[a]'
run(['ffmpeg','-y','-v','warning','-i',str(R/'intro-silent.mp4'),'-i',str(R.parent/'impact-upgrade/impact.mp4'),'-i',str(R/'widgets-silent.mp4'),'-i',str(R.parent/'impact-intro/intro.wav'),'-i',str(R/'widgets.wav'),'-filter_complex',filters,'-map','[v]','-map','[a]','-r','60','-c:v','libx264','-threads','8','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(R/'impact.mp4')])
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(R/'impact.mp4')]))
v=next(s for s in info['streams'] if s['codec_type']=='video')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='60/1'
assert int(v['nb_frames'])==4560 and abs(float(info['format']['duration'])-76)<.1
(R/'impact-metadata.json').write_text(json.dumps(info,indent=2))
for t,name in [(0,'impact.jpg'),(47,'widgets.jpg'),(75,'ending.jpg')]:
    run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(R/'impact.mp4'),'-frames:v','1',str(R/name)])
run(['ffmpeg','-y','-v','error','-i',str(R/'impact.mp4'),'-vn','-c:a','pcm_s16le',str(R/'score.wav')])
print('Verified: 76s, 1920x1080, 60fps, 4560 frames. Poster is the actual first frame.',flush=True)
