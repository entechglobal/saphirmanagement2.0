const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("attendance", {
  getConfig: () => invoke("config:get"),
  setConfig: (partial) => invoke("config:set", partial),
  login: (payload) => invoke("cloud:login", payload),
  logout: () => invoke("cloud:logout"),
  cloudUsers: () => invoke("cloud:users"),
  connectDevice: (payload) => invoke("device:connect", payload),
  disconnectDevice: () => invoke("device:disconnect"),
  deviceStatus: () => invoke("device:status"),
  deviceUsers: () => invoke("device:users"),
  addUser: (payload) => invoke("device:addUser", payload),
  setCard: (payload) => invoke("device:setCard", payload),
  enroll: (payload) => invoke("device:enroll", payload),
  deleteDeviceUser: (appUserId) => invoke("device:deleteUser", appUserId),
  fetchAttendance: () => invoke("attendance:fetch"),
  importAttendance: () => invoke("attendance:import"),
});
