import * as Byte from "./Byte"
import * as Word from "./Word"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 8

export type Instruction = number // TODO maybe we ned a class or BigInt here!!

export const bits = Byte.bits * SIZE

export function fromBEBytes(buffer: Uint8ClampedArray): Instruction {
    return unpack(
        new Uint8Array(buffer),
        { bits, signed: false, be: true },
        0,
        true
    )
}

export function saveAsBEBytes(
    buffer: Uint8ClampedArray,
    address: Address,
    value: Instruction
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(buffer),
        address
    )
}

export function asWords(value: Instruction): [Word.Word, Word.Word] {
    const binaryString = value.toString(2)
    return [
        binaryString.substring(0, Word.SIZE * Byte.SIZE),
        binaryString.substring(Word.SIZE * Byte.SIZE),
    ].map((a) => parseInt(a, 2)) as [Word.Word, Word.Word]
}
