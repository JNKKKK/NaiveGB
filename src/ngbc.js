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
        //config GPU
        this.gpu.connect_mmu(this.mmu)
        this.gpu.reset()
        //config CPU      
        this.cpu.connect_mmu(this.mmu)
        this.cpu.connect_timer(this.timer)
        this.cpu.skip_bios()
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
            do {
                var t1 = new Date();
            } while ((t1 - t0) / 1000 < (1 / 62))
            document.getElementById('fps').innerHTML = Math.round(1000/(t1 - t0))
        }
        this.run_interval = setInterval(frame, 1)
    }


}

export default ngbc