"""Drive the recording display with real X11 mouse and keyboard events."""
import ctypes,json,sys
x=ctypes.CDLL('libX11.so.6');t=ctypes.CDLL('libXtst.so.6')
x.XOpenDisplay.argtypes=[ctypes.c_char_p];x.XOpenDisplay.restype=ctypes.c_void_p
d=x.XOpenDisplay(b':97');assert d
x.XFlush.argtypes=[ctypes.c_void_p]
x.XStringToKeysym.argtypes=[ctypes.c_char_p];x.XStringToKeysym.restype=ctypes.c_ulong
x.XKeysymToKeycode.argtypes=[ctypes.c_void_p,ctypes.c_ulong];x.XKeysymToKeycode.restype=ctypes.c_uint
t.XTestFakeMotionEvent.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_ulong]
t.XTestFakeButtonEvent.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_int,ctypes.c_ulong]
t.XTestFakeKeyEvent.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_int,ctypes.c_ulong]
for line in sys.stdin:
 a=json.loads(line)
 if a['type']=='move':t.XTestFakeMotionEvent(d,-1,round((a['x']+10)*2),round((a['y']+97)*2),0)
 if a['type']=='button':t.XTestFakeButtonEvent(d,1,int(a['down']),0)
 if a['type']=='key':t.XTestFakeKeyEvent(d,x.XKeysymToKeycode(d,x.XStringToKeysym(a['key'].encode())),int(a['down']),0)
 x.XFlush(d)
 print('ok',flush=True)
