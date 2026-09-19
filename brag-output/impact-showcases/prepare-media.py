"""Focused crops from real continuous browser recordings; no interpolation."""
from pathlib import Path
import subprocess
r=Path(__file__).parent.parent
assets=r/'composition/assets/showcases'
assets.mkdir(exist_ok=True)
for name,source,duration,filters in [
 ('sidebar-settings','sidebar-settings-hi-source',3,'crop=1600:700:1220:750,fps=60'),
 ('sidebar-scroll','sidebar-scroll-60-source',5,'crop=1580:640:10:156,fps=60'),
 ('board-switcher','board-switcher-hi-source',6,'crop=3160:1280:20:192,scale=1920:-2,fps=60'),
 ('board-switcher-focus','board-switcher-hi-source',6,'crop=1080:520:1076:472,fps=60'),
]:
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(r/'capture-evidence'/f'{source}.mp4'),'-t',str(duration),'-vf',filters,'-c:v','libx264','-crf','17','-preset','fast','-an','-movflags','+faststart',str(assets/f'{name}.mp4')],check=True)
