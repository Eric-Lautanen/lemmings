import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\verify_freq3.out', 'w')
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

log = []
orig_step = cpu.step
def stepped():
    orig_step()
    if cpu.ip0 == 0x0370:
        log.append(('LODSW', cpu.r['ax'], cpu.r['bx'] & 0xFF, cpu.m[0x05AC], cpu.m[0x05BE]))
    elif cpu.ip0 == 0x0381:
        log.append(('PUSH', cpu.r['ax'], cpu.r['bx'] & 0xFF, 0, 0))
cpu.step = stepped

E.call(cpu, 0x0200)
E.call(cpu, 0x0301)
E.call(cpu, 0x0500)
log.clear()
for f in range(20):
    E.call(cpu, 0x0000)
    for r, v in events:
        if r in (0xA0, 0xB0) and v != 0:
            p('f%02d %02X=%02X' % (f, r, v))
    events.clear()
p('--- freq calcs ---')
for e in log[:16]:
    p('ip=%s ax=%04X bl=%02X note=%02X off=%02X' % e)
out.close()
