from pathlib import Path
import subprocess
r=Path(__file__).parent.parent
out=r/'composition/assets/upgrade';out.mkdir(exist_ok=True)
for name,source,start,length,filters in [
 ('move-resize','layout-move-resize',0,4.5,'crop=2560:1020:20:322,scale=1770:-2,fps=60'),
 ('multiselect','layout-multiselect',.2,5.5,'crop=3160:1280:20:312,scale=1770:716,fps=60'),
 ('containers','layout-containers',0,6,'crop=3160:1280:20:312,scale=1770:716,fps=60'),
]:
 subprocess.run(['ffmpeg','-y','-v','error','-ss',str(start),'-i',str(r/'capture-evidence'/f'{source}-source.mp4'),'-t',str(length),'-vf',filters,'-c:v','libx264','-crf','17','-preset','fast','-an','-movflags','+faststart',str(out/f'{name}.mp4')],check=True)
