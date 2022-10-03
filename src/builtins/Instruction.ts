import * as Byte from "./Byte"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 16 // TODO!!!

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
