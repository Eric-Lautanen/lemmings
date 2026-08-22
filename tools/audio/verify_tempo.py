"""verify_tempo.py - verify AH=4 tempo override against the emulator."""
import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P

tune = int(sys.argv[1]) if len(sys.argv) > 1 else 1
tempo = int(sys.argv[2]) if len(sys.argv) > 2 else 3
frames = int(sys.argv[3]) if len(sys.argv) > 3 else 120

mem = E.load_driver()
cpu = E.CPU(mem)
E.check_channels(cpu.m)
events = []
pending = {'reg': 0}
def out(port, val):
    if (port & 0xFF) == 0x88:
        pending['reg'] = val
    elif (port & 0xFF) == 0x89:
        events.append((pending['reg'], val))
def inp(port):
    return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out
cpu.in_cb = inp

E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | tune)
E.call(cpu, 0x0500)
for f in range(10):
    E.call(cpu, 0x0000)
E.call(cpu, 0x0400 | tempo)
emu_frames = []
for f in range(frames):
    n0 = len(events)
    E.call(cpu, 0x0000)
    emu_frames.append(events[n0:])

py = P.Driver(E.load_driver())
py.init()
py.set_tune(tune)
py.start()
for f in range(10):
    py.update()
py.set_tempo(tempo)
py_frames = []
for f in range(frames):
    n0 = len(py.events)
    py.update()
    py_frames.append(py.events[n0:])

print('emu events %d, py events %d' % (sum(len(f) for f in emu_frames),
                                       sum(len(f) for f in py_frames)))
bad = 0
for f in range(frames):
    if emu_frames[f] != py_frames[f]:
        bad += 1
        print('FRAME %d MISMATCH' % f)
        print('  emu: %s' % ' '.join('%02X=%02X' % e for e in emu_frames[f][:16]))
        print('  py : %s' % ' '.join('%02X=%02X' % e for e in py_frames[f][:16]))
        if bad > 5:
            break
if bad == 0:
    print('ALL %d FRAMES IDENTICAL (tempo %d)' % (frames, tempo))
else:
    print('%d mismatched frames' % bad)
