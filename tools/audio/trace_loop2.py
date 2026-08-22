import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\trace_loop2.out', 'w')
def p(*a):
    print(*a, file=out)
    print(*a)

mem = E.load_driver()
cpu = E.CPU(mem)
E.check_channels(cpu.m)
events = []
pending = {'reg': 0}
def out_cb(port, val):
    if (port & 0xFF) == 0x88:
        pending['reg'] = val
    elif (port & 0xFF) == 0x89:
        events.append((pending['reg'], val))
def inp(port):
    return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out_cb
cpu.in_cb = inp
E.call(cpu, 0x0200)
E.call(cpu, 0x0301)
E.call(cpu, 0x0500)
w = lambda a: cpu.m[a] | cpu.m[a + 1] << 8
p('tune hdr 0B96: %s' % ' '.join('%02X' % x for x in cpu.m[0x0B96:0x0B9E]))
p('tune tbl 0B9E: %s' % ' '.join('%02X' % x for x in cpu.m[0x0B9E:0x0C00]))
for f in range(44):
    E.call(cpu, 0x0000)
    if f % 2 == 0:
        p('f%02d L=%04X P=%04X' % (f, w(0x05B6), w(0x05B8)))
p('ch0 struct: %s' % ' '.join('%02X' % x for x in cpu.m[0x05AC:0x05C0]))
p('num events:', len(events))
p('B0 events:', [e for e in events if e[0] == 0xB0][:6])
out.close()
