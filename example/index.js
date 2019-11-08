import ngbc from '../src/ngbc';

window.onload = function () {
    var emu = new ngbc();
    emu.gpu.connect_canvas(document.getElementById('screen'))
    document.getElementById('run_button').onclick = function () {
        emu.run()
    }
    document.getElementById('reset_button').onclick = function () {
        emu.reset()
        emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus2.gb', () => { console.log('rom loaded') })
    }
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/cpu_instrs.gb', () => { console.log('rom loaded') })
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/Tetris+(World)+(Rev+A).gb',()=>{console.log('rom loaded')})
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/instr_timing.gb',()=>{console.log('rom loaded')})
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus1.gb',()=>{console.log('rom loaded')})
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/01-special.gb', () => { console.log('rom loaded') })
    // emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/mem_timing.gb', () => { console.log('rom loaded') })
    emu.mmu.load_rom_ajax('https://static-host000.s3.amazonaws.com/opus2.gb', () => { console.log('rom loaded') })
    
    window.onkeydown = (e) => emu.joypad.keydown(e);
    window.onkeyup = (e) => emu.joypad.keyup(e);
};
