import wave,sys
import numpy as np
w=wave.open(sys.argv[1]); sr=w.getframerate(); ch=w.getnchannels()
a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).reshape(-1,ch)[:,0].astype(float)
step=float(sys.argv[2]) if len(sys.argv)>2 else 0.5
for i in range(int(len(a)/sr/step)):
    seg=a[int(i*step*sr):int((i+1)*step*sr)]; print(f"{i*step:.1f}:{int(seg.std())}", end=' ')
