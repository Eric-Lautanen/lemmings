import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E
py = P.Driver(E.load_driver(), log=False)
py.init()
py.set_tune(2)
py.start()
seq = []
for i in range(30):
    py.update()
    seq.append(py.m[0x0B6B])
print('B6B:', ' '.join('%02X' % v for v in seq))
