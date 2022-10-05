import * as Byte from "./builtins/Byte"
import * as Word from "./builtins/Word"
import * as HalfWord from "./builtins/HalfWord"
import * as Instruction from "./builtins/Instruction"

import { Address } from "./address_constants"
import { OpCode } from "./opcodes.generated"

export type Tuple<A, B> = [A, B]

export class Memory {
    private _data: Uint8ClampedArray
    static SIZE: number = 16 * 1024 * 1024

    constructor() {
        this._data = new Uint8ClampedArray(Memory.SIZE)
    }

    get data(): Uint8ClampedArray {
        return this._data
    }

    readOpcode(address: Address): OpCode {
        console.assert(address % Instruction.SIZE == 0)
        let slice: Uint8ClampedArray = new Uint8ClampedArray(
            this._data.buffer,
            address,
            Instruction.SIZE
        )
        let instruction = Instruction.fromBEBytes(slice)
        return OpCode.fromInstruction(instruction)
    }

    readData(address: Address): Word.Word {
        console.assert(address % Word.SIZE == 0)
        let slice: Uint8ClampedArray = new Uint8ClampedArray(
            this._data.buffer,
            address,
            Word.SIZE
        )
        return Word.fromBEBytes(slice)
    }

    readHalfWord(address: Address): HalfWord.HalfWord {
        console.assert(address % HalfWord.SIZE == 0)
        let slice: Uint8ClampedArray = new Uint8ClampedArray(
            this._data.buffer,
            address,
            HalfWord.SIZE
        )
        return HalfWord.fromBEBytes(slice)
    }

    readByte(address: Address): Byte.Byte {
        let slice: Uint8ClampedArray = new Uint8ClampedArray(
            this._data.buffer,
            address,
            HalfWord.SIZE
        )
        return Byte.fromBEBytes(slice)
    }

    writeOpcode(address: Address, opcode: OpCode) {
        console.assert(address % Instruction.SIZE == 0)
        let instruction: Instruction.Instruction = opcode.asInstruction()
        Instruction.saveAsBEBytes(this._data, address, instruction)
    }

    writeData(address: Address, data: Word.Word) {
        console.assert(address % Instruction.SIZE == 0)
        console.assert(Word.isWord(data))
        Word.saveAsBEBytes(this._data, address, data)
    }

    writeHalfWord(address: Address, data: HalfWord.HalfWord) {
        console.assert(address % Instruction.SIZE == 0)
        console.assert(HalfWord.isHalfWord(data))
        HalfWord.saveAsBEBytes(this._data, address, data)
    }

    writeByte(address: Address, data: Byte.Byte) {
        console.assert(address % Instruction.SIZE == 0)
        console.assert(Byte.isByte(data))
        Byte.saveAsBEBytes(this._data, address, data)
    }
}
