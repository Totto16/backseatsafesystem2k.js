//use crate::{opcodes::Opcode, Address, Byte, Halfword, Instruction, Size, Word};

import * as Byte from "./builtins/Byte"
import * as Word from "./builtins/Word"
import * as HalfWord from "./builtins/HalfWord"
import * as Instruction from "./builtins/Instruction"

import { Address } from "./address_constants"
import { Opcode } from "./opcodes"

export type Tuple<A, B> = [A, B]

export class Memory {
    private data: Uint8Array
    static SIZE: number = 16 * 1024 * 1024

    constructor() {
        this.data = new Uint8Array(Memory.SIZE)
    }

    get getData() {
        return this.data
    }

    readOpcode(address: Address): Tuple<Opcode, Instruction.Instruction> {
        console.assert(address % Instruction.SIZE == 0)
        let slice: Uint8Array = new Uint8Array(
            this.data.buffer,
            address,
            Instruction.SIZE
        )
        let instruction = Instruction.fromBEBytes(slice)
        return [new Opcode().fromInstruction(instruction), instruction]
    }

    readData(address: Address): Word.Word {
        console.assert(address % Word.SIZE == 0)
        let slice: Uint8Array = new Uint8Array(
            this.data.buffer,
            address,
            Word.SIZE
        )
        return Word.fromBEBytes(slice)
    }

    readHalfWord(address: Address): HalfWord.HalfWord {
        console.assert(address % HalfWord.SIZE == 0)
        let slice: Uint8Array = new Uint8Array(
            this.data.buffer,
            address,
            HalfWord.SIZE
        )
        return HalfWord.fromBEBytes(slice)
    }

    readByte(address: Address): Byte.Byte {
        let slice: Uint8Array = new Uint8Array(
            this.data.buffer,
            address,
            HalfWord.SIZE
        )
        return Byte.fromBEBytes(slice)
    }

    writeOpcode(address: Address, opcode: Opcode) {
        console.assert(address % Instruction.SIZE == 0)
        let instruction: Instruction.Instruction = opcode.asInstruction()
        Instruction.saveAsBEBytes(this.data, address, instruction)
    }

    writeData(address: Address, data: Word.Word) {
        console.assert(address % Instruction.SIZE == 0)
        Word.saveAsBEBytes(this.data, address, data)
    }

    writeHalfWord(address: Address, data: HalfWord.HalfWord) {
        console.assert(address % Instruction.SIZE == 0)
        HalfWord.saveAsBEBytes(this.data, address, data)
    }

    writeByte(address: Address, data: Byte.Byte) {
        console.assert(address % Instruction.SIZE == 0)
        Byte.saveAsBEBytes(this.data, address, data)
    }
}

//TODO implement tests

/* 
#[cfg(test)]
mod tests {
    use crate::Register;

    use super::*;

    #[test]
    fn write_instruction_read_back() {
        let mut memory = Memory::new();
        let address = 0x0;
        let opcode = Opcode::MoveRegisterImmediate {
            register: Register(0),
            immediate: 42,
        };
        memory.write_opcode(address, opcode);
        assert_eq!(memory.read_opcode(address), Ok(opcode));
    }

    #[test]
    fn write_data_read_back() {
        let mut memory = Memory::new();
        let data = 0xFFFFFFFF;
        let address = 0x0;
        memory.write_data(address, data);
        assert_eq!(memory.read_data(address), data);
    }

    #[test]
    fn fill_memory_with_instructions_read_back() {
        let mut memory = Memory::new();

        // fill memory
        let opcode = Opcode::MoveRegisterImmediate {
            register: Register(0),
            immediate: 42,
        };
        for address in (0..Memory::SIZE).step_by(Instruction::SIZE) {
            memory.write_opcode(address as Address, opcode);
        }

        for address in (0..Memory::SIZE).step_by(Instruction::SIZE) {
            assert_eq!(memory.read_opcode(address as Address), Ok(opcode));
        }
    }

    #[test]
    fn fill_memory_with_data_read_back() {
        let mut memory = Memory::new();

        // fill memory
        let mut data = 0x0;
        for address in (0..Memory::SIZE).step_by(Word::SIZE) {
            memory.write_data(address as Address, data);
            data = data.wrapping_add(1);
        }

        // read back memory
        data = 0x0;
        for address in (0..Memory::SIZE).step_by(Word::SIZE) {
            assert_eq!(memory.read_data(address as Address), data);
            data = data.wrapping_add(1);
        }
    }
}
 */
