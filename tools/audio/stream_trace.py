import sys, os
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P

tune, frames = 5, 200

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

def struct(m, di):
    return m[di:di+20]

def stream_at(m, di):
    p = m[di+12] | (m[di+13] << 8)
    return p, bytes(m[p:p+8])

def hexs(b):
    return ' '.join('%02X' % x for x in b)

log = open(r'C:\github\Lemmings\stream_trace.out', 'w')
def p(*a):
    print(*a, file=log)

CH1 = 0x05AC + 0x14
for f in range(frames):
    n0 = len(events)
    E.call(cpu, 0x0000)
    em = events[n0:]
    emu_ch1 = struct(cpu.m, CH1)
    emu_sp, emu_sb = stream_at(cpu.m, CH1)
    p('EMU f%03d ev[%d] ch1=%s' % (f, len(em), hexs(emu_ch1)))
    p('     stream@%04X %s' % (emu_sp, hexs(emu_sb)))

py = P.Driver(E.load_driver())
py.init()
py.set_tune(tune)
py.start()
for f in range(frames):
    n0 = len(py.events)
    py.update()
    pme = py.events[n0:]
    py_ch1 = struct(py.m, CH1)
    py_sp, py_sb = stream_at(py.m, CH1)
    p('PY  f%03d ev[%d] ch1=%s' % (f, len(pme), hexs(py_ch1)))
    p('     stream@%04X %s' % (py_sp, hexs(py_sb)))

log.close()
print('done')
