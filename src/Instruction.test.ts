import * as Instruction from "./builtins/Instruction"
import { u64 } from "./builtins/types"
import { OpCode, OpCodeNames, ParsedInstruction } from "./opcodes.generated"

function instructionFromArray(values: number[]): u64 {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE)
    )

    expect(values.length).toStrictEqual(Instruction.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    const instruction = Instruction.fromBEBytes(array)
    return instruction
}

function chunkString(str: string, length: number): string[] {
    const match = str.match(new RegExp(".{1," + length + "}", "g"))
    expect(match).not.toBeNull()

    return [...(match as RegExpMatchArray)]
}

function instructionFromHexString<T>(value: string): u64 {
    expect(value.substring(0, 2)).toBe("0x")
    expect(value.length).toBe(Instruction.SIZE * 2 + 2)
    const [,...array]: string[] = chunkString(value, 2)
    const values: number[] = array.map((num) => {
        const parsedNum = parseInt(num, 16)
        expect(parsedNum).not.toBeNaN()
        expect(Number.isInteger(parsedNum)).toBeTruthy()
        return parsedNum
    })
    expect(values.length).toBe(Instruction.SIZE)
    return instructionFromArray(values)
}

export type ExpectOpCodeObject<T extends OpCodeNames> = {
    [key in keyof ParsedInstruction<T>]: ParsedInstruction<T>[key]
}

function expectOpCode<T extends OpCodeNames>(
    opcode: OpCode<T>,
    obj: ExpectOpCodeObject<T>
) {
    Object.entries(obj).map(([key, value]) => {
        const message = `Expects OpCode['${key}'] is correct:`
        const resultObj = {
            key,
            value: opcode.parsedInstruction[key as keyof ExpectOpCodeObject<T>],
        }
        expect(resultObj).toStrictEqual({
            key,
            value,
        })
    })
}

test("Parsing 'AddTargetSourceImmediate' works as expected", () => {
    const instruction = instructionFromHexString("0x0012ffff00000000")

    const parsedInstruction: OpCode<"AddTargetSourceImmediate"> =
        OpCode.fromInstruction<"AddTargetSourceImmediate">(instruction)

    expect(parsedInstruction.name).toBe("AddTargetSourceImmediate")

    expectOpCode<"AddTargetSourceImmediate">(parsedInstruction, {
        immediate: 0,
        source: 255,
        target: 255,
        cycles: 1n,
        opCode: 18,
        increment: true,
    })
})
