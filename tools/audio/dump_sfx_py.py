import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E

image = E.load_driver()
out = open(r'C:\github\Lemmings\sfx_py.txt', 'w')
for n in range(0, 19):
    py = P.Driver(image, log=True)
    py.init()
    py.set_tune(1)
    py.start()
    out.write('=== sfx%d ===\n' % n)
    for i in range(400):
        py.update()
        if i == 20:
            py.set_tempo(n)
        for reg, val in py.events:
            out.write('%02X %02X\n' % (reg, val))
        py.events[:] = []
out.close()
print('done')