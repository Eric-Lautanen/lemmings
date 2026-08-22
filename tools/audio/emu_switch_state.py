import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

mem = E.load_driver()
cpu = E.CPU(mem)
E.check_channels(cpu.m)
events = []
pending = {'reg': 0}
def out(port, val):
    if (port & 0xFF) == 0x88:
        pending['reg'] = val
    elif (port & 0xFF) == 0x89:
        events.append((pending['reg'], val))
def inp(port):
    return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out
cpu.in_cb = inp

def state(tag):
    print(tag, 'B6A=%02X B6B=%02X B6C=%04X B68=%04X EE=%02X ED=%02X' % (
        mem[0x0B6A], mem[0x0B6B], mem[0x0B6C], mem[0x0B68], mem[0x0EE], mem[0x0ED]))
    for k in range(4):
        b = 0x05AC + k * 0x14
        print('  ch%d: flag=%d cnt=%02X note=%02X dur=%02X stream=%04X si=%04X' % (
            k, mem[b + 16], mem[b + 1], mem[b], mem[b + 17],
            mem[b + 12] | (mem[b + 13] << 8), mem[b + 2] | (mem[b + 3] << 8)))

E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 1)
E.call(cpu, 0x0500)
for f in range(30):
    E.call(cpu, 0x0000)
E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 2)
E.call(cpu, 0x0500)
E.call(cpu, 0x0000)
state('after restart-frame:')
E.call(cpu, 0x0000)
state('after next frame:')
E.call(cpu, 0x0000)
state('after next frame:')
E.call(cpu, 0x0000)
state('after next frame:')
print('events since restart:', len(events))
