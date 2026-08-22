from capstone import *
data = open(r'C:\Users\ericl\AppData\Local\Temp\opencode\s5.bin', 'rb').read()
md = Cs(CS_ARCH_X86, CS_MODE_16)
md.detail = False
for start in [0x184, 0x185, 0x186, 0x187, 0x188, 0x189, 0x18a, 0x18b]:
    print('===== start 0x%x' % start)
    for i in md.disasm(data[start:], 0):
        print('%04x  %-22s %s %s' % (i.address, i.bytes.hex(), i.mnemonic, i.op_str))
    print()