import * as Byte from "./Byte"
import * as HalfWord from "./HalfWord"
import * as Instruction from "./Instruction"
import * as Word from "./Word"

function arrayEquals(arr1: Uint8ClampedArray, arr2: Uint8ClampedArray) {
    expect(arr1.length).toStrictEqual(arr2.length)

    for (let i = 0; i < arr1.length; ++i) {
        expect(arr1[i]).toStrictEqual(arr2[i])
    }
}

test("Byte conversion works", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Byte.SIZE)
    )
    const values = [0xad]

    expect(values.length).toStrictEqual(Byte.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    const BESum: Byte.Byte = values.reduce(
        (acc, el, index) =>
            acc + (el << (Byte.bits * (values.length - index - 1))),
        0
    )

    expect(BESum).toStrictEqual(Byte.fromBEBytes(array))

    const savedArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Byte.SIZE)
    )
    Byte.saveAsBEBytes(savedArray, 0, BESum)

    arrayEquals(array, savedArray)

    const smallArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Byte.SIZE - 1)
    )

    expect(() => Byte.fromBEBytes(smallArray)).toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = parseInt(`0x${"F".repeat(Byte.SIZE * 2 + 1)}`)
    }

    // this should throw, but since using a Uint8ClampedArray no overflows occur!
    expect(() =>
        Byte.saveAsBEBytes(array, 0, Byte.fromBEBytes(array))
    ).not.toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }

    expect(() =>
        Byte.saveAsBEBytes(array, 0, Byte.fromBEBytes(array))
    ).not.toThrowError(Error)
})

test("HalfWord conversion works", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(HalfWord.SIZE)
    )
    const values = [0xad, 0xde]

    expect(values.length).toStrictEqual(HalfWord.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    const BESum: HalfWord.HalfWord = values.reduce(
        (acc, el, index) =>
            acc + (el << (Byte.bits * (values.length - index - 1))),
        0
    )

    expect(BESum).toStrictEqual(HalfWord.fromBEBytes(array))

    const savedArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(HalfWord.SIZE)
    )
    HalfWord.saveAsBEBytes(savedArray, 0, BESum)

    arrayEquals(array, savedArray)

    const smallArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(HalfWord.SIZE - 1)
    )

    expect(() => HalfWord.fromBEBytes(smallArray)).toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = parseInt(`0x${"F".repeat(HalfWord.SIZE * 2 + 1)}`)
    }

    // this should throw, but since using a Uint8ClampedArray no overflows occur!
    expect(() =>
        HalfWord.saveAsBEBytes(array, 0, HalfWord.fromBEBytes(array))
    ).not.toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }

    expect(() =>
        HalfWord.saveAsBEBytes(array, 0, HalfWord.fromBEBytes(array))
    ).not.toThrowError(Error)
})

test("Word conversion works", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE)
    )
    const values = [0xad, 0xde, 0x12, 0x34]

    expect(values.length).toStrictEqual(Word.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    // >>> is weird js for converting 32 bit signed ints into 32 bit unsigned ints!
    const BESum: Word.Word = values.reduce(
        (acc, el, index) =>
            acc + ((el << (Byte.bits * (values.length - index - 1))) >>> 0),
        0
    )

    expect(BESum).toStrictEqual(Word.fromBEBytes(array))

    const savedArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE)
    )
    Word.saveAsBEBytes(savedArray, 0, BESum)

    arrayEquals(array, savedArray)

    const smallArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE - 1)
    )

    expect(() => Word.fromBEBytes(smallArray)).toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = parseInt(`0x${"F".repeat(Word.SIZE * 2 + 1)}`)
    }

    // this should throw, but since using a Uint8ClampedArray no overflows occur!
    expect(() =>
        Word.saveAsBEBytes(array, 0, Word.fromBEBytes(array))
    ).not.toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }

    expect(() =>
        HalfWord.saveAsBEBytes(array, 0, Word.fromBEBytes(array))
    ).not.toThrowError(Error)

    expect(Word.asHalfWords(Word.fromBEBytes(array))).toStrictEqual([
        HalfWord.fromBEBytes(array),
        HalfWord.fromBEBytes(
            new Uint8ClampedArray(array.buffer, HalfWord.SIZE, HalfWord.SIZE)
        ),
    ])
})

test("Instruction conversion works", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE)
    )
    const values = [0xad, 0xde, 0x12, 0x34, 0x45, 0x69, 0x42, 0x11]

    expect(values.length).toStrictEqual(Instruction.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }

    const BESum: Instruction.Instruction = values
        .map((a) => BigInt(a))
        .reduce(
            (acc, el, index) =>
                acc +
                (el <<
                    (BigInt(Byte.bits) *
                        (BigInt(values.length) - BigInt(index) - 1n))),
            0n
        )

    expect(BESum).toStrictEqual(Instruction.fromBEBytes(array))

    const savedArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE)
    )
    Instruction.saveAsBEBytes(savedArray, 0, BESum)

    arrayEquals(array, savedArray)

    const smallArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE - 1)
    )

    expect(() => Instruction.fromBEBytes(smallArray)).toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = parseInt(`0x${"F".repeat(Instruction.SIZE * 2 + 1)}`)
    }

    // this should throw, but since using a Uint8ClampedArray no overflows occur!
    expect(() =>
        Instruction.saveAsBEBytes(array, 0, Instruction.fromBEBytes(array))
    ).not.toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }

    expect(() =>
        Instruction.saveAsBEBytes(array, 0, Instruction.fromBEBytes(array))
    ).not.toThrowError(Error)

    expect(Instruction.asWords(Instruction.fromBEBytes(array))).toStrictEqual([
        Word.fromBEBytes(array),
        Word.fromBEBytes(
            new Uint8ClampedArray(array.buffer, Word.SIZE, Word.SIZE)
        ),
    ])

    const amount = 10

    const longArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE * amount)
    )

    for (let i = 0; i < values.length; ++i) {
        longArray[Instruction.SIZE * (amount - 1) + i] = values[i]
    }

    const slicedArray: Uint8ClampedArray = new Uint8ClampedArray(
        longArray.buffer,
        Instruction.SIZE * (amount - 1),
        Instruction.SIZE
    )

    expect(slicedArray.length).toBe(Instruction.SIZE)

    const result = Instruction.fromBEBytes(slicedArray)

    expect(result).toBe(BESum)

    expect(Instruction.toBEBytes(result)).toStrictEqual(values)

    const array2: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE)
    )
    const values2 = [0x00, 0x00, 0x00, 0x17, 0x00, 0x69, 0x42, 0x11]

    expect(values2.length).toStrictEqual(Instruction.SIZE)

    for (let i = 0; i < values2.length; ++i) {
        array2[i] = values2[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }

    expect(values2).toStrictEqual(
        Instruction.toBEBytes(Instruction.fromBEBytes(array2))
    )
})

