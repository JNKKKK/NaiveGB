import CPU from './CPU'
import MMU from './MMU'

var mmu = new MMU()
mmu.reset()
// mmu.load('./testROMs/cpu_instrs.gb')
// mmu.load('./testROMs/07-jr,jp,call,ret,rst.gb')
// mmu.load('./testROMs/06-ld r,r.gb')
mmu.load('./testROMs/01-special.gb')
// mmu.load('./testROMs/mytest.gb')
// console.log(MMU.if_inbios)
var cpu = new CPU(mmu)
cpu.reset()
cpu.skip_bios()

// console.log('ins length', cpu.instructions.length)
// cpu.instructions.forEach((ins, i) => { if (ins == 0) console.log(i.toString(16)) })

// setInterval(() => {
//     cpu.exec()
// }, 10);

function print_regs (cpu) {
    console.log(cpu.reg)
}

while (1) {
    cpu.exec()
    if (cpu.halt || cpu.stop) break
    if (Object.keys(cpu.reg).some(k => isNaN(cpu.reg[k]))) {
        print_regs(cpu)
        break
    }
}

