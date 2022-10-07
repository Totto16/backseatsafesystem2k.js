import * as Instruction from "./builtins/Instruction"
import { Register } from "./processor"
import * as Byte from "./builtins/Byte"
import * as Word from "./builtins/Word"
import * as HalfWord from "./builtins/HalfWord"
import { Address } from "./address_constants"
import { u64, u8, u32 } from "./builtins/types"
import { assert } from "../src/builtins/utils"

// TODO check this:
// as far as I understand an Instruction u64 can be this:

// opcode : u16
// all possible registers, each u8
// immediate , source_address or target_address - u32

// assert that not more then 64 bytes are possible

export class OpCode<T extends OpCodeNames = OpCodeNames> {
    private instruction: Instruction.Instruction
    name: T
    parsedInstruction: OpCodeBasics & {
        [key in keyof OPCodeExtendedDefinitions[T]["types"]["registers"]]: u8
    } & {
        [key in keyof OPCodeExtendedDefinitions[T]["types"]["rest"]]: u32
    }

    constructor(instruction: Instruction.Instruction) {
        const {name, parsedInstruction} = this.parseInstruction(instruction)
        this.instruction = instruction
        this.parsedInstruction = parsedInstruction;
        this.name = name;
    }

    static getNameByInstruction<T extends OpCodeNames = OpCodeNames>(
        instruction: Instruction.Instruction
    ): T {
        const [code] = Instruction.asHalfWords(instruction) as [
            OPCodeDefinitions[T]["opCode"],
            ...any
        ]

        const value = (opMap as OpMap<T>)[code]
        if (value === undefined) {
            throw new Error(
                `Instruction ${Instruction.toHexString(
                    value
                )} with OpCode ${Byte.toHexString([
                    code,
                ])} = ${code} is not a valid OPCode`
            )
        }

        return value
    }

    parseInstruction(instruction : Instruction.Instruction)  {
        const name = OpCode.getNameByInstruction<T>(instruction)

        const {
            opCode,
            cycles,
            registers,
            rest: restArray,
            increment,
        } = opDefinitions[name]

        const rest = restArray.length === 1 ? restArray[0] : undefined

        const actualBits =
            HalfWord.bits +
            registers.length * Byte.bits +
            (rest !== undefined ? Word.bits : 0)
        assert(
            actualBits <= Instruction.bits,
            true,
            `OPCode is wrongfully formatted, it can only hold ${Instruction.bits} bits, but holds ${actualBits} bits!`
        )

        const [, , ...bytes] = Instruction.toBEBytes(instruction)

        const parsedRegisters = registers.reduce((acc, name, index) => {
            return { ...acc, [name]: bytes[index] }
        }, {})

        const [, word] = Instruction.asWords(instruction)
        const parsedRest =
            rest === undefined
                ? {}
                : {
                    [rest]: word,
                }

        
        const parsedInstruction = {
            opCode,
            cycles,
            increment,
            ...parsedRest,
            ...parsedRegisters,
        } as OpCodeBasics & {
            [key in keyof OPCodeExtendedDefinitions[T]["types"]["registers"]]: u8
        } & {
            [key in keyof OPCodeExtendedDefinitions[T]["types"]["rest"]]: u32
        }

        return {name, parsedInstruction}
    }

    asInstruction(): Instruction.Instruction {
        return this.instruction
    }

    static fromInstruction(instruction: Instruction.Instruction): OpCode {
        return new OpCode(instruction)
    }

    getNumCycles(): u64 {
        return this.parsedInstruction.cycles
    }

    shouldIncrementInstructionPointer(): boolean {
        return this.parsedInstruction.increment
    }
}

export type OpMap<T extends OpCodeNames = OpCodeNames> = {
    [key in OPCodeDefinitions[T]["opCode"]]: T
}

// export type OpCodeNames = keyof typeof opDefinitions

export interface OpCodeBasics {
    cycles: u64
    opCode: number
    increment: boolean
}

export type OPCodeBasicDefinition = {
    [key in OpCodeNames]: OpCodeBasics
}

export type OPCodeDefinitions = OPCodeBasicDefinition & {
    [key in OpCodeNames]: {
        registers: string[]
        rest: string[]
    }
}

export type OPStubTypes = {
    [key in OpCodeNames]: {
        types: {
            rest: {
                [key: string]: any
            }
            [key: string]: any
        }
    }
}

export type OPCodeExtendedDefinitions = OPCodeDefinitions & OPStubTypes

export type RegisterType = "immediate" | "source_address" | "target_address"

// TODO: understand rust macros FULLY

export function typeToAbbreviation(type: RegisterType): string {
    switch (type) {
        case "immediate":
            return "cccc\u{00a0}cccc"

        case "immediate":
            return "aaaa\u{00a0}aaaa"
        case "immediate":
            return "aaaa\u{00a0}aaaa"
        default:
            throw Error("unreachable")
            break
    }
}

export function typeToDatatype(type: RegisterType): string {
    switch (type) {
        case "immediate":
            return "Word"

        case "immediate":
            return "Address"
        case "immediate":
            return "Address"
        default:
            throw Error("unreachable")
            break
    }
}
