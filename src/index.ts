export const isKaslteInstalled = () => {
    let kastle = (globalThis.window as any).kastle;
    console.log(window)
    console.log(globalThis)
    console.log(kastle)

    return !!kastle;
}