export type CompareFunction<T = any, S = any> = (a: T, b: S) => boolean

export type ArithmeticOperators =
    | ">="
    | ">"
    | "<"
    | "<="
    | "!="
    | "!=="
    | "%"
    | "&&"
    | "||"

export function assert<T = any, S = T>(
    expected: T,
    actual?: S | true,
    message?: string,
    customCompareFn?: CompareFunction<T, S | true> | ArithmeticOperators,
    noAssert?: boolean
) {
    if (noAssert) {
        return
    }
    const got: S | true = actual !== undefined ? actual : true
    const actualMessage = `expected: ${expected} but got ${got}${
        customCompareFn
            ? ` (custom Compare Function ${
                  typeof customCompareFn === "string"
                      ? `'${customCompareFn}' `
                      : ""
              }used)`
            : ""
    }${message ? ` message: ${message}` : ""}`

    const compareFunction: CompareFunction<T, S | true> =
        customCompareFn == undefined
            ? (a: T, b: S | true) => a === b
            : typeof customCompareFn === "string"
            ? (a: T, b: S | true) => eval(`a ${customCompareFn} b`)
            : customCompareFn

    const comp = compareFunction(expected, got)
    console.assert(comp === true, actualMessage)
    if (!comp) {
        throw new Error(actualMessage)
    }
}
