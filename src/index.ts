export const isKaslteInstalled = () => {
    let kastle = (globalThis as any).kastle;
    console.log(window)
    console.log(globalThis)
    console.log(kastle)

    return !!kastle;
}