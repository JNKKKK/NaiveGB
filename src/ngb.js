import CPU from './CPU'
import MMU from './MMU'
import TIMER from './Timer'
import GPU from './GPU'
import JOYPAD from './Joypad'
import APU from './Sound'
import Debugger from './Debugger'

class ngb {

    constructor (mode) {
        this.mode = mode
        this.TIMER = new TIMER(this)
        this.GPU = new GPU(this)
        this.MMU = new MMU(this)
        this.CPU = new CPU(this)
        this.JOYPAD = new JOYPAD(this)
        this.APU = new APU(this)
        this.debugger = new Debugger(this)

        this.CPU.init()
        this.GPU.init()
        this.MMU.init()
        this.TIMER.init()
        this.JOYPAD.init()
        this.debugger.init()

        // init APU right now ONLY IF in headless mode
        if (mode?.startsWith('headless')) {
            this.APU.init()
            this.APU.skip_bios()
        }

        this.CPU.skip_bios()
    }

    reset () {
        clearInterval(this.run_interval)
        
        this.CPU.reset()
        this.MMU.reset()
        this.GPU.reset()
        this.TIMER.reset()
        this.APU.reset()

        this.CPU.skip_bios()
        this.APU.skip_bios()
    }

    run_web () {
        // init APU after a user gesture
        this.APU.init()
        this.APU.skip_bios()

        let frame = () => {
            let t0 = new Date(), t1;
            do {
                this.CPU.exec()
                if (this.CPU.stop) break
                this.CPU.handle_interrupt()
            } while (this.TIMER.temp_m < 17556)
            this.TIMER.temp_m = 0
            do {
                t1 = new Date();
            } while ((t1 - t0) / 1000 < (1 / 62))
            document.getElementById('fps').innerHTML = Math.round(1000 / (t1 - t0))
        }

        this.run_interval = setInterval(frame, 1)
        console.log('Running!')
    }


    run_headless_blocking (batch) {
        // batch means how many intructions to run in a batch
        // If batch specified, the loop will stop after executing N instructions
        let count = 0
        do {
            this.CPU.exec()
            this.CPU.handle_interrupt()
            if (batch) {
                count++
                if (count == batch) break
            }
        } while (!this.CPU.stop)
    }

    run_headless_non_blocking () {
        setImmediate(() => {
            this.run_headless_blocking(200)
            if (!this.CPU.stop) setImmediate(() => { this.run_headless_non_blocking() })
        })
    }

    run () {
        if (this.mode == 'headless') {
            // this.CPU.TRACELOG = true
            this.run_headless_blocking()
        }
        else if (this.mode == 'headless-non-blocking') {
            this.run_headless_non_blocking()
        } else {
            this.run_web()
        }
    }

    stop () {
        this.CPU.stop = true
    }

}

export default ngb