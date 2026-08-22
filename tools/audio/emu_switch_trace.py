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
for f in range(30):
    E.call(cpu, 0x0000)
E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 2)
E.call(cpu, 0x0500)

log = open(r'C:\github\Lemmings\emu_switch_trace.out', 'w')
seq = []
def hook(ip, name):
    r = cpu.r
    seq.append((ip, name, r['ax'], r['bx'], r['si'], r['di']))
cpu.log = hook
E.call(cpu, 0x0000)

for i in range(len(seq)):
    ip, name, ax, bx, si, di = seq[i]
    if ip in (0x0457, 0x0464, 0x046B, 0x045C) and i < 400:
        log.write('%04X %-14s ax=%04X bx=%04X si=%04X di=%04X | ED=%02X EE=%02X EF=%02X\n' % (
            ip, name, ax, bx, si, di, mem[0x0ED], mem[0x0EE], mem[0x0EF]))
log.close()
print('done', len(seq))
