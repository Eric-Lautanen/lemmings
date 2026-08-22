import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

mem = E.load_driver()
cpu = E.CPU(mem)
E.check_channels(cpu.m)

def out(p, v): pass
def inp(p): return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out
cpu.in_cb = inp

E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 5)
E.call(cpu, 0x0500)

log = open(r'C:\github\Lemmings\emu_freq_trace.out', 'w')
def p(*a):
    print(*a, file=log)

# run 46 updates; capture all steps hitting the freq block 0x0349-0x0390
hits = []
import itertools
frame_no = [0]
def hook(ip, name):
    if 0x0349 <= ip <= 0x0390:
        r = cpu.r
        hits.append((frame_no[0], ip, name, r['ax'], r['bx'], r['si'], r['di']))
cpu.log = hook

for f in range(46):
    frame_no[0] = f
    E.call(cpu, 0x0000)

for h in hits:
    p('f%03d %04X %-22s ax=%04X bx=%04X si=%04X di=%04X' % h)
log.close()
print('done %d hits' % len(hits))
