
// Declare process for Node environment
declare const process: any;

export function printLog(...args: any) {
    const proc = typeof window !== 'undefined' ? window : process;
    if (proc['DEV_MODE'] === 'true') {
        console.log(...args);
    }
}

export function printError(...args: any) {
    const proc = typeof window !== 'undefined' ? window : process;
    if (proc['HIDE_ERRORS'] !== 'true') {
        console.error(...args);
    }
}