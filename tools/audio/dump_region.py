import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E

image = E.load_driver()
py = P.Driver(image, log=False)
m = py.m

def w(a):
    return m[a] | (m[a + 1] << 8)

print('list: ', ' '.join('%04X' % w(0x0B6C + 2 * i) for i in range(4)))
hdr = w(0x0B6E)
print('hdr1 = %04X' % hdr)
for a in range(hdr, hdr + 0x20, 2):
    print('  %04X: %04X  %02X %02X' % (a, w(a), m[a], m[a + 1]))
print('ch ptrs at hdr+6..:', ' '.join('%04X' % w(hdr + 6 + 2 * i) for i in range(4)))
print('stream candidates:')
for a in (0x0BA8, 0x0BC2, 0x0BDC, 0x0BF6, 0x0C14, 0x0C48, 0x0D5A, 0x0DB8):
    print('  %04X: %s' % (a, ' '.join('%02X' % m[a + i] for i in range(10))))
