import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\verify_loop.out', 'w')
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
for f in range(100):
    E.call(cpu, 0x0000)
    if f % 2 == 0:
        p('f%03d L=%04X P=%04X' % (f, w(0x05B6), w(0x05B8)))
    if f > 60:
        for r, v in events:
            p('  f%03d %02X=%02X' % (f, r, v))
        events.clear()
out.close()
