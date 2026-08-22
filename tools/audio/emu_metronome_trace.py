import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

mem = E.load_driver()
cpu = E.CPU(mem)
E.check_channels(cpu.m)

def out(p, v):
    pass
def inp(p):
    return 0xFF
cpu.out_cb = out
cpu.in_cb = inp

E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 1)
E.call(cpu, 0x0500)
for f in range(10):
    E.call(cpu, 0x0000)
E.call(cpu, 0x0400 | 3)

log = open(r'C:\github\Lemmings\emu_metronome_trace.out', 'w')
def p(*a):
    print(*a, file=log)

# capture instruction stream around ch8 processing (0x0349 freq, 0x0177 tick,
# 0x019E fetch, 0x05xx tempo_override)
WATCH = [0x0349, 0x0177, 0x019E, 0x051C, 0x0115, 0x02D0]
hits = []
def hook(ip, name):
    if ip in WATCH or 0x0349 <= ip <= 0x038E:
        r = cpu.r
        hits.append((ip, name, r['ax'], r['bx'], r['si'], r['di'],
                     cpu.m[0x064C:0x064C+20]))
cpu.log = hook
for f in range(10):
    E.call(cpu, 0x0000)

prev = None
for h in hits:
    if prev is not None and h[0] == prev[0] and h[1] == prev[1] and h[2] == prev[2]:
        continue
    prev = h
    p('%04X %-12s ax=%04X bx=%04X si=%04X di=%04X ch8=%s' % (
        h[0], h[1], h[2], h[3], h[4], h[5],
        ' '.join('%02X' % x for x in h[6][:12])))
log.close()
print('done %d hits' % len(hits))
