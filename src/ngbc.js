import CPU from './CPU'
import MMU from './MMU'
import TIMER from './Timer'
import GPU from './GPU'
import JOYPAD from './Joypad'
import Debugger from './Debugger'
import Bridge from './Bridge'
class ngbc {

    constructor (mode) {
        this.mode = mode
        // new bridge
        this.bridge = new Bridge()
        // new components
        this.TIMER = new TIMER(this.bridge)
        this.GPU = new GPU(this.bridge)
        this.MMU = new MMU(this.bridge)
        this.CPU = new CPU(this.bridge)
        this.JOYPAD = new JOYPAD(this.bridge)
        this.debugger = new Debugger(this.bridge)
        // register in bridge
        this.bridge.register('CPU', this.CPU)
        this.bridge.register('MMU', this.MMU)
        this.bridge.register('TIMER', this.TIMER)
        this.bridge.register('GPU', this.GPU)
        this.bridge.register('JOYPAD', this.JOYPAD)
        this.bridge.register('debugger', this.debugger)
        // init components
        this.CPU.init()
        this.GPU.init()
        this.MMU.init()
        this.TIMER.init()
        this.JOYPAD.init()
        this.debugger.init()
        //config GPU
        if (mode.startsWith('headless')) this.GPU.setHeadless()
        //config CPU
        this.CPU.skip_bios()
    }

    reset () {
        clearInterval(this.run_interval)
        this.CPU.reset()
        this.MMU.reset()
        this.GPU.reset()
        this.TIMER.reset()
    }

    run_web () {
        var frame = () => {
            var t0 = new Date();
            do {
                this.CPU.exec()
                if (this.CPU.stop) break
                this.CPU.handle_interrupt()
            } while (this.TIMER.total_m < 17556)
            this.TIMER.total_m = 0
            do {
                var t1 = new Date();
            } while ((t1 - t0) / 1000 < (1 / 62))
            document.getElementById('fps').innerHTML = Math.round(1000 / (t1 - t0))
        }
        this.run_interval = setInterval(frame, 1)
        console.log('Run!')
    }


    run_headless_blocking (batch) {
        // batch means how many intructions to run in a batch
        // If batch specified, the loop will stop after executing N instructions
        let count=0
        do {
            this.CPU.exec()
            this.CPU.handle_interrupt()
            if (batch) {
                count++
                if (count==batch) break
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

export default ngbc