import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

mem = E.load_driver()
cpu = E.CPU(mem)
events = []
pending = {'reg': 0}
def out_cb(port, val):
    p = port & 0xFF
    if p == 0x88: pending['reg'] = val
    elif p == 0x89: events.append((pending['reg'], val))
def inp(port):
    return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out_cb
cpu.in_cb = inp

E.call(cpu, 0x0200)
E.call(cpu, 0x0301)
E.call(cpu, 0x0500)

w = lambda a: cpu.m[a] | cpu.m[a + 1] << 8

# dump ch0 section list at 0BA8 (from earlier trace)
print('ch0 section list @0BA8:', ' '.join('%04X' % w(0xBA8 + i * 2) for i in range(16)))

# trace ch0 around first loop point
prevP = None
prevL = None
for f in range(8000):
    E.call(cpu, 0x0000)
    L = w(0x05B6); P = w(0x05B8)
    if f > 7600 and P != prevP:
        print(f'f{f}: L={L:04X} P={P:04X} ev={len(events)}')
        prevP = P
        if len(events) > 5000 and f > 7600: break
    if f > 30000: break
