import { KaspaProvider } from "../interfaces";

declare global {
  interface Window {
    kaspaProvider: KaspaProvider;
  }
}

let kastleProvider: KaspaProvider;

const kastleInstallListener = async (event: MessageEvent<any>) => {
  if (event.data?.id === "kastle_installed") {
    kastleProvider = (window as any).kastle;
    window.removeEventListener("message", kastleInstallListener);
  }
};

window.addEventListener("message", kastleInstallListener);

export const getKaspaProvider = (): KaspaProvider => {
  let kastleBrowserAPI = kastleProvider;

  if (!kastleBrowserAPI) {
    throw new Error("Kastle wallet not installed");
  }

  return kastleBrowserAPI;
};
