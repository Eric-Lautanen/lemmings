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

log = open(r'C:\github\Lemmings\emu_tick_trace.out', 'w')
def p(*a):
    print(*a, file=log)

# trace everything between the ch8 tick entry and its freq
seq = []
def hook(ip, name):
    r = cpu.r
    seq.append((ip, name, r['di']))
cpu.log = hook
E.call(cpu, 0x0000)

# find the first 0349 hit after a 0177 with di=064C
for i in range(len(seq) - 1):
    ip, name, di = seq[i]
    if ip == 0x0177 and di == 0x064C:
        j = i
        while j < len(seq) and seq[j][0] != 0x0349:
            p('%04X %-12s di=%04X' % seq[j])
            j += 1
        p('freq entry: %04X di=%04X' % seq[j])
        break
log.close()
print('done, %d steps' % len(seq))
