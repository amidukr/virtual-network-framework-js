export class Random {
    static random6() {
        return Math.floor((1 + Math.random()) * 0x10000000).toString(36);
    }
}
