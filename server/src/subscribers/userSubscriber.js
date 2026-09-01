import EventEmitter from "events";

const events = new EventEmitter();

events.on("userCreated", (user) => {
  console.log("📨 Send welcome email to", user.email);
});

export default events;
