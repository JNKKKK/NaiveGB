function print_regs (cpu) {
    console.log('Registers:')
    console.log('AF = 0x', ((cpu.reg.a << 8) + cpu.reg.f).toString('16').padStart(4, '0'))
    console.log('BC = 0x', ((cpu.reg.b << 8) + cpu.reg.c).toString('16').padStart(4, '0'))
    console.log('DE = 0x', ((cpu.reg.d << 8) + cpu.reg.e).toString('16').padStart(4, '0'))
    console.log('HL = 0x', ((cpu.reg.h << 8) + cpu.reg.l).toString('16').padStart(4, '0'))
    console.log('SP = 0x', cpu.reg.sp.toString('16'))

}

export { print_regs }