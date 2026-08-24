import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

print('TUNE_LENGTHS = [')
for t in range(1, 22):
    mem = E.load_driver()
    cpu = E.CPU(mem)
    def out_cb(port, val): pass
    def inp(port):
        return (cpu.r['ax'] >> 8) & 0xFF
    cpu.out_cb = out_cb
    cpu.in_cb = inp
    E.call(cpu, 0x0200)
    E.call(cpu, 0x0300 + t)
    E.call(cpu, 0x0500)
    last_ef = cpu.m[0xEF]
    end_tick = 200000
    for f in range(1, 200000):
        cpu.r['ax'] = 0
        E.call(cpu, 0x0000)
        ef = cpu.m[0xEF]
        if ef != last_ef:
            end_tick = f
            break
        last_ef = ef
    print(f'  {end_tick},  // tune {t}')
    sys.stdout.flush()
print(']')
