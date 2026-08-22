from capstone import *
data = open(r'C:\Users\ericl\AppData\Local\Temp\opencode\s5.bin', 'rb').read()
md = Cs(CS_ARCH_X86, CS_MODE_32)
md.detail = False
print('total', len(data))
for i in md.disasm(data, 0):
    print('%04x  %-16s %s %s' % (i.address, i.bytes.hex(), i.mnemonic, i.op_str))