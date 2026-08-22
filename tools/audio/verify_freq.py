import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\verify_freq.out', 'w')
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

p('note table A 0x0AA7: %s' % ' '.join('%02X' % x for x in cpu.m[0x0AA7:0x0AA7+64]))
p('note table B 0x0B07: %s' % ' '.join('%02X' % x for x in cpu.m[0x0B07:0x0B07+64]))
p('freq words 0x0927 stride32: %s' % ' '.join('%04X' % (cpu.m[0x0927+32*k] | cpu.m[0x0927+32*k+1] << 8) for k in range(12)))
p('voice base: %04X tempo: %02X chcount: %d' % (cpu.m[0x0B68] | cpu.m[0x0B69] << 8, cpu.m[0x0B6A], cpu.m[0x0B6C]))
p('ch0 voice ptr [di+2]: %04X' % (cpu.m[0x05AE] | cpu.m[0x05AF] << 8))
p('ch0 freq-offset [di+18]: %02X' % cpu.m[0x05BE])
p('ch0 note [di+0]: %02X' % cpu.m[0x05AC])

w = lambda a: cpu.m[a] | cpu.m[a + 1] << 8
first = {}
for f in range(20):
    E.call(cpu, 0x0000)
    for r, v in events:
        if r in (0xA0, 0xB0, 0xA8, 0xB8) and r not in first:
            first[r] = v
    events.clear()
    if f % 7 == 0:
        p('f%02d note=%02X off=%02X P=%04X' % (f, cpu.m[0x05AC], cpu.m[0x05BE], w(0x05B8)))
p('first A0/B0/A8/B8:', {hex(k): hex(v) for k, v in sorted(first.items())})
out.close()
