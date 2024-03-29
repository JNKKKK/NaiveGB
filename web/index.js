import ngb from '../src/ngb';

let emu = new ngb();
let running = false

window.onload = function () {
    window.emu = emu
    emu.GPU.connect_canvas(document.getElementById('screen'))

    document.getElementById('run_button').onclick = () => run()
    document.getElementById('reset_button').onclick = () => reset()
    document.getElementById('save_button').onclick = () => save()

    window.onkeydown = (e) => emu.JOYPAD.keydown(e);
    window.onkeyup = (e) => emu.JOYPAD.keyup(e);
}

function reset () {
    emu.reset()
    emu.GPU.connect_canvas(document.getElementById('screen'))
}

function save () {
    emu.MMU.saveERam()
}

function run () {
    if (running) reset()

    let romUri = document.getElementById('rom').value

    // romUri = 'https://static-host000.s3.amazonaws.com/games/Hoshi no Kirby (Japan).gb'
    // romUri = 'https://static-host000.s3.amazonaws.com/games/Super+Mario+Land+(JUE)+(V1.1)+%5B!%5D.gb'
    // romUri = 'https://static-host000.s3.amazonaws.com/games/Pac-Man+(U)+(Namco).gb'
    // romUri = 'https://static-host000.s3.amazonaws.com/games/Tetris (World) (Rev A).gb'
    // romUri = "https://static-host000.s3.amazonaws.com/games/Legend+of+Zelda%2C+The+-+Link's+Awakening+(U)+(V1.2)+%5B!%5D.gb"
    // romUri = "https://static-host000.s3.amazonaws.com/games/Super+Mario+Land+2+-+6+Golden+Coins+(UE)+(V1.2)+%5B!%5D.gb"
    // romUri = "https://static-host000.s3.amazonaws.com/games/Wario+Land+-+Super+Mario+Land+3+(World).gb"
    // romUri = "https://static-host000.s3.amazonaws.com/games/Kirby's+Dream+Land+(USA%2C+Europe).gb"
    // romUri = "https://static-host000.s3.amazonaws.com/games/Kirby's+Dream+Land+2+(USA%2C+Europe)+(SGB+Enhanced).gb"
    // romUri = "https://static-host000.s3.amazonaws.com/games/Donkey+Kong+Land+(USA%2C+Europe)+(SGB+Enhanced).gb"

    emu.MMU.load_rom_ajax(romUri, () => {
        console.log('rom loaded');
        running = true
        emu.run()
    })

}