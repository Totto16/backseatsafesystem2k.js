import * as Byte from "./Byte"
import * as Word from "./Word"
import { bigintToBuf } from "bigint-conversion"
import { Address } from "../address_constants"
import { u64 } from "./types"

export const SIZE = 8

// js numbers aren't safe up to 2^64 alias u64,only up to 2^53 - 1, so here a BigInt has to be used!!
// Attention calculation with these numbers are slightly different!
export type Instruction = u64

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): Instruction {
    return BigInt.asUintN(64, new DataView(array.buffer).getBigUint64(0, false))
}

export function saveAsBEBytes(
    array: Uint8ClampedArray,
    address: Address,
    value: Instruction
): void {
    const newArray: Uint8ClampedArray = new Uint8ClampedArray(
        bigintToBuf(value, true)
    )

    for (let i = 0; i < SIZE; ++i) {
        if (newArray[i] > 255 || newArray[i] < 0) {
            throw new Error(`number out of range: Byte ${newArray[i]}`)
        }
        array[address + i] = newArray[i]
    }
}

export function asWords(value: Instruction): [Word.Word, Word.Word] {
    const binaryString = value.toString(2)
    return [
        binaryString.substring(0, Word.SIZE * Byte.bits),
        binaryString.substring(Word.SIZE * Byte.bits),
    ].map((a) => parseInt(a, 2)) as [Word.Word, Word.Word]
}

export function isInstruction(number: Instruction) {
    return number >= 0n && number < 1n << BigInt(bits)
}

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
    const array = new Uint8ClampedArray(new ArrayBuffer(SIZE))
    saveAsBEBytes(array, 0, value)
    return Array.from(array) as InstructionBytes
}

export function toHexString(value: Instruction): string {
    return Byte.toHexString(toBEBytes(value), true)
}
