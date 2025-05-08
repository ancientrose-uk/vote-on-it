Checklist for the current task:

- [x] A host can open a room with a specific name
- [x] A guest cannot open a room (tested manually - the type checker makes this
      unlikely to regress and I'm struggling to find a way to test it without a
      test backdoor)
- [x] Multiple hosts can open multiple rooms without them conflicting
- [x] A guest can view the room when using the link
- [x] Before a room is open a waiting message appears with the room name
- [x] When a room is open the waiting message disappears without the user
      refreshing
- [x] After the voting is open a guest can get straight into the room
- [x] Events are sent in response to serverside changes, not (just) on a
      schedule
