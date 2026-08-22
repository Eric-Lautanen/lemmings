import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\dump_raw2.out', 'w')
def p(*a):
    print(*a, file=out)
    print(*a)

mem = E.load_driver()
def dump(start, end, label):
    p('%s (%04X-%04X):' % (label, start, end))
    for a in range(start, end, 16):
        p('  %04X: %s' % (a, ' '.join('%02X' % x for x in mem[a:a+16])))

dump(0x0535, 0x0570, 'tempo handler tail')
dump(0x54E3, 0x5620, 'ch4+ voice table / tempo table')
dump(0x0B6C, 0x0BC0, 'tunes list + tune 1 header')
p('')
p('tune 1 header 0x0B98: %s' % ' '.join('%02X' % x for x in mem[0x0B98:0x0B98+24]))
p('')
p('tunes[0..4] pointers: %s' % ' '.join('%04X' % (mem[0x0B6E + 2*i] | (mem[0x0B6F + 2*i] << 8)) for i in range(5)))
out.close()
