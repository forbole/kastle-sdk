const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isKaslteInstalled = async () => {
  // Waiting for Kastle script to be injected
  // TODO Publish an event from the script instead https://eips.ethereum.org/EIPS/eip-6963
  await sleep(100);
  return !!(window as any).kastle;
};
