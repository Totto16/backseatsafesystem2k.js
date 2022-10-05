import * as Instruction from "./builtins/Instruction"

export class Timer {
    startTime: Instruction.Instruction
    constructor(startTime: Date | number) {
        this.startTime = BigInt(
            typeof startTime === "number" ? startTime : startTime.getTime()
        )
    }

    //TODO investigate, is the epoch time the correct one (since 1.1.1970) or since the machine start?!!??

    getMsSinceEpoch(sinceMachineStartup = false): Instruction.Instruction {
        const now = BigInt(new Date().getTime())
        return sinceMachineStartup ? now - this.startTime : now
    }
}
