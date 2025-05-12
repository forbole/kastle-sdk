import { KaspaProvider } from "../interfaces";

declare global {
  interface Window {
    kastle: KaspaProvider;
  }
}

export const getKaspaProvider = async (): Promise<KaspaProvider> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const kastleProvider = window.kastle;
      if (kastleProvider) {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve(kastleProvider);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Kastle provider not found"));
    }, 5000);
  });
};
