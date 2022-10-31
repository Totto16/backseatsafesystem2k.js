import * as Byte from "./Byte"
import * as Word from "./Word"
import * as HalfWord from "./HalfWord"
import { Address } from "../address_constants"
import { u64 } from "./types"

export const SIZE = 8

// js numbers aren't safe up to 2^64 alias u64,only up to 2^53 - 1, so here a BigInt has to be used!!
// Attention calculation with these numbers are slightly different!
export type Instruction = u64

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): Instruction {
    return BigInt.asUintN(
        64,
        new DataView(array.buffer, array.byteOffset, SIZE).getBigUint64(
            0,
            false
        )
    )
}

export function chunkString(str: string, length: number): string[] {
    const match = str.match(new RegExp(".{1," + length + "}", "g"))
    if (match === null) {
        throw new Error(`couldn't chunk string, this shouldn't occur!`)
    }

    return [...(match as RegExpMatchArray)]
}

export function saveAsBEBytes(
    array: Uint8ClampedArray,
    address: Address,
    value: Instruction
): void {
    const newArray: number[] = toBEBytes(value)

    for (let i = 0; i < SIZE; ++i) {
        if (newArray[i] > 255 || newArray[i] < 0) {
            throw new Error(`number out of range: Byte ${newArray[i]}`)
        }
        array[address + i] = newArray[i]
    }
}

export function asWords(value: Instruction): [Word.Word, Word.Word] {
    const binaryString = value.toString(2).padStart(bits, "0")
    return [
        binaryString.substring(0, Word.SIZE * Byte.bits),
        binaryString.substring(Word.SIZE * Byte.bits),
    ].map((a) => parseInt(a, 2)) as [Word.Word, Word.Word]
}

export function asHalfWords(value: Instruction): HalfWordBytes {
    const [upper, lower] = asWords(value).map((word) => Word.asHalfWords(word))
    const result = [...upper, ...lower] as HalfWordBytes
    return result
}

export function isInstruction(number: Instruction) {
    return number >= 0n && number < 1n << BigInt(bits)
}

export type HalfWordBytes = [
    HalfWord.HalfWord,
    HalfWord.HalfWord,
    HalfWord.HalfWord,
    HalfWord.HalfWord
]

export type InstructionBytes = [
    Byte.Byte,
    Byte.Byte,
    Byte.Byte,
    Byte.Byte,
    Byte.Byte,
    Byte.Byte,
    Byte.Byte,
    Byte.Byte
]

export function toBEBytes(value: Instruction): InstructionBytes {
    const string = value.toString(16).padStart(SIZE * 2, "0")

    const result = chunkString(string, 2).map((num) => {
        const parsedNum = parseInt(num, 16)
        if (Number.isNaN(parsedNum) || !Number.isFinite(parsedNum)) {
            throw new Error(
                "UNREACHABLE, generated this string by using a number toString(16)"
            )
        }
        return parsedNum
    })
    return result as InstructionBytes
}

export function toHexString(
    value: Instruction,
    includeLeadingNullBytes = true
): string {
    return Byte.toHexString(toBEBytes(value), includeLeadingNullBytes, false)
}

export function fromHexString(value: string): u64 {
    if (value.substring(0, 2) === "0x") {
        return fromHexString(value.substring(2))
    }
    if (value.length != SIZE * 2) {
        throw new Error("Invalid Instruction String")
    }
    const array: string[] = chunkString(value, 2)
    const values: number[] = array.map((num) => {
        const parsedNum = parseInt(num, 16)
        return parsedNum
    })
    return fromArray(values)
}

export function fromArray(values: number[]): u64 {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(SIZE)
    )

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }
    const instruction = fromBEBytes(array)
    return instruction
}
