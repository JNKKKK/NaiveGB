import ngb from '../src/ngb'
import { checkGraphic, arrayHash, checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngb("headless-non-blocking");
emu.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/halt_bug.gb')
emu.run()

let ans = 1946644968

it('Check graphic output', () => {
    expect.assertions(1);
    return expect(checkGraphic(2075645, emu, 1)).resolves.toEqual(ans);
});
