import EventEmitter from "node:events";
export const roomEvents = new EventEmitter();
roomEvents.setMaxListeners(1000);
