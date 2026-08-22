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

log = open(r'C:\github\Lemmings\emu_tick_raw.out', 'w')
def p(*a):
    print(*a, file=log)

seq = []
def hook(ip, name):
    r = cpu.r
    seq.append((ip, name, r['ax'], r['bx'], r['si'], r['di']))
cpu.log = hook
E.call(cpu, 0x0000)

# locate the 2nd 0177 (ch8 tick) and print 120 steps from there
count = 0
for i, s in enumerate(seq):
    if s[0] == 0x0177:
        count += 1
        if count == 2:
            for j in range(i, min(i + 120, len(seq))):
                ip, name, ax, bx, si, di = seq[j]
                p('%04X %-14s ax=%04X bx=%04X si=%04X di=%04X' % (ip, name, ax, bx, si, di))
            break
log.close()
print('done')
