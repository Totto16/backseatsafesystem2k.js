export class Timer {
    startTime: number
    constructor(startTime: Date | number) {
        this.startTime =
            typeof startTime === "number" ? startTime : startTime.getTime()
    }

    //TODO investigate, is the epoch time the correct one (since 1.1.1970) or since the machine start?!!??

    getMsSinceEpoch(sinceMachineStartup = false): number {
        const now = new Date().getTime()
        return sinceMachineStartup ? now - this.startTime : now
    }
}
