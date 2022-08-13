import ngb from '../src/ngb'
import { checkGraphic, arrayHash, checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngb("headless-non-blocking");
emu.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/dmg_sound.gb')
emu.run()

let ans = -1585867104

it('Check graphic output', () => {
    expect.assertions(1);
    return expect(checkGraphic(38093967, emu, 5)).resolves.toEqual(ans);
});
