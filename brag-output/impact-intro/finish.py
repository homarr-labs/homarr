from pathlib import Path
import subprocess,json

R=Path(__file__).parent
def run(args):subprocess.run(args,check=True)
run(['ffmpeg','-y','-v','warning','-i',str(R/'intro-silent.mp4'),'-i',str(R.parent/'impact-upgrade/impact.mp4'),'-i',str(R/'intro.wav'),'-filter_complex','[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v];[2:a]atrim=duration=7,asetpts=PTS-STARTPTS[a0];[1:a]atrim=duration=61,asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[a]','-map','[v]','-map','[a]','-r','60','-c:v','libx264','-threads','8','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(R/'impact.mp4')])
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(R/'impact.mp4')]))
v=next(s for s in info['streams'] if s['codec_type']=='video')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='60/1'
assert int(v['nb_frames'])==4080
assert abs(float(info['format']['duration'])-68)<.1
(R/'impact-metadata.json').write_text(json.dumps(info,indent=2))
run(['ffmpeg','-y','-v','error','-ss','2','-i',str(R/'impact.mp4'),'-frames:v','1',str(R/'impact.jpg')])
run(['ffmpeg','-y','-v','error','-i',str(R/'impact.mp4'),'-vn','-c:a','pcm_s16le',str(R/'score.wav')])
run(['ffmpeg','-y','-v','error','-i',str(R/'intro-silent.mp4'),'-vf','fps=1,scale=640:-1,tile=4x2','-frames:v','1',str(R/'intro-contact.jpg')])
print('Verified: 68 seconds, 1920x1080, 60fps, 4080 frames',flush=True)
