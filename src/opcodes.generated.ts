import * as Instruction from "./builtins/Instruction"
import * as Byte from "./builtins/Byte"
import * as Word from "./builtins/Word"
import * as HalfWord from "./builtins/HalfWord"
import { u64, u8, u32 } from "./builtins/types"
import { assert } from "../src/builtins/utils"

// TODO check this:
// as far as I understand an Instruction u64 can be this:

// opcode : u16
// all possible registers, each u8
// immediate , source_address or target_address - u32



export type ParsedInstruction<T extends OpCodeNames> = OpCodeBasics & ParsedRegister<T> & ParsedRest<T>


export type ParsedRegister<T extends OpCodeNames> = {
    [key in keyof typeof opDefinitions[T]["types"]["registers"]]: u8
} 

export type ParsedRest<T extends OpCodeNames> = {
    [key in keyof typeof opDefinitions[T]["types"]["rest"]]: u32
}

export interface ParserResult<T extends OpCodeNames> {
    name: T
    parsedInstruction: ParsedInstruction<T>
}


export class OpCode<T extends OpCodeNames = OpCodeNames> {
    private instruction: Instruction.Instruction
    name: T
    parsedInstruction:ParsedInstruction<T>

    constructor(instruction: Instruction.Instruction) {
        console.debug(`Now parsing instruction: ${Instruction.toHexString(instruction)}`)
        const {name, parsedInstruction} = this.parseInstruction(instruction)
        this.instruction = instruction
        this.parsedInstruction = parsedInstruction;
        this.name = name;
        console.debug("Parsed Instruction: ", this);
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

    parseInstruction(instruction : Instruction.Instruction): ParserResult<T>   {
        const name = OpCode.getNameByInstruction<T>(instruction)

        const {
            opCode,
            cycles,
            registers,
            rest,
            increment,
        } = opDefinitions[name] as (typeof opDefinitions[T]) & {rest?:string}

        const actualBits =
            HalfWord.bits +
            registers.length * Byte.bits +
            (rest === undefined ? 0 : Word.bits)
        assert(
            actualBits <= Instruction.bits,
            true,
            `OPCode is wrongfully formatted, it can only hold ${Instruction.bits} bits, but holds ${actualBits} bits!`
        )

        const [, , ...bytes] = Instruction.toBEBytes(instruction)

        const parsedRegisters : ParsedRegister<T> = (registers as (ParsedRegister<T>[keyof ParsedRegister<T>])[]).reduce<ParsedRegister<T>>(
            (acc, name, index) => {
            return { ...acc, [name]: bytes[index] }
        }, <ParsedRegister<T>>{})

        const [, word] = Instruction.asWords(instruction)
        const parsedRest : ParsedRest<T>  =
            (rest === undefined
                ? {} 
                : {
                    [rest]: word,
                })as ParsedRest<T>

        
        const parsedInstruction  : ParsedInstruction<T>  = {
            opCode,
            cycles,
            increment,
            ...parsedRest,
            ...parsedRegisters,
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


export type OpCodeNames  = "MoveRegisterImmediate" | "MoveRegisterAddress" | "MoveTargetSource" | "MoveAddressRegister" | "MoveTargetPointer" | "MovePointerSource" | "MoveByteRegisterAddress" | "MoveByteAddressRegister" | "MoveByteTargetPointer" | "MoveBytePointerSource" | "MoveHalfwordRegisterAddress" | "MoveHalfwordAddressRegister" | "MoveHalfwordTargetPointer" | "MoveHalfwordPointerSource" | "MovePointerSourceOffset" | "MoveBytePointerSourceOffset" | "MoveHalfwordPointerSourceOffset" | "MoveTargetPointerOffset" | "MoveByteTargetPointerOffset" | "MoveHalfwordTargetPointerOffset" | "HaltAndCatchFire" | "AddTargetLhsRhs" | "AddWithCarryTargetLhsRhs" | "SubtractTargetLhsRhs" | "SubtractWithCarryTargetLhsRhs" | "MultiplyHighLowLhsRhs" | "DivmodTargetModLhsRhs" | "AndTargetLhsRhs" | "OrTargetLhsRhs" | "XorTargetLhsRhs" | "NotTargetSource" | "LeftShiftTargetLhsRhs" | "RightShiftTargetLhsRhs" | "AddTargetSourceImmediate" | "SubtractTargetSourceImmediate" | "CompareTargetLhsRhs" | "BoolCompareEquals" | "BoolCompareNotEquals" | "BoolCompareGreater" | "BoolCompareGreaterOrEquals" | "BoolCompareLess" | "BoolCompareLessOrEquals" | "PushRegister" | "PushImmediate" | "PopRegister" | "Pop" | "CallAddress" | "CallRegister" | "CallPointer" | "Return" | "JumpImmediate" | "JumpRegister" | "JumpImmediateIfEqual" | "JumpImmediateIfGreaterThan" | "JumpImmediateIfLessThan" | "JumpImmediateIfGreaterThanOrEqual" | "JumpImmediateIfLessThanOrEqual" | "JumpImmediateIfZero" | "JumpImmediateIfNotZero" | "JumpImmediateIfCarry" | "JumpImmediateIfNotCarry" | "JumpImmediateIfDivideByZero" | "JumpImmediateIfNotDivideByZero" | "JumpRegisterIfEqual" | "JumpRegisterIfGreaterThan" | "JumpRegisterIfLessThan" | "JumpRegisterIfGreaterThanOrEqual" | "JumpRegisterIfLessThanOrEqual" | "JumpRegisterIfZero" | "JumpRegisterIfNotZero" | "JumpRegisterIfCarry" | "JumpRegisterIfNotCarry" | "JumpRegisterIfDivideByZero" | "JumpRegisterIfNotDivideByZero" | "NoOp" | "GetKeyState" | "PollTime" | "SwapFramebuffers" | "InvisibleFramebufferAddress" | "PollCycleCountHighLow" | "DumpRegisters" | "DumpMemory" | "AssertRegisterRegister" | "AssertRegisterImmediate" | "AssertPointerImmediate" | "DebugBreak" | "PrintRegister" | "Checkpoint" ;

export const opDefinitions = {/**
* @description move the value C into register R
*/
MoveRegisterImmediate : {
cycles : 1n,
opCode : 0,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the value at address A into register R
*/
MoveRegisterAddress : {
cycles : 1n,
opCode : 1,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"source_address":"stub"}},
rest : "source_address"
},
/**
* @description move the contents of register S into register T
*/
MoveTargetSource : {
cycles : 1n,
opCode : 2,
increment : true,
registers : ["target","source"],
types : {"registers":{"target":"stub","source":"stub"},"rest":{}}
},
/**
* @description move the contents of register R into memory at address A
*/
MoveAddressRegister : {
cycles : 1n,
opCode : 3,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"target_address":"stub"}},
rest : "target_address"
},
/**
* @description move the contents addressed by the value of register P into register T
*/
MoveTargetPointer : {
cycles : 1n,
opCode : 4,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{}}
},
/**
* @description move the contents of register S into memory at address specified by register P
*/
MovePointerSource : {
cycles : 1n,
opCode : 5,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{}}
},
/**
* @description move the value at address A into register R (1 byte)
*/
MoveByteRegisterAddress : {
cycles : 1n,
opCode : 65,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"source_address":"stub"}},
rest : "source_address"
},
/**
* @description move the contents of register R into memory at address A (1 byte)
*/
MoveByteAddressRegister : {
cycles : 1n,
opCode : 66,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"target_address":"stub"}},
rest : "target_address"
},
/**
* @description move the contents addressed by the value of register P into register T (1 byte)
*/
MoveByteTargetPointer : {
cycles : 1n,
opCode : 67,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{}}
},
/**
* @description move the contents of register S into memory at address specified by register P (1 byte)
*/
MoveBytePointerSource : {
cycles : 1n,
opCode : 68,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{}}
},
/**
* @description move the value at address A into register R (2 bytes)
*/
MoveHalfwordRegisterAddress : {
cycles : 1n,
opCode : 69,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"source_address":"stub"}},
rest : "source_address"
},
/**
* @description move the contents of register R into memory at address A (2 bytes)
*/
MoveHalfwordAddressRegister : {
cycles : 1n,
opCode : 70,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{"target_address":"stub"}},
rest : "target_address"
},
/**
* @description move the contents addressed by the value of register P into register T (2 bytes)
*/
MoveHalfwordTargetPointer : {
cycles : 1n,
opCode : 71,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{}}
},
/**
* @description move the contents of register S into memory at address specified by register P (2 bytes)
*/
MoveHalfwordPointerSource : {
cycles : 1n,
opCode : 72,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{}}
},
/**
* @description move the value in register S into memory at address pointer + immediate
*/
MovePointerSourceOffset : {
cycles : 1n,
opCode : 73,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the value in register S into memory at address pointer + immediate (1 byte)
*/
MoveBytePointerSourceOffset : {
cycles : 1n,
opCode : 74,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the value in register S into memory at address pointer + immediate (2 bytes)
*/
MoveHalfwordPointerSourceOffset : {
cycles : 1n,
opCode : 75,
increment : true,
registers : ["pointer","source"],
types : {"registers":{"pointer":"stub","source":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveTargetPointerOffset : {
cycles : 1n,
opCode : 76,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveByteTargetPointerOffset : {
cycles : 1n,
opCode : 77,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveHalfwordTargetPointerOffset : {
cycles : 1n,
opCode : 78,
increment : true,
registers : ["target","pointer"],
types : {"registers":{"target":"stub","pointer":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description halt and catch fire
*/
HaltAndCatchFire : {
cycles : 1n,
opCode : 6,
increment : false,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description add the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
AddTargetLhsRhs : {
cycles : 1n,
opCode : 7,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description add (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
AddWithCarryTargetLhsRhs : {
cycles : 1n,
opCode : 52,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description subtract (without carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
SubtractTargetLhsRhs : {
cycles : 1n,
opCode : 8,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description subtract (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
SubtractWithCarryTargetLhsRhs : {
cycles : 1n,
opCode : 9,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description multiply the values in registers L and R, store the low part of the result in T, the high part in H, set zero and carry flags appropriately
*/
MultiplyHighLowLhsRhs : {
cycles : 1n,
opCode : 10,
increment : true,
registers : ["high","low","lhs","rhs"],
types : {"registers":{"high":"stub","low":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description divmod the values in registers L and R, store the result in D and the remainder in M set zero and divide-by-zero flags appropriately
*/
DivmodTargetModLhsRhs : {
cycles : 1n,
opCode : 11,
increment : true,
registers : ["result","remainder","lhs","rhs"],
types : {"registers":{"result":"stub","remainder":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description and the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
AndTargetLhsRhs : {
cycles : 1n,
opCode : 12,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description or the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
OrTargetLhsRhs : {
cycles : 1n,
opCode : 13,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description xor the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
XorTargetLhsRhs : {
cycles : 1n,
opCode : 14,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description not the value in register SS, store the result in TT, set zero flag appropriately
*/
NotTargetSource : {
cycles : 1n,
opCode : 15,
increment : true,
registers : ["target","source"],
types : {"registers":{"target":"stub","source":"stub"},"rest":{}}
},
/**
* @description left shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately
*/
LeftShiftTargetLhsRhs : {
cycles : 1n,
opCode : 16,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description right shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately
*/
RightShiftTargetLhsRhs : {
cycles : 1n,
opCode : 17,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description add the constant CC to the value in register SS and store the result in TT, set zero and carry flags appropriately
*/
AddTargetSourceImmediate : {
cycles : 1n,
opCode : 18,
increment : true,
registers : ["target","source"],
types : {"registers":{"target":"stub","source":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description subtract the constant CC from the value in register SS and store the result in TT, set zero and carry flags appropriately
*/
SubtractTargetSourceImmediate : {
cycles : 1n,
opCode : 19,
increment : true,
registers : ["target","source"],
types : {"registers":{"target":"stub","source":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description compare the values in registers LL and RR, store the result (Word::MAX, 0, 1) in TT, set zero flag appropriately
*/
CompareTargetLhsRhs : {
cycles : 1n,
opCode : 20,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the values in registers L and R are equal and stores the result as boolean (0 or 1) in T
*/
BoolCompareEquals : {
cycles : 1n,
opCode : 58,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the values in registers L and R are not equal and stores the result as boolean (0 or 1) in T
*/
BoolCompareNotEquals : {
cycles : 1n,
opCode : 59,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the value in registers L is greater than the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareGreater : {
cycles : 1n,
opCode : 60,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the value in registers L is greater than or equals the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareGreaterOrEquals : {
cycles : 1n,
opCode : 61,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the value in registers L is less than the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareLess : {
cycles : 1n,
opCode : 62,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description checks whether the value in registers L is less than or equals the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareLessOrEquals : {
cycles : 1n,
opCode : 63,
increment : true,
registers : ["target","lhs","rhs"],
types : {"registers":{"target":"stub","lhs":"stub","rhs":"stub"},"rest":{}}
},
/**
* @description pushes the value of register RR onto the stack
*/
PushRegister : {
cycles : 1n,
opCode : 21,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{}}
},
/**
* @description pushes the immediate value onto the stack
*/
PushImmediate : {
cycles : 1n,
opCode : 79,
increment : true,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description pops from the stack and stores the value in register RR
*/
PopRegister : {
cycles : 1n,
opCode : 22,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{}}
},
/**
* @description pops from the stack and discards the value
*/
Pop : {
cycles : 1n,
opCode : 64,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description push the current instruction pointer onto the stack and jump to the specified address
*/
CallAddress : {
cycles : 1n,
opCode : 23,
increment : false,
registers : [],
types : {"registers":{},"rest":{"source_address":"stub"}},
rest : "source_address"
},
/**
* @description push the current instruction pointer onto the stack and jump to the address stored in register R
*/
CallRegister : {
cycles : 1n,
opCode : 54,
increment : false,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{}}
},
/**
* @description push the current instruction pointer onto the stack and jump to the address stored in memory at the location specified by the value in register P
*/
CallPointer : {
cycles : 1n,
opCode : 55,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description pop the return address from the stack and jump to it
*/
Return : {
cycles : 1n,
opCode : 24,
increment : false,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description jump to the given address
*/
JumpImmediate : {
cycles : 1n,
opCode : 25,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the address stored in register R
*/
JumpRegister : {
cycles : 1n,
opCode : 26,
increment : false,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{}}
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"equality\"
*/
JumpImmediateIfEqual : {
cycles : 1n,
opCode : 27,
increment : false,
registers : ["comparison"],
types : {"registers":{"comparison":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"greater than\"
*/
JumpImmediateIfGreaterThan : {
cycles : 1n,
opCode : 28,
increment : false,
registers : ["comparison"],
types : {"registers":{"comparison":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"less than\"
*/
JumpImmediateIfLessThan : {
cycles : 1n,
opCode : 29,
increment : false,
registers : ["comparison"],
types : {"registers":{"comparison":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"greater than\" or \"equal\"
*/
JumpImmediateIfGreaterThanOrEqual : {
cycles : 1n,
opCode : 30,
increment : false,
registers : ["comparison"],
types : {"registers":{"comparison":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"less than\" or \"equal\"
*/
JumpImmediateIfLessThanOrEqual : {
cycles : 1n,
opCode : 31,
increment : false,
registers : ["comparison"],
types : {"registers":{"comparison":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the zero flag is set
*/
JumpImmediateIfZero : {
cycles : 1n,
opCode : 32,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the zero flag is not set
*/
JumpImmediateIfNotZero : {
cycles : 1n,
opCode : 33,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the carry flag is set
*/
JumpImmediateIfCarry : {
cycles : 1n,
opCode : 34,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the carry flag is not set
*/
JumpImmediateIfNotCarry : {
cycles : 1n,
opCode : 35,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the divide by zero flag is set
*/
JumpImmediateIfDivideByZero : {
cycles : 1n,
opCode : 36,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the specified address if the divide by zero flag is not set
*/
JumpImmediateIfNotDivideByZero : {
cycles : 1n,
opCode : 37,
increment : false,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"equality\"
*/
JumpRegisterIfEqual : {
cycles : 1n,
opCode : 38,
increment : false,
registers : ["pointer","comparison"],
types : {"registers":{"pointer":"stub","comparison":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"greater than\"
*/
JumpRegisterIfGreaterThan : {
cycles : 1n,
opCode : 39,
increment : false,
registers : ["pointer","comparison"],
types : {"registers":{"pointer":"stub","comparison":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"less than\"
*/
JumpRegisterIfLessThan : {
cycles : 1n,
opCode : 40,
increment : false,
registers : ["pointer","comparison"],
types : {"registers":{"pointer":"stub","comparison":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"greater than\" or \"equal\"
*/
JumpRegisterIfGreaterThanOrEqual : {
cycles : 1n,
opCode : 41,
increment : false,
registers : ["pointer","comparison"],
types : {"registers":{"pointer":"stub","comparison":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"less than\" or \"equal\"
*/
JumpRegisterIfLessThanOrEqual : {
cycles : 1n,
opCode : 42,
increment : false,
registers : ["pointer","comparison"],
types : {"registers":{"pointer":"stub","comparison":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the zero flag is set
*/
JumpRegisterIfZero : {
cycles : 1n,
opCode : 43,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the zero flag is not set
*/
JumpRegisterIfNotZero : {
cycles : 1n,
opCode : 44,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the carry flag is set
*/
JumpRegisterIfCarry : {
cycles : 1n,
opCode : 45,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the carry flag is not set
*/
JumpRegisterIfNotCarry : {
cycles : 1n,
opCode : 46,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the divide by zero flag is set
*/
JumpRegisterIfDivideByZero : {
cycles : 1n,
opCode : 47,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description jump to the address specified in register P if the divide by zero flag is not set
*/
JumpRegisterIfNotDivideByZero : {
cycles : 1n,
opCode : 48,
increment : false,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{}}
},
/**
* @description does nothing
*/
NoOp : {
cycles : 1n,
opCode : 49,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description store the keystate (1 = held down, 0 = not held down) of the key specified by register K into register T and set the zero flag appropriately
*/
GetKeyState : {
cycles : 1n,
opCode : 50,
increment : true,
registers : ["target","keycode"],
types : {"registers":{"target":"stub","keycode":"stub"},"rest":{}}
},
/**
* @description store the number of milliseconds since the UNIX epoch into registers high and low
*/
PollTime : {
cycles : 1n,
opCode : 51,
increment : true,
registers : ["high","low"],
types : {"registers":{"high":"stub","low":"stub"},"rest":{}}
},
/**
* @description swap the display buffers
*/
SwapFramebuffers : {
cycles : 1n,
opCode : 53,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description get the start address of the framebuffer that's currently invisible (use the address to draw without tearing)
*/
InvisibleFramebufferAddress : {
cycles : 1n,
opCode : 56,
increment : true,
registers : ["target"],
types : {"registers":{"target":"stub"},"rest":{}}
},
/**
* @description store the current cycle (64 bit value) count into registers H and L (H: most significant bytes, L: least significant bytes)
*/
PollCycleCountHighLow : {
cycles : 1n,
opCode : 57,
increment : true,
registers : ["high","low"],
types : {"registers":{"high":"stub","low":"stub"},"rest":{}}
},
/**
* @description dump the contents of all registers into the file 'registers_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number
*/
DumpRegisters : {
cycles : 1n,
opCode : 65535,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description dump the contents of the whole memory into the file 'memory_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number
*/
DumpMemory : {
cycles : 1n,
opCode : 65534,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description assert that the expected register value equals the actual register value (behavior of the VM on a failed assertion is implementation defined)
*/
AssertRegisterRegister : {
cycles : 1n,
opCode : 65533,
increment : true,
registers : ["expected","actual"],
types : {"registers":{"expected":"stub","actual":"stub"},"rest":{}}
},
/**
* @description assert that the actual register value equals the immediate (behavior of the VM on a failed assertion is implementation defined)
*/
AssertRegisterImmediate : {
cycles : 1n,
opCode : 65532,
increment : true,
registers : ["actual"],
types : {"registers":{"actual":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description assert that the value in memory pointed at by P equals the immediate (behavior of the VM on a failed assertion is implementation defined)
*/
AssertPointerImmediate : {
cycles : 1n,
opCode : 65531,
increment : true,
registers : ["pointer"],
types : {"registers":{"pointer":"stub"},"rest":{"immediate":"stub"}},
rest : "immediate"
},
/**
* @description behavior is implementation defined
*/
DebugBreak : {
cycles : 1n,
opCode : 65530,
increment : true,
registers : [],
types : {"registers":{},"rest":{}}
},
/**
* @description prints the value of the register as debug output
*/
PrintRegister : {
cycles : 1n,
opCode : 65529,
increment : true,
registers : ["register"],
types : {"registers":{"register":"stub"},"rest":{}}
},
/**
* @description makes the emulator check the value of the internal checkpoint counter, fails on mismatch
*/
Checkpoint : {
cycles : 1n,
opCode : 65528,
increment : true,
registers : [],
types : {"registers":{},"rest":{"immediate":"stub"}},
rest : "immediate"
}}

export const opMap : OpMap = {0: "MoveRegisterImmediate",
1: "MoveRegisterAddress",
2: "MoveTargetSource",
3: "MoveAddressRegister",
4: "MoveTargetPointer",
5: "MovePointerSource",
65: "MoveByteRegisterAddress",
66: "MoveByteAddressRegister",
67: "MoveByteTargetPointer",
68: "MoveBytePointerSource",
69: "MoveHalfwordRegisterAddress",
70: "MoveHalfwordAddressRegister",
71: "MoveHalfwordTargetPointer",
72: "MoveHalfwordPointerSource",
73: "MovePointerSourceOffset",
74: "MoveBytePointerSourceOffset",
75: "MoveHalfwordPointerSourceOffset",
76: "MoveTargetPointerOffset",
77: "MoveByteTargetPointerOffset",
78: "MoveHalfwordTargetPointerOffset",
6: "HaltAndCatchFire",
7: "AddTargetLhsRhs",
52: "AddWithCarryTargetLhsRhs",
8: "SubtractTargetLhsRhs",
9: "SubtractWithCarryTargetLhsRhs",
10: "MultiplyHighLowLhsRhs",
11: "DivmodTargetModLhsRhs",
12: "AndTargetLhsRhs",
13: "OrTargetLhsRhs",
14: "XorTargetLhsRhs",
15: "NotTargetSource",
16: "LeftShiftTargetLhsRhs",
17: "RightShiftTargetLhsRhs",
18: "AddTargetSourceImmediate",
19: "SubtractTargetSourceImmediate",
20: "CompareTargetLhsRhs",
58: "BoolCompareEquals",
59: "BoolCompareNotEquals",
60: "BoolCompareGreater",
61: "BoolCompareGreaterOrEquals",
62: "BoolCompareLess",
63: "BoolCompareLessOrEquals",
21: "PushRegister",
79: "PushImmediate",
22: "PopRegister",
64: "Pop",
23: "CallAddress",
54: "CallRegister",
55: "CallPointer",
24: "Return",
25: "JumpImmediate",
26: "JumpRegister",
27: "JumpImmediateIfEqual",
28: "JumpImmediateIfGreaterThan",
29: "JumpImmediateIfLessThan",
30: "JumpImmediateIfGreaterThanOrEqual",
31: "JumpImmediateIfLessThanOrEqual",
32: "JumpImmediateIfZero",
33: "JumpImmediateIfNotZero",
34: "JumpImmediateIfCarry",
35: "JumpImmediateIfNotCarry",
36: "JumpImmediateIfDivideByZero",
37: "JumpImmediateIfNotDivideByZero",
38: "JumpRegisterIfEqual",
39: "JumpRegisterIfGreaterThan",
40: "JumpRegisterIfLessThan",
41: "JumpRegisterIfGreaterThanOrEqual",
42: "JumpRegisterIfLessThanOrEqual",
43: "JumpRegisterIfZero",
44: "JumpRegisterIfNotZero",
45: "JumpRegisterIfCarry",
46: "JumpRegisterIfNotCarry",
47: "JumpRegisterIfDivideByZero",
48: "JumpRegisterIfNotDivideByZero",
49: "NoOp",
50: "GetKeyState",
51: "PollTime",
53: "SwapFramebuffers",
56: "InvisibleFramebufferAddress",
57: "PollCycleCountHighLow",
65535: "DumpRegisters",
65534: "DumpMemory",
65533: "AssertRegisterRegister",
65532: "AssertRegisterImmediate",
65531: "AssertPointerImmediate",
65530: "DebugBreak",
65529: "PrintRegister",
65528: "Checkpoint"}