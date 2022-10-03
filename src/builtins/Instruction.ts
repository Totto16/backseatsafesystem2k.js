import * as Byte from "./Byte"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 16 // TODO!!!

export type Instruction = number // TODO maybe we ned a class or BigInt here!!

export const bits = Byte.bits * SIZE

export function fromBEBytes(slice: Uint8Array): Instruction {
    return unpack(slice, { bits, signed: false, be: true }, 0, true)
}

export function saveAsBEBytes(
    buffer: Uint8Array,
    address: Address,
    value: Instruction
): void {
    packTo(value, { bits, signed: false, be: true }, buffer, address)
}
