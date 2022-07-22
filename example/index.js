import ngbc from '../src/ngbc';

window.onload = function () {
    var emu = new ngbc();
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
    emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/mem_timing2.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/01-read_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/02-write_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/03-modify_timing.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus2.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus5.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Super+Mario+Land+(JUE)+(V1.1)+%5B!%5D.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pokemon+Red+(UE)+%5BS%5D%5B!%5D.gb', () => { console.log('rom loaded') })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pac-Man+(U)+(Namco).gb', () => { console.log('rom loaded') })

    window.onkeydown = (e) => emu.JOYPAD.keydown(e);
    window.onkeyup = (e) => emu.JOYPAD.keyup(e);
};
