import * as Byte from "./Byte"
import * as HalfWord from "./HalfWord"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"
import { u32 } from "./types"

export const SIZE = 4

export type Word = u32

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): Word {
    return unpack(
        new Uint8Array(array),
        { bits, signed: false, be: true },
        0,
        true
    )
}

export function saveAsBEBytes(
    array: Uint8ClampedArray,
    address: Address,
    value: Word
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(array.buffer),
        address,
        true
    )
}

export function asHalfWords(
    value: Word
): [HalfWord.HalfWord, HalfWord.HalfWord] {
    const binaryString = value.toString(2)
    return [
        binaryString.substring(0, HalfWord.SIZE * Byte.bits),
        binaryString.substring(HalfWord.SIZE * Byte.bits),
    ].map((a) => parseInt(a, 2)) as [HalfWord.HalfWord, HalfWord.HalfWord]
}
