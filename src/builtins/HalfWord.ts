import * as Byte from "./Byte"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"
import { u16 } from "./types"

export const SIZE = 2

export type HalfWord = u16

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): HalfWord {
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
    value: HalfWord
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(array.buffer),
        address,
        true
    )
}
