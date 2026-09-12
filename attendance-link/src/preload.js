const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("attendance", {
  getConfig: () => invoke("config:get"),
  setConfig: (partial) => invoke("config:set", partial),
  login: (payload) => invoke("cloud:login", payload),
  logout: () => invoke("cloud:logout"),
  onSessionExpired: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("session:expired", handler);
    return () => ipcRenderer.removeListener("session:expired", handler);
  },
  cloudUsers: (payload) => invoke("cloud:users", payload),
  societes: () => invoke("cloud:societes"),
  connectDevice: (payload) => invoke("device:connect", payload),
  disconnectDevice: () => invoke("device:disconnect"),
  deviceStatus: () => invoke("device:status"),
  deviceUsers: () => invoke("device:users"),
  addUser: (payload) => invoke("device:addUser", payload),
  addUsers: (payload) => invoke("device:addUsers", payload),
  setCard: (payload) => invoke("device:setCard", payload),
  enroll: (payload) => invoke("device:enroll", payload),
  deleteDeviceUser: (appUserId) => invoke("device:deleteUser", appUserId),
  fetchAttendance: () => invoke("attendance:fetch"),
  importAttendance: (payload) => invoke("attendance:import", payload),
});
