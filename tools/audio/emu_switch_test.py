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

E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 1)
E.call(cpu, 0x0500)
for f in range(30):
    E.call(cpu, 0x0000)
n1 = len(events)
# mid-play: full restart sequence with a new tune
E.call(cpu, 0x0200)
E.call(cpu, 0x0300 | 2)
E.call(cpu, 0x0500)
E.call(cpu, 0x0000)
n2 = len(events)
for f in range(29):
    E.call(cpu, 0x0000)
n3 = len(events)
print('first-30 events: %d, after restart: %d, next 30: %d' % (n1, n2 - n1, n3 - n2))
# fingerprint: count note-on (0xB0..B8 with 0x20) writes
def noteons(ev):
    return sum(1 for r, v in ev if 0xB0 <= r <= 0xB8 and v & 0x20)
print('note-ons tune1 phase:', noteons(events[:n1]))
print('note-ons restart frame:', noteons(events[n1:n2]))
print('note-ons after:', noteons(events[n2:n3]))
print('events after restart: %s' % ' '.join('%02X=%02X' % e for e in events[n1:n2][:24]))
