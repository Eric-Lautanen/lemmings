import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\dump_raw.out', 'w')
def p(*a):
    print(*a, file=out)
    print(*a)

mem = E.load_driver()
def dump(start, end, label):
    p('%s (%04X-%04X):' % (label, start, end))
    for a in range(start, end, 16):
        p('  %04X: %s' % (a, ' '.join('%02X' % x for x in mem[a:a+16])))

dump(0x003A, 0x00A3, 'init 0x003A')
dump(0x03EA, 0x0420, 'jump table + handlers')
dump(0x04B0, 0x04C6, 'tune-load tail')
out.close()
