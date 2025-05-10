Everything so far has been worked on to a reasonably tight deadline. This is my
first moment to take a breath and make some improvements I've been wanting to
make.

The goal for this cleanup is:

- [x] Fix some React integration issues
- [(chosen not to do right now)] Make the event model easier to comprehend and
  use
- [x] Break the big files down
- [x] Look into why the build step re-runs when it doesn't need to
- [x] Improve the database access - it's a synchronous part of a very async
      system and I'm making lots of individual calls to it

Potential stretch goals (probably for a later phase of house-keeping, but could
be included here):

- [(chosen not to do right now)] Add a design system
- [(chosen not to do right now)] Get rid of the few remaining `any` and
  `Function` types
- [(chosen not to do right now)] Introduce a DAO to allow easy switching between
  different databases
