import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E

image = E.load_driver()
py = P.Driver(image, log=False)
py.init()
py.set_tune(1)
py.start()
py.update()
m = py.m
print('B68=%04X B6A=%02X B6C=%04X' % (m[0x0B68] | (m[0x0B69] << 8), m[0x0B6A], m[0x0B6C] | (m[0x0B6D] << 8)))
for k in range(4):
    di = 0x05AC + k * 0x14
    print('ch%d: sect=%04X stream=%04X note=%02X dur=%02X pitch=%02X flag=%d voice=%02X'
          % (k, m[di+10] | (m[di+11] << 8), m[di+12] | (m[di+13] << 8),
             m[di], m[di+17], m[di+18], m[di+16], m[di+4]))
