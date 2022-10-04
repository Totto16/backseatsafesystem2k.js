import * as Byte from "./Byte"
import * as Word from "./Word"
import { packArrayTo } from "byte-data"
import { bigintToBuf } from "bigint-conversion"
import { toBigIntBE, toBigIntLE, toBufferBE, toBufferLE } from "bigint-buffer"
import { Address } from "../address_constants"

export const SIZE = 8

// js numbers aren't safe up to 2^64 alias u64,only up to 2^53 - 1, so here a BigInt has to be used!!
// Attention calculation with these numbers are slightly different!
export type Instruction = BigInt

export const bits = Byte.bits * SIZE

export function fromBEBytes(buffer: Uint8ClampedArray): Instruction {
    // return toBigIntBE(buffer.buffer)

    // TODO check if it's really BE

    return BigInt.asUintN(64, new DataView(buffer).getBigUint64(0, false))
}

export function saveAsBEBytes(
    buffer: Uint8ClampedArray,
    address: Address,
    value: Instruction
): void {
    // TODO check if it's really BE
    const array = bigintToBuf(value as bigint, true)

    packArrayTo(
        new DataView(array),
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
