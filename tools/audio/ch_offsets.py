import sys
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E
py = P.Driver(E.load_driver())
for k in range(9):
    base = 0x05AC + k * 0x14
    print('ch%d: dl=%02X dh=%02X self=%02X' % (k, py.m[base + 5], py.m[base + 6], py.m[base + 7]))
