export class Timer {
    startTime: number
    constructor(startTime: Date | number) {
        this.startTime =
            typeof startTime === "number" ? startTime : startTime.getTime()
    }

    getMsSinceEpoch(): number {
        return new Date().getTime() - this.startTime
    }
}
