import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\verify_freq2.out', 'w')
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

p('code 0349..0371: %s' % ' '.join('%02X' % x for x in cpu.m[0x0349:0x0372]))
p('words stride4  @0927: %s' % ' '.join('%04X' % (cpu.m[0x0927+4*k] | cpu.m[0x0927+4*k+1] << 8) for k in range(16)))
p('words stride17 @0927: %s' % ' '.join('%04X' % (cpu.m[0x0927+17*k] | cpu.m[0x0927+17*k+1] << 8) for k in range(12)))
p('words stride32 @0927: %s' % ' '.join('%04X' % (cpu.m[0x0927+32*k] | cpu.m[0x0927+32*k+1] << 8) for k in range(12)))

w = lambda a: cpu.m[a] | cpu.m[a + 1] << 8
seen = set()
for f in range(60):
    E.call(cpu, 0x0000)
    for r, v in events:
        key = (r, v)
        if r in (0xA0, 0xA1, 0xA2, 0xB0, 0xB1, 0xB2) and key not in seen:
            seen.add(key)
            p('f%02d reg=%02X val=%02X' % (f, r, v))
    events.clear()
p('struct: %s' % ' '.join('%02X' % x for x in cpu.m[0x05AC:0x05C0]))
p('globals: base=%04X tempo=%02X count=%d' % (w(0x0B68), cpu.m[0x0B6A], cpu.m[0x0B6C]))
out.close()
