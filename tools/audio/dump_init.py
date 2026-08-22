import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E

out = open(r'C:\github\Lemmings\dump_init.out', 'w')
def p(*a):
    print(*a, file=out)
    print(*a)

mem = E.load_driver()
p('init table 0x006D (%d words):' % 27)
for i in range(27):
    p('  [%02X] reg=%02X val=%02X' % (i, mem[0x006D + i*2], mem[0x006D + i*2 + 1]))
p('')
p('detect 0x00A3 code: %s' % ' '.join('%02X' % x for x in mem[0x00A3:0x0115]))
p('')
p('start 0x0500 code: %s' % ' '.join('%02X' % x for x in mem[0x0500:0x0535]))
out.close()
