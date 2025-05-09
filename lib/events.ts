import EventEmitter from "node:events";
const roomEvents = new EventEmitter();
roomEvents.setMaxListeners(1000);

export type CurrentVote = { questionText: string };
export type RoomEventData = {
  statusMessage: string;
  isOpen: boolean;
  currentVote?: CurrentVote;
};

export function addRoomEventListener(
  roomUrlName: string,
  listener: (data: RoomEventData) => void | Promise<void>,
) {
  roomEvents.on(`room-events-${roomUrlName}`, listener);
}
export function removeRoomEventsListener(
  roomUrlName: string,
  listener: (data: RoomEventData) => void | Promise<void>,
) {
  roomEvents.off(`room-events-${roomUrlName}`, listener);
}
export function emitRoomEvent(
  roomUrlName: string,
  data: RoomEventData,
) {
  roomEvents.emit(`room-events-${roomUrlName}`, data);
}
