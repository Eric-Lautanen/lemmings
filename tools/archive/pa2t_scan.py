from capstone import *
import re
data = open(r'C:\Users\ericl\AppData\Local\Temp\opencode\s5.bin', 'rb').read()
md = Cs(CS_ARCH_X86, CS_MODE_16)
md.detail = False

# try 16-bit mode from a few candidate offsets; find one with sane flow
starts = [0x15E, 0x160, 0x161, 0x162, 0x163, 0x164, 0x165, 0x166, 0x167, 0x185, 0x186, 0x187, 0x189, 0x18b, 0x1c0, 0x248, 0x250, 0x255, 0x25b]
for start in starts:
    out = list(md.disasm(data[start:], 0))
    ok = 0
    bad = 0
    for i in out:
        if i.mnemonic.startswith('invalid'):
            bad += 1
        elif i.mnemonic not in ('add','or','and','cmp','mov','push','pop','jmp','je','jne','ja','jb','jae','jbe','call','ret','retf','lea','test','xchg','inc','dec','sub','sbb','adc','imul','mul','div','idiv','neg','not','shl','shr','sar','sal','rol','ror','rcl','rcr','loop','lodsb','stosb','movsb','movsw','lods','stos','in','out','int','hlt','nop','pushf','popf','jz','jnz','jle','jl','jge','jg','xlat','cbw','cwd','clc','stc','cmc','lahf','sahf','aaa','das','aas','daa','setne','sete'):
            bad += 1
    if bad == 0 and ok > 10:
        print('=== start 0x%x' % start)
        for i in out:
            print('%04x  %-22s %s %s' % (i.address, i.bytes.hex(), i.mnemonic, i.op_str))
        print()