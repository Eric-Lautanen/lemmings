import sys
sys.path.insert(0, 'tools/audio')
sys.path.insert(0, 'tools')
import adlib_player as P
import emu8086 as E

image = E.load_driver()
out = open('tools/audio/events_long_py.txt', 'w')

def run(label, setup, updates):
    py = P.Driver(image, log=True)
    setup(py)
    out.write('=== %s ===\n' % label)
    for i in range(updates):
        py.update()
        for reg, val in py.events:
            out.write('%02X %02X\n' % (reg, val))
        py.events[:] = []

for t in (1, 4, 5):
    run('tune%d' % t,
        lambda py, t=t: (py.init(), py.set_tune(t), py.start()), 6000)

out.close()
print('py long dump done')
