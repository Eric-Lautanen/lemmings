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

log = open(r'C:\github\Lemmings\emu_tick_trace2.out', 'w')
def p(*a):
    print(*a, file=log)

seq = []
def hook(ip, name):
    r = cpu.r
    seq.append((ip, name, r['ax'], r['bx'], r['si'], r['di']))
cpu.log = hook
E.call(cpu, 0x0000)

for i in range(len(seq) - 1):
    ip, name, ax, bx, si, di = seq[i]
    if ip == 0x0177 and di == 0x064C:
        for j in range(i, min(i + 25, len(seq))):
            ip2, n2, ax2, bx2, si2, di2 = seq[j]
            p('%04X %-12s ax=%04X bx=%04X si=%04X di=%04X' % (ip2, n2, ax2, bx2, si2, di2))
        break
log.close()
print('done')