test("Instruction toHex works as expected", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Instruction.SIZE)
    )
    const values = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]

    expect(values.length).toStrictEqual(Instruction.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    const instruction = Instruction.fromBEBytes(array)

    expect(instruction).toBe(1n)

    expect(Instruction.toHexString(instruction)).toBe("0x0000000000000001")
    expect(Instruction.toHexString(instruction, false)).toBe("0x1")
})

test("Byte toHex works as expected", () => {
    const value1 = [0x50, 0x01]
    const value2 = [0x05, 0x00, 0x00]
    const value3 = [0x00, 0x05, 0x00, 0x00]

    expect(Byte.toHexString(value1, false, false)).toBe("0x5001")
    expect(Byte.toHexString(value1, false, true)).toBe("0x5001")
    expect(Byte.toHexString(value1, true, true)).toBe("0x5001")
    expect(Byte.toHexString(value1, true, false)).toBe("0x5001")

    expect(Byte.toHexString(value2, false, false)).toBe("0x50000")
    expect(Byte.toHexString(value2, false, true)).toBe("0x050000")
    expect(Byte.toHexString(value2, true, true)).toBe("0x050000")
    expect(Byte.toHexString(value2, true, false)).toBe("0x050000")

    expect(Byte.toHexString(value3, false, false)).toBe("0x50000")
    expect(Byte.toHexString(value3, false, true)).toBe("0x050000")
    expect(Byte.toHexString(value3, true, true)).toBe("0x00050000")
    expect(Byte.toHexString(value3, true, false)).toBe("0x00050000")
})

test("Word conversion works", () => {
    const array: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE)
    )
    const values = [0xad, 0xde, 0x12, 0x34]

    expect(values.length).toStrictEqual(Word.SIZE)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]

        expect(values[i]).toBeLessThanOrEqual(255)
        expect(values[i]).toBeGreaterThanOrEqual(0)
    }
    // >>> is weird js for converting 32 bit signed ints into 32 bit unsigned ints!
    const BESum: Word.Word = values.reduce(
        (acc, el, index) =>
            acc + ((el << (Byte.bits * (values.length - index - 1))) >>> 0),
        0
    )

    expect(BESum).toStrictEqual(Word.fromBEBytes(array))

    const savedArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE)
    )
    Word.saveAsBEBytes(savedArray, 0, BESum)

    arrayEquals(array, savedArray)

    const smallArray: Uint8ClampedArray = new Uint8ClampedArray(
        new ArrayBuffer(Word.SIZE - 1)
    )

    expect(() => Word.fromBEBytes(smallArray)).toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = parseInt(`0x${"F".repeat(Word.SIZE * 2 + 1)}`)
    }

    // this should throw, but since using a Uint8ClampedArray no overflows occur!
    expect(() =>
        Word.saveAsBEBytes(array, 0, Word.fromBEBytes(array))
    ).not.toThrowError(Error)

    for (let i = 0; i < values.length; ++i) {
        array[i] = values[i]
    }

    expect(() =>
        HalfWord.saveAsBEBytes(array, 0, Word.fromBEBytes(array))
    ).not.toThrowError(Error)

    expect(Word.asHalfWords(Word.fromBEBytes(array))).toStrictEqual([
        HalfWord.fromBEBytes(array),
        HalfWord.fromBEBytes(
            new Uint8ClampedArray(array.buffer, HalfWord.SIZE, HalfWord.SIZE)
        ),
    ])
})

test("Word isWord works", () => {
    expect(Byte.toHexString(Word.toBEBytes(Word.MAX))).toBe(
        `0x${"F".repeat(Word.SIZE * 2)}`
    )
    const toTest = [
        "0xA5FF00FF",
        "0x00FF00FF",
        "0xAFFEAFFEA5",
        "0x10000000000000",
    ]
    for (const testString of toTest) {
        const parsedNum = parseInt(testString, 16)
        const isWord = testString.length - 2 <= Word.SIZE * 2
        expect([testString, parsedNum, Word.isWord(parsedNum)]).toStrictEqual([
            testString,
            parsedNum,
            isWord,
        ])
        if (isWord) {
            expect(Word.toWord(parsedNum)).toBe(parsedNum)
        } else {
            expect(Word.toWord(parsedNum)).toBe(Word.MAX)
        }
    }
})
