export function setTimeout(fn, timeout) {
  if(timeout != null && timeout !== 0) {
    console.log("setTimeout with timeout not 0, this might not be good");
  }
  queueMicrotask(() => { fn(); });
}
