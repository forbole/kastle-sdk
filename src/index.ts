export const isKaslteInstalled = () => {
    console.log(window)
    console.log(globalThis)
    return !!(globalThis.window as any).kastle;
}