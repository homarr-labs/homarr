from pathlib import Path
import subprocess,json
r=Path(__file__).parent
for key,seconds in [('impact',43)]:
 v=r/(key+'.mp4');poster=r/(key+'.jpg');tmp=r/(key+'-poster.mp4')
 subprocess.run(['ffmpeg','-y','-v','error','-ss','1','-i',str(v),'-frames:v','1',str(poster)],check=True)
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(v),'-i',str(poster),'-filter_complex',"[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",'-map','[v]','-map','0:a?','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(tmp)],check=True)
 tmp.replace(v)
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(v)]))
 stream=next(s for s in info['streams'] if s['codec_type']=='video')
 assert stream['width']==1920 and stream['height']==1080 and int(stream['nb_frames'])==seconds*30
 assert abs(float(info['format']['duration'])-seconds)<.1
 (r/(key+'-metadata.json')).write_text(json.dumps(info,indent=2))
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(v),'-vf','fps=1/4,scale=480:-1,tile=4x3','-frames:v','1',str(r/(key+'-review.jpg'))],check=True)
 print(key,seconds,'seconds verified',flush=True)
