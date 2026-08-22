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

log = open(r'C:\github\Lemmings\emu_routine_trace.out', 'w')
def p(*a):
    print(*a, file=log)

seq = []
def hook(ip, name):
    r = cpu.r
    seq.append((ip, name, r['ax'], r['bx'], r['si'], r['di']))
cpu.log = hook
E.call(cpu, 0x0000)

# dump the full instruction stream from the first 0177 (ch0, no slide) through
# the end of the update, but only unique (ip, di) pairs to compress
seen = set()
for ip, name, ax, bx, si, di in seq:
    if 0x0170 <= ip <= 0x04A0:
        key = (ip, di)
        if key in seen:
            continue
        seen.add(key)
        p('%04X %-14s ax=%04X bx=%04X si=%04X di=%04X' % (ip, name, ax, bx, si, di))
log.close()
print('done, %d steps' % len(seq))
