import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

mem = E.load_driver()
cpu = E.CPU(mem)
events = []
pending = {'reg': 0}
def out_cb(port, val):
    p = port & 0xFF
    if p == 0x88:
        pending['reg'] = val
    elif p == 0x89:
        events.append((pending['reg'], val))
def inp(port):
    return (cpu.r['ax'] >> 8) & 0xFF
cpu.out_cb = out_cb
cpu.in_cb = inp

E.call(cpu, 0x0200)          # init
E.call(cpu, 0x0301)          # set-tune handler, AL=1 -> tune 1
E.call(cpu, 0x0500)          # start
print('after set_tune+start: 0ED=%02X 0EE=%02X 0EF=%02X 4A=%02X 4B=%02X' % (
  cpu.m[0xED], cpu.m[0xEE], cpu.m[0xEF], cpu.m[0x4A], cpu.m[0x4B]))

w = lambda a: cpu.m[a] | cpu.m[a + 1] << 8

# run updates, watching for end-of-tune transition
ef_hist = []
last_ef = None
for f in range(30000):
    E.call(cpu, 0x0000)      # AH=0 tick
    ef = cpu.m[0xEF]
    if ef != last_ef:
        print(f'f{f}: [0xEF] -> {ef}')
        last_ef = ef
    if f in (10, 100, 600, 1200, 2400, 4800):
        L = w(0x05B6); P = w(0x05B8)
        print(f'f{f}: ch0 L={L:04X} P={P:04X} 0ED={cpu.m[0xED]:02X} 0EE={cpu.m[0xEE]:02X} events so far={len(events)}')
print('total events:', len(events))
