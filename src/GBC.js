import CPU from './CPU'
import MMU from './MMU'
import TIMER from './Timer'

var timer = new TIMER()
var mmu = new MMU()
timer.connect_mmu(mmu)
mmu.connect_timer(timer)
mmu.reset()

// mmu.load('./testROMs/instr_timing.gb')
mmu.load('./testROMs/mem_timing.gb')
// mmu.load('./testROMs/01-read_timing.gb')
// mmu.load('./testROMs/02-write_timing.gb')
// mmu.load('./testROMs/03-modify_timing.gb')
// mmu.load('./testROMs/cpu_instrs.gb')
// mmu.load('./testROMs/01-special.gb')
// mmu.load('./testROMs/02-interrupts.gb')
// mmu.load('./testROMs/03-op sp,hl.gb')
// mmu.load('./testROMs/04-op r,imm.gb')
// mmu.load('./testROMs/05-op rp.gb')
// mmu.load('./testROMs/06-ld r,r.gb')
// mmu.load('./testROMs/07-jr,jp,call,ret,rst.gb')
// mmu.load('./testROMs/08-misc instrs.gb')
// mmu.load('./testROMs/09-op r,r.gb')
// mmu.load('./testROMs/10-bit ops.gb')
// mmu.load('./testROMs/11-op a,(hl).gb')
// mmu.load('./testROMs/mytest.gb')

var cpu = new CPU()
cpu.connect_mmu(mmu)
cpu.connect_timer(timer)
cpu.reset()
cpu.skip_bios()


function print_regs (cpu) {
    console.log('Registers:')
    console.log('AF = 0x', ((cpu.reg.a << 8) + cpu.reg.f).toString('16').padStart(4, '0'))
    console.log('BC = 0x', ((cpu.reg.b << 8) + cpu.reg.c).toString('16').padStart(4, '0'))
    console.log('DE = 0x', ((cpu.reg.d << 8) + cpu.reg.e).toString('16').padStart(4, '0'))
    console.log('HL = 0x', ((cpu.reg.h << 8) + cpu.reg.l).toString('16').padStart(4, '0'))
    console.log('SP = 0x', cpu.reg.sp.toString('16'))

}

var readlineSync = require('readline-sync');

while (1) {
    cpu.exec()
    if (cpu.stop) break
    cpu.handle_interrupt()
    // if (cpu.reg.pc == 0xc2a8) {
    //     print_regs(cpu)
    //     readlineSync.question('Press any keys to continue...');
    // }
}