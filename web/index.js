import ngb from '../src/ngb';

let emu = new ngb();
let running = false

window.onload = function () {
    window.emu = emu
    emu.GPU.connect_canvas(document.getElementById('screen'))

    document.getElementById('run_button').onclick = () => run()
    document.getElementById('reset_button').onclick = () => reset()

    window.onkeydown = (e) => emu.JOYPAD.keydown(e);
    window.onkeyup = (e) => emu.JOYPAD.keyup(e);


    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Super+Mario+Land+(JUE)+(V1.1)+%5B!%5D.gb', () => { console.log('rom loaded');emu.run() })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pokemon+Red+(UE)+%5BS%5D%5B!%5D.gb', () => { console.log('rom loaded');emu.run() })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Pac-Man+(U)+(Namco).gb', () => { console.log('rom loaded');emu.run() })
    // emu.MMU.load_rom_ajax('https://static-host000.s3.amazonaws.com/Hoshi no Kirby (Japan).gb', () => { console.log('rom loaded');emu.run() })

}

function reset () {
    emu.reset()
    emu.GPU.connect_canvas(document.getElementById('screen'))
}

function run () {
    if (running) reset()

    let romUri = document.getElementById('rom').value

    emu.MMU.load_rom_ajax(romUri, () => {
        console.log('rom loaded');
        running = true
        emu.run()
    })

}