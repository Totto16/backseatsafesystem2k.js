import * as Instruction from "./builtins/Instruction"
import { Register } from "./processor"

export class OpCode<T extends OpCodeNames = OpCodeNames> {
    private instruction: Instruction.Instruction
    name: T
    parsedInstruction: OPCodeDefinitions[T]

    constructor(instruction: Instruction.Instruction) {
        this.instruction = instruction
        //TODO parse everything !!
        this.name = "Test"
        this.parsedInstruction = {}
    }

    asInstruction(): Instruction.Instruction {
        return this.instruction
    }

    static fromInstruction(instruction: Instruction.Instruction): OpCode {
        return new OpCode(instruction)
    }

    getNumCycles(): number {
        return this.parsedInstruction.cycles
    }

    shouldIncrementInstructionPointer(): boolean {
        return this.parsedInstruction.increment
    }
}


export type OPCodeBasicDefinition = {
    [key in OpCodeNames]: {
    cycles: number
    opCode: number
    increment: boolean
    } & Record<string, any>
}


export type OPCodeDefinitions = typeof opDefinitions

export type OpCodeNames  = "MoveRegisterImmediate" | "MoveRegisterAddress" | "MoveTargetSource" | "MoveAddressRegister" | "MoveTargetPointer" | "MovePointerSource" | "MoveByteRegisterAddress" | "MoveByteAddressRegister" | "MoveByteTargetPointer" | "MoveBytePointerSource" | "MoveHalfwordRegisterAddress" | "MoveHalfwordAddressRegister" | "MoveHalfwordTargetPointer" | "MoveHalfwordPointerSource" | "MovePointerSourceOffset" | "MoveBytePointerSourceOffset" | "MoveHalfwordPointerSourceOffset" | "MoveTargetPointerOffset" | "MoveByteTargetPointerOffset" | "MoveHalfwordTargetPointerOffset" | "HaltAndCatchFire" | "AddTargetLhsRhs" | "AddWithCarryTargetLhsRhs" | "SubtractTargetLhsRhs" | "SubtractWithCarryTargetLhsRhs" | "MultiplyHighLowLhsRhs" | "DivmodTargetModLhsRhs" | "AndTargetLhsRhs" | "OrTargetLhsRhs" | "XorTargetLhsRhs" | "NotTargetSource" | "LeftShiftTargetLhsRhs" | "RightShiftTargetLhsRhs" | "AddTargetSourceImmediate" | "SubtractTargetSourceImmediate" | "CompareTargetLhsRhs" | "BoolCompareEquals" | "BoolCompareNotEquals" | "BoolCompareGreater" | "BoolCompareGreaterOrEquals" | "BoolCompareLess" | "BoolCompareLessOrEquals" | "PushRegister" | "PushImmediate" | "PopRegister" | "Pop" | "CallAddress" | "CallRegister" | "CallPointer" | "Return" | "JumpImmediate" | "JumpRegister" | "JumpImmediateIfEqual" | "JumpImmediateIfGreaterThan" | "JumpImmediateIfLessThan" | "JumpImmediateIfGreaterThanOrEqual" | "JumpImmediateIfLessThanOrEqual" | "JumpImmediateIfZero" | "JumpImmediateIfNotZero" | "JumpImmediateIfCarry" | "JumpImmediateIfNotCarry" | "JumpImmediateIfDivideByZero" | "JumpImmediateIfNotDivideByZero" | "JumpRegisterIfEqual" | "JumpRegisterIfGreaterThan" | "JumpRegisterIfLessThan" | "JumpRegisterIfGreaterThanOrEqual" | "JumpRegisterIfLessThanOrEqual" | "JumpRegisterIfZero" | "JumpRegisterIfNotZero" | "JumpRegisterIfCarry" | "JumpRegisterIfNotCarry" | "JumpRegisterIfDivideByZero" | "JumpRegisterIfNotDivideByZero" | "NoOp" | "GetKeyState" | "PollTime" | "SwapFramebuffers" | "InvisibleFramebufferAddress" | "PollCycleCountHighLow" | "DumpRegisters" | "DumpMemory" | "AssertRegisterRegister" | "AssertRegisterImmediate" | "AssertPointerImmediate" | "DebugBreak" | "PrintRegister" | "Checkpoint" ;

export const opDefinitions : OPCodeBasicDefinition = {/**
* @description move the value C into register R
*/
MoveRegisterImmediate : {
cycles : 1,
opCode : 0,
increment : true,
immediate : 2,
register : Register.fromLetter("R")
},
/**
* @description move the value at address A into register R
*/
MoveRegisterAddress : {
cycles : 1,
opCode : 1,
increment : true,
source_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents of register S into register T
*/
MoveTargetSource : {
cycles : 1,
opCode : 2,
increment : true,
target : Register.fromLetter("T"),
source : Register.fromLetter("S")
},
/**
* @description move the contents of register R into memory at address A
*/
MoveAddressRegister : {
cycles : 1,
opCode : 3,
increment : true,
target_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents addressed by the value of register P into register T
*/
MoveTargetPointer : {
cycles : 1,
opCode : 4,
increment : true,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description move the contents of register S into memory at address specified by register P
*/
MovePointerSource : {
cycles : 1,
opCode : 5,
increment : true,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the value at address A into register R (1 byte)
*/
MoveByteRegisterAddress : {
cycles : 1,
opCode : 65,
increment : true,
source_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents of register R into memory at address A (1 byte)
*/
MoveByteAddressRegister : {
cycles : 1,
opCode : 66,
increment : true,
target_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents addressed by the value of register P into register T (1 byte)
*/
MoveByteTargetPointer : {
cycles : 1,
opCode : 67,
increment : true,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description move the contents of register S into memory at address specified by register P (1 byte)
*/
MoveBytePointerSource : {
cycles : 1,
opCode : 68,
increment : true,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the value at address A into register R (2 bytes)
*/
MoveHalfwordRegisterAddress : {
cycles : 1,
opCode : 69,
increment : true,
source_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents of register R into memory at address A (2 bytes)
*/
MoveHalfwordAddressRegister : {
cycles : 1,
opCode : 70,
increment : true,
target_address : 2,
register : Register.fromLetter("R")
},
/**
* @description move the contents addressed by the value of register P into register T (2 bytes)
*/
MoveHalfwordTargetPointer : {
cycles : 1,
opCode : 71,
increment : true,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description move the contents of register S into memory at address specified by register P (2 bytes)
*/
MoveHalfwordPointerSource : {
cycles : 1,
opCode : 72,
increment : true,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the value in register S into memory at address pointer + immediate
*/
MovePointerSourceOffset : {
cycles : 1,
opCode : 73,
increment : true,
immediate : 2,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the value in register S into memory at address pointer + immediate (1 byte)
*/
MoveBytePointerSourceOffset : {
cycles : 1,
opCode : 74,
increment : true,
immediate : 2,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the value in register S into memory at address pointer + immediate (2 bytes)
*/
MoveHalfwordPointerSourceOffset : {
cycles : 1,
opCode : 75,
increment : true,
immediate : 2,
pointer : Register.fromLetter("P"),
source : Register.fromLetter("S")
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveTargetPointerOffset : {
cycles : 1,
opCode : 76,
increment : true,
immediate : 2,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveByteTargetPointerOffset : {
cycles : 1,
opCode : 77,
increment : true,
immediate : 2,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description move the contents addressed by the sum of the pointer and the immediate into the register T
*/
MoveHalfwordTargetPointerOffset : {
cycles : 1,
opCode : 78,
increment : true,
immediate : 2,
target : Register.fromLetter("T"),
pointer : Register.fromLetter("P")
},
/**
* @description halt and catch fire
*/
HaltAndCatchFire : {
cycles : 1,
opCode : 6,
increment : false
},
/**
* @description add the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
AddTargetLhsRhs : {
cycles : 1,
opCode : 7,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description add (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
AddWithCarryTargetLhsRhs : {
cycles : 1,
opCode : 52,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description subtract (without carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
SubtractTargetLhsRhs : {
cycles : 1,
opCode : 8,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description subtract (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately
*/
SubtractWithCarryTargetLhsRhs : {
cycles : 1,
opCode : 9,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description multiply the values in registers L and R, store the low part of the result in T, the high part in H, set zero and carry flags appropriately
*/
MultiplyHighLowLhsRhs : {
cycles : 1,
opCode : 10,
increment : true,
high : Register.fromLetter("H"),
low : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description divmod the values in registers L and R, store the result in D and the remainder in M set zero and divide-by-zero flags appropriately
*/
DivmodTargetModLhsRhs : {
cycles : 1,
opCode : 11,
increment : true,
result : Register.fromLetter("D"),
remainder : Register.fromLetter("M"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description and the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
AndTargetLhsRhs : {
cycles : 1,
opCode : 12,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description or the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
OrTargetLhsRhs : {
cycles : 1,
opCode : 13,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description xor the values in registers LL and RR, store the result in TT, set zero flag appropriately
*/
XorTargetLhsRhs : {
cycles : 1,
opCode : 14,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description not the value in register SS, store the result in TT, set zero flag appropriately
*/
NotTargetSource : {
cycles : 1,
opCode : 15,
increment : true,
target : Register.fromLetter("T"),
source : Register.fromLetter("S")
},
/**
* @description left shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately
*/
LeftShiftTargetLhsRhs : {
cycles : 1,
opCode : 16,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description right shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately
*/
RightShiftTargetLhsRhs : {
cycles : 1,
opCode : 17,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description add the constant CC to the value in register SS and store the result in TT, set zero and carry flags appropriately
*/
AddTargetSourceImmediate : {
cycles : 1,
opCode : 18,
increment : true,
immediate : 2,
target : Register.fromLetter("T"),
source : Register.fromLetter("S")
},
/**
* @description subtract the constant CC from the value in register SS and store the result in TT, set zero and carry flags appropriately
*/
SubtractTargetSourceImmediate : {
cycles : 1,
opCode : 19,
increment : true,
immediate : 2,
target : Register.fromLetter("T"),
source : Register.fromLetter("S")
},
/**
* @description compare the values in registers LL and RR, store the result (Word::MAX, 0, 1) in TT, set zero flag appropriately
*/
CompareTargetLhsRhs : {
cycles : 1,
opCode : 20,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the values in registers L and R are equal and stores the result as boolean (0 or 1) in T
*/
BoolCompareEquals : {
cycles : 1,
opCode : 58,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the values in registers L and R are not equal and stores the result as boolean (0 or 1) in T
*/
BoolCompareNotEquals : {
cycles : 1,
opCode : 59,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the value in registers L is greater than the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareGreater : {
cycles : 1,
opCode : 60,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the value in registers L is greater than or equals the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareGreaterOrEquals : {
cycles : 1,
opCode : 61,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the value in registers L is less than the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareLess : {
cycles : 1,
opCode : 62,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description checks whether the value in registers L is less than or equals the value in register R and stores the result as boolean (0 or 1) in T
*/
BoolCompareLessOrEquals : {
cycles : 1,
opCode : 63,
increment : true,
target : Register.fromLetter("T"),
lhs : Register.fromLetter("L"),
rhs : Register.fromLetter("R")
},
/**
* @description pushes the value of register RR onto the stack
*/
PushRegister : {
cycles : 1,
opCode : 21,
increment : true,
register : Register.fromLetter("R")
},
/**
* @description pushes the immediate value onto the stack
*/
PushImmediate : {
cycles : 1,
opCode : 79,
increment : true,
immediate : 2
},
/**
* @description pops from the stack and stores the value in register RR
*/
PopRegister : {
cycles : 1,
opCode : 22,
increment : true,
register : Register.fromLetter("R")
},
/**
* @description pops from the stack and discards the value
*/
Pop : {
cycles : 1,
opCode : 64,
increment : true
},
/**
* @description push the current instruction pointer onto the stack and jump to the specified address
*/
CallAddress : {
cycles : 1,
opCode : 23,
increment : false,
source_address : 2
},
/**
* @description push the current instruction pointer onto the stack and jump to the address stored in register R
*/
CallRegister : {
cycles : 1,
opCode : 54,
increment : false,
register : Register.fromLetter("R")
},
/**
* @description push the current instruction pointer onto the stack and jump to the address stored in memory at the location specified by the value in register P
*/
CallPointer : {
cycles : 1,
opCode : 55,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description pop the return address from the stack and jump to it
*/
Return : {
cycles : 1,
opCode : 24,
increment : false
},
/**
* @description jump to the given address
*/
JumpImmediate : {
cycles : 1,
opCode : 25,
increment : false,
immediate : 2
},
/**
* @description jump to the address stored in register R
*/
JumpRegister : {
cycles : 1,
opCode : 26,
increment : false,
register : Register.fromLetter("R")
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"equality\"
*/
JumpImmediateIfEqual : {
cycles : 1,
opCode : 27,
increment : false,
immediate : 2,
comparison : Register.fromLetter("C")
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"greater than\"
*/
JumpImmediateIfGreaterThan : {
cycles : 1,
opCode : 28,
increment : false,
immediate : 2,
comparison : Register.fromLetter("C")
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"less than\"
*/
JumpImmediateIfLessThan : {
cycles : 1,
opCode : 29,
increment : false,
immediate : 2,
comparison : Register.fromLetter("C")
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"greater than\" or \"equal\"
*/
JumpImmediateIfGreaterThanOrEqual : {
cycles : 1,
opCode : 30,
increment : false,
immediate : 2,
comparison : Register.fromLetter("C")
},
/**
* @description jump to the specified address if the comparison result in register C corresponds to \"less than\" or \"equal\"
*/
JumpImmediateIfLessThanOrEqual : {
cycles : 1,
opCode : 31,
increment : false,
immediate : 2,
comparison : Register.fromLetter("C")
},
/**
* @description jump to the specified address if the zero flag is set
*/
JumpImmediateIfZero : {
cycles : 1,
opCode : 32,
increment : false,
immediate : 2
},
/**
* @description jump to the specified address if the zero flag is not set
*/
JumpImmediateIfNotZero : {
cycles : 1,
opCode : 33,
increment : false,
immediate : 2
},
/**
* @description jump to the specified address if the carry flag is set
*/
JumpImmediateIfCarry : {
cycles : 1,
opCode : 34,
increment : false,
immediate : 2
},
/**
* @description jump to the specified address if the carry flag is not set
*/
JumpImmediateIfNotCarry : {
cycles : 1,
opCode : 35,
increment : false,
immediate : 2
},
/**
* @description jump to the specified address if the divide by zero flag is set
*/
JumpImmediateIfDivideByZero : {
cycles : 1,
opCode : 36,
increment : false,
immediate : 2
},
/**
* @description jump to the specified address if the divide by zero flag is not set
*/
JumpImmediateIfNotDivideByZero : {
cycles : 1,
opCode : 37,
increment : false,
immediate : 2
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"equality\"
*/
JumpRegisterIfEqual : {
cycles : 1,
opCode : 38,
increment : false,
pointer : Register.fromLetter("P"),
comparison : Register.fromLetter("C")
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"greater than\"
*/
JumpRegisterIfGreaterThan : {
cycles : 1,
opCode : 39,
increment : false,
pointer : Register.fromLetter("P"),
comparison : Register.fromLetter("C")
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"less than\"
*/
JumpRegisterIfLessThan : {
cycles : 1,
opCode : 40,
increment : false,
pointer : Register.fromLetter("P"),
comparison : Register.fromLetter("C")
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"greater than\" or \"equal\"
*/
JumpRegisterIfGreaterThanOrEqual : {
cycles : 1,
opCode : 41,
increment : false,
pointer : Register.fromLetter("P"),
comparison : Register.fromLetter("C")
},
/**
* @description jump to the address specified in register P if the comparison result in register C corresponds to \"less than\" or \"equal\"
*/
JumpRegisterIfLessThanOrEqual : {
cycles : 1,
opCode : 42,
increment : false,
pointer : Register.fromLetter("P"),
comparison : Register.fromLetter("C")
},
/**
* @description jump to the address specified in register P if the zero flag is set
*/
JumpRegisterIfZero : {
cycles : 1,
opCode : 43,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description jump to the address specified in register P if the zero flag is not set
*/
JumpRegisterIfNotZero : {
cycles : 1,
opCode : 44,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description jump to the address specified in register P if the carry flag is set
*/
JumpRegisterIfCarry : {
cycles : 1,
opCode : 45,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description jump to the address specified in register P if the carry flag is not set
*/
JumpRegisterIfNotCarry : {
cycles : 1,
opCode : 46,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description jump to the address specified in register P if the divide by zero flag is set
*/
JumpRegisterIfDivideByZero : {
cycles : 1,
opCode : 47,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description jump to the address specified in register P if the divide by zero flag is not set
*/
JumpRegisterIfNotDivideByZero : {
cycles : 1,
opCode : 48,
increment : false,
pointer : Register.fromLetter("P")
},
/**
* @description does nothing
*/
NoOp : {
cycles : 1,
opCode : 49,
increment : true
},
/**
* @description store the keystate (1 = held down, 0 = not held down) of the key specified by register K into register T and set the zero flag appropriately
*/
GetKeyState : {
cycles : 1,
opCode : 50,
increment : true,
target : Register.fromLetter("T"),
keycode : Register.fromLetter("K")
},
/**
* @description store the number of milliseconds since the UNIX epoch into registers high and low
*/
PollTime : {
cycles : 1,
opCode : 51,
increment : true,
high : Register.fromLetter("H"),
low : Register.fromLetter("L")
},
/**
* @description swap the display buffers
*/
SwapFramebuffers : {
cycles : 1,
opCode : 53,
increment : true
},
/**
* @description get the start address of the framebuffer that's currently invisible (use the address to draw without tearing)
*/
InvisibleFramebufferAddress : {
cycles : 1,
opCode : 56,
increment : true,
target : Register.fromLetter("T")
},
/**
* @description store the current cycle (64 bit value) count into registers H and L (H: most significant bytes, L: least significant bytes)
*/
PollCycleCountHighLow : {
cycles : 1,
opCode : 57,
increment : true,
high : Register.fromLetter("H"),
low : Register.fromLetter("L")
},
/**
* @description dump the contents of all registers into the file 'registers_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number
*/
DumpRegisters : {
cycles : 1,
opCode : 65535,
increment : true
},
/**
* @description dump the contents of the whole memory into the file 'memory_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number
*/
DumpMemory : {
cycles : 1,
opCode : 65534,
increment : true
},
/**
* @description assert that the expected register value equals the actual register value (behavior of the VM on a failed assertion is implementation defined)
*/
AssertRegisterRegister : {
cycles : 1,
opCode : 65533,
increment : true,
expected : Register.fromLetter("E"),
actual : Register.fromLetter("A")
},
/**
* @description assert that the actual register value equals the immediate (behavior of the VM on a failed assertion is implementation defined)
*/
AssertRegisterImmediate : {
cycles : 1,
opCode : 65532,
increment : true,
immediate : 2,
actual : Register.fromLetter("A")
},
/**
* @description assert that the value in memory pointed at by P equals the immediate (behavior of the VM on a failed assertion is implementation defined)
*/
AssertPointerImmediate : {
cycles : 1,
opCode : 65531,
increment : true,
immediate : 2,
pointer : Register.fromLetter("P")
},
/**
* @description behavior is implementation defined
*/
DebugBreak : {
cycles : 1,
opCode : 65530,
increment : true
},
/**
* @description prints the value of the register as debug output
*/
PrintRegister : {
cycles : 1,
opCode : 65529,
increment : true,
register : Register.fromLetter("R")
},
/**
* @description makes the emulator check the value of the internal checkpoint counter, fails on mismatch
*/
Checkpoint : {
cycles : 1,
opCode : 65528,
increment : true,
immediate : 2
}}