"""verify_api.py - verify AH=1 detect and mid-play tune switching vs emulator."""
import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P

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

# --- AH=1 detect ---
E.call(cpu, 0x0100)
emu_detect = cpu.r['ax'] & 0xFF
py = P.Driver(E.load_driver())
print('detect: emu AL=%02X py=%d' % (emu_detect, py.detect()))

# --- mid-play tune switch ---
E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 1)
E.call(cpu, 0x0500)
for f in range(30):
    E.call(cpu, 0x0000)
E.call(cpu, 0x0300 | 2)          # switch to tune 2 mid-play
emu_frames = []
for f in range(40):
    n0 = len(events)
    E.call(cpu, 0x0000)
    emu_frames.append(events[n0:])

py2 = P.Driver(E.load_driver())
py2.init()
py2.set_tune(1)
py2.start()
for f in range(30):
    py2.update()
py2.set_tune(2)
py_frames = []
for f in range(40):
    n0 = len(py2.events)
    py2.update()
    py_frames.append(py2.events[n0:])

bad = 0
for f in range(40):
    if emu_frames[f] != py_frames[f]:
        bad += 1
        print('FRAME %d MISMATCH' % f)
        print('  emu: %s' % ' '.join('%02X=%02X' % e for e in emu_frames[f][:16]))
        print('  py : %s' % ' '.join('%02X=%02X' % e for e in py_frames[f][:16]))
        if bad > 5:
            break
if bad == 0:
    print('ALL 40 FRAMES IDENTICAL (mid-play tune switch)')
else:
    print('%d mismatched frames' % bad)
