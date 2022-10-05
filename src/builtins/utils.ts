export function assert<T = any>(expected: T, actual?: T, message?: string) {
    const got = actual ?? true
    const actualMessage = `expected: ${expected} but got ${got}${
        message ? ` message: ${message}` : ""
    }`
    console.assert(expected === got, actualMessage)
    if (expected !== got) {
        throw new Error(actualMessage)
    }
}
