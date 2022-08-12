import ngb from '../src/ngb';

window.onload = function () {
    var emu = new ngb();
    window.emu=emu
    emu.GPU.connect_canvas(document.getElementById('screen'))
    document.getElementById('run_button').onclick = function () {
        emu.run()
    }
    document.getElementById('reset_button').onclick = function () {
        emu.reset()
        emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus5.gb', () => { console.log('rom loaded') })
    }
    document.getElementById('debug_tilemap').onclick = function () {

    }
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/cpu_instrs.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Tetris+(World)+(Rev+A).gb',()=>{console.log('rom loaded')})
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/instr_timing.gb',()=>{console.log('rom loaded')})
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus1.gb',()=>{console.log('rom loaded')})
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/interrupt_time.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/mem_timing1.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/mem_timing2.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/01-read_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/02-write_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/03-modify_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus2.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus5.gb', () => { console.log('rom loaded') })
    // dmg_sound
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/dmg_sound.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/01-registers.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/02-len ctr.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/03-trigger.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/04-sweep.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/05-sweep details.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/06-overflow on trigger.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/07-len sweep period sync.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/08-len ctr during power.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/09-wave read while on.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/10-wave trigger while on.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/11-regs after power.gb', () => { console.log('rom loaded') })
    emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/12-wave write while on.gb', () => { console.log('rom loaded') })
    // games
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Super+Mario+Land+(JUE)+(V1.1)+%5B!%5D.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pokemon+Red+(UE)+%5BS%5D%5B!%5D.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pac-Man+(U)+(Namco).gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Hoshi no Kirby (Japan).gb', () => { console.log('rom loaded') })

    window.onkeydown = (e) => emu.JOYPAD.keydown(e);
    window.onkeyup = (e) => emu.JOYPAD.keyup(e);
};
