class Debuger {
    constructor (bridge) {
        this.bridge = bridge
    }

    init () {
        this.CPU = this.bridge.CPU
        this.GPU = this.bridge.GPU
        this.MMU = this.bridge.MMU
        this.TIMER = this.bridge.TIMER
    }

    print_tilemap (gpu, tm_i) {
        let line = []
        gpu.tilemap_index[tm_i].forEach((ti, i) => {
            line.push(ti)
            if ((i + 1) % 32 == 0) {
                console.log(line.map(x => x.toString('16').padStart(2, '0')).join(','))
                line = []
            }
        });
    }

    tracelog (argc, instr, ...args) {
        let A = this.CPU.reg.a.toString('16').padStart(2, '0').toUpperCase()
        let F = (this.CPU.reg.f >> 7) ? 'Z' : '-'
        F += (this.CPU.reg.f >> 6 & 0x1) ? 'N' : '-'
        F += (this.CPU.reg.f >> 5 & 0x1) ? 'H' : '-'
        F += (this.CPU.reg.f >> 4 & 0x1) ? 'C' : '-'
        let BC = ((this.CPU.reg.b << 8) + this.CPU.reg.c).toString('16').padStart(4, '0').toUpperCase()
        let DE = ((this.CPU.reg.d << 8) + this.CPU.reg.e).toString('16').padStart(4, '0')
        let HL = ((this.CPU.reg.h << 8) + this.CPU.reg.l).toString('16').padStart(4, '0')
        let SP = this.CPU.reg.sp.toString('16').padStart(4, '0')
        let PC
        let opcodes = []
        if (argc == -1) { // CB instruction
            PC = (this.CPU.reg.pc - 1).toString('16').padStart(4, '0')
            opcodes.push('cb')
            argc = 0
        } else { //non-CB instruction
            PC = this.CPU.reg.pc.toString('16').padStart(4, '0')
        }
        let cy = this.TIMER.total_m * 4
        let ppu = this.GPU.stat_01_mode
        for (let i = 0; i < argc + 1; i++) {
            opcodes.push(this.MMU.rb(this.CPU.reg.pc + i).toString('16').padStart(2, '0'))
        }
        // add space
        // for (let i = 0; i < 2 - argc; i++) {
        //     opcodes.push('  ')
        // }
        let instruction = `${instr} ${args.join(',')}`.padEnd(15, ' ')
        // console.log(`A:${A} F:${F} BC:${BC} DE:${DE} HL:${HL} SP:${SP} PC:${PC} (cy: ${cy}) ppu:+${ppu} |[00]0x${PC}: ${opcodes.join(' ')}  ${instruction}`)
        console.log(`A:${A} F:${F} BC:${BC} DE:${DE} HL:${HL} SP:${SP} PC:${PC} (cy: ${cy}) |[00]0x${PC}: ${opcodes.join(' ').padEnd(8, ' ')}  ${instruction}`)
    }

}

export default Debuger
