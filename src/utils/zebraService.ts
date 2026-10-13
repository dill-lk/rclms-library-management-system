/**
 * Zebra ZD230 Official Browser Print SDK Service
 * Communicates with local Zebra Browser Print Desktop Client on HTTP (9100) or HTTPS (9101).
 */

export interface ZebraPrinterDevice {
  name: string;
  deviceType: string;
  connection: 'usb' | 'network' | 'serial' | 'bluetooth';
  uid: string;
  version?: number;
  provider?: string;
  manufacturer?: string;
}

// Declare global BrowserPrint if loaded via script
declare global {
  interface Window {
    BrowserPrint?: {
      getBaseUrl: () => string;
      getDefaultDevice: (type: string, success: (device: any) => void, error: (err: any) => void) => void;
      getLocalDevices: (success: (devices: any[]) => void, error: (err: any) => void, type?: string) => void;
      print: (device: any, data: string, success: (res: any) => void, error: (err: any) => void) => void;
      send: (data: string, success: (res: any) => void, error: (err: any) => void) => void;
    };
  }
}

/**
 * Get target Zebra Browser Print base URLs based on protocol
 */
export function getZebraEndpoints(): string[] {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (isHttps) {
    return [
      'https://localhost:9101',
      'https://127.0.0.1:9101',
      'http://localhost:9100',
      'http://127.0.0.1:9100',
    ];
  }
  return [
    'http://localhost:9100',
    'http://127.0.0.1:9100',
    'https://localhost:9101',
    'https://127.0.0.1:9101',
  ];
}

/**
 * Check Zebra Browser Print Status and detect default Zebra Printer (e.g. d5j205000960)
 */
export async function checkZebraBrowserPrintStatus(): Promise<{
  isAvailable: boolean;
  activeHost: string | null;
  defaultPrinter: ZebraPrinterDevice | null;
  error?: string;
}> {
  // Method A: Try Window.BrowserPrint SDK
  if (typeof window !== 'undefined' && window.BrowserPrint) {
    try {
      const printer = await new Promise<any>((resolve, reject) => {
        window.BrowserPrint!.getDefaultDevice(
          'printer',
          (device) => resolve(device),
          (err) => reject(err)
        );
      });

      if (printer) {
        return {
          isAvailable: true,
          activeHost: window.BrowserPrint.getBaseUrl().replace(/\/$/, ''),
          defaultPrinter: {
            ...printer,
            name: printer.name || 'd5j205000960',
            deviceType: printer.deviceType || 'printer',
            connection: printer.connection || 'usb',
            uid: printer.uid || printer.name || 'd5j205000960',
            version: printer.version || 5,
            provider: printer.provider || 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
            manufacturer: printer.manufacturer || 'Zebra Technologies',
          },
        };
      }
    } catch (e) {
      // Continue to direct endpoint probes
    }
  }

  // Method B: Probe HTTP / HTTPS Endpoints
  const endpoints = getZebraEndpoints();
  for (const host of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${host}/default?type=printer`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        let defaultPrinter: ZebraPrinterDevice | null = null;
        try {
          const parsed = JSON.parse(text);
          defaultPrinter = {
            ...parsed,
            name: parsed.name || 'd5j205000960',
            deviceType: parsed.deviceType || 'printer',
            connection: parsed.connection || 'usb',
            uid: parsed.uid || parsed.name || 'd5j205000960',
            version: parsed.version || 5,
            provider: parsed.provider || 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
            manufacturer: parsed.manufacturer || 'Zebra Technologies',
          };
        } catch (e) {
          defaultPrinter = {
            deviceType: 'printer',
            uid: 'd5j205000960',
            provider: 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
            name: 'd5j205000960',
            connection: 'usb',
            version: 5,
            manufacturer: 'Zebra Technologies',
          };
        }

        return {
          isAvailable: true,
          activeHost: host,
          defaultPrinter,
        };
      }
    } catch (err: any) {
      // Try next endpoint
    }
  }

  return {
    isAvailable: false,
    activeHost: null,
    defaultPrinter: null,
    error: 'Zebra Browser Print service not answering on port 9100 / 9101.',
  };
}

/**
 * Send ZPL commands directly to Zebra ZD230 via Zebra Browser Print Client
 */
export async function sendZplToZebraBrowserPrint(
  zplData: string,
  printer?: ZebraPrinterDevice | null,
  activeHost?: string | null
): Promise<{ success: boolean; message: string }> {
  // 1. Try window.BrowserPrint SDK
  if (typeof window !== 'undefined' && window.BrowserPrint) {
    try {
      const result = await new Promise<{ success: boolean; message: string }>((resolve, reject) => {
        if (printer) {
          window.BrowserPrint!.print(
            printer,
            zplData,
            (res) => resolve({ success: true, message: 'Printed directly to Zebra ZD230.' }),
            (err) => reject(new Error(typeof err === 'string' ? err : 'Print failed'))
          );
        } else {
          window.BrowserPrint!.send(
            zplData,
            (res) => resolve({ success: true, message: 'Printed directly to Zebra ZD230.' }),
            (err) => reject(new Error(typeof err === 'string' ? err : 'Print failed'))
          );
        }
      });
      return result;
    } catch (err: any) {
      // Fall through to manual fetch
    }
  }

  // 2. Try Fetch via activeHost or probe list
  const hostsToTry = activeHost ? [activeHost, ...getZebraEndpoints()] : getZebraEndpoints();
  const targetDevice = printer || {
    deviceType: 'printer',
    uid: 'd5j205000960',
    provider: 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
    name: 'd5j205000960',
    connection: 'usb',
    version: 5,
    manufacturer: 'Zebra Technologies',
  };

  const payload = JSON.stringify({
    device: targetDevice,
    data: zplData,
  });

  for (const host of hostsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${host}/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, message: `Printed directly to Zebra ZD230 via ${host}.` };
      }
    } catch (e) {
      // Try next host
    }
  }

  return {
    success: false,
    message: 'Could not communicate with Zebra Browser Print on port 9100 / 9101.',
  };
}
