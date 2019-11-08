import CPU from './CPU'
import MMU from './MMU'
import TIMER from './Timer'
import GPU from './GPU'
import JOYPAD from './Joypad'

class ngbc {

    constructor () {
        // new components
        this.timer = new TIMER()
        this.gpu = new GPU()
        this.mmu = new MMU()
        this.cpu = new CPU()
        this.joypad = new JOYPAD()
        // config timer
        this.timer.connect_mmu(this.mmu)
        this.timer.connect_gpu(this.gpu)
        //config MMU
        this.mmu.connect_timer(this.timer)
        this.mmu.connect_gpu(this.gpu)
        this.mmu.connect_cpu(this.cpu)
        this.mmu.connect_joypad(this.joypad)
        this.mmu.reset()

        // mmu.load('./testROMs/instr_timing.gb')
        // mmu.load('./testROMs/mem_timing.gb')
        // mmu.load('./testROMs/01-read_timing.gb')
        // mmu.load('./testROMs/02-write_timing.gb')
        // mmu.load('./testROMs/03-modify_timing.gb')
        // this.mmu.load('./testROMs/cpu_instrs.gb')
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
        //config GPU
        this.gpu.connect_mmu(this.mmu)
        this.gpu.reset()
        //config CPU      
        this.cpu.connect_mmu(this.mmu)
        this.cpu.connect_timer(this.timer)
        // this.cpu.reset()
        // this.cpu.skip_bios()
    }

    reset () {
        clearInterval(this.run_interval)
        this.cpu.reset()
        this.mmu.reset()
        this.gpu.reset()
        this.timer.reset()
    }

    run () {
        var frame = () => {
            var t0 = new Date();
            do {
                this.cpu.exec()
                if (this.cpu.stop) break
                this.cpu.handle_interrupt()
            } while (this.timer.total_m < 17556)
            this.timer.total_m = 0
            var t1 = new Date();
            document.getElementById('fps').innerHTML = Math.round(10000 / (t1 - t0)) / 10;
        }
        this.run_interval = setInterval(frame, 1)
    }


}

export default ngbc