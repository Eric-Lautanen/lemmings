import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P
import emu8086 as E

image = E.load_driver()
out = open(r'C:\github\Lemmings\events_py.txt', 'w')

def run(label, setup, updates):
    py = P.Driver(image, log=True)
    setup(py)
    out.write('=== %s ===\n' % label)
    for i in range(updates):
        py.update()
        for reg, val in py.events:
            out.write('%02X %02X\n' % (reg, val))
        py.events[:] = []

for t in range(1, 22):
    run('tune%d' % t,
        lambda py, t=t: (py.init(), py.set_tune(t), py.start()), 600)

run('sfx1', lambda py: (py.init(), py.set_tune(1), py.start(), py.set_tempo(1)), 200)
run('sfx18', lambda py: (py.init(), py.set_tune(2), py.start(), py.set_tempo(18)), 200)
run('switch', lambda py: (py.init(), py.set_tune(3), py.start()), 60)
out.close()
print('done')
