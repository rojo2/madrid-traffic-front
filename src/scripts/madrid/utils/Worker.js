import {ENTRY_SIZE,MIN_TIME} from "madrid/constants";

function createWorkerFromSource(source) {
  const blob = new Blob([source], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

const source = `
  var buffer;
  var id;
  var startTime;
  var currentTime;
  var endTime;
  var offset = 0;
  var sentOffset = 0;
  var view;
  var timeoutID = null;

  addEventListener("message", function(e) {
    if (e.data.type === "buffer") {
      if (buffer !== e.data.buffer) {
        buffer = e.data.buffer;
        view = new DataView(buffer);
      }
    } else if (e.data.type === "time" && buffer) {
      currentTime = e.data.currentTime;
      startTime = e.data.startTime;
      endTime = e.data.endTime;
    } else if (e.data.type === "id" && buffer) {
      id = e.data.id;
      if (timeoutID !== null) {
        cancel();
      }
      request();
    } else if (e.data.type === "progress" && buffer) {
      currentTime = e.data.currentTime;
      startTime = e.data.startTime;
      endTime = e.data.endTime;
      offset = Math.max(
        0,
        Math.floor(Math.floor((e.data.progress - 0.25) * view.byteLength) / ${ENTRY_SIZE}) * ${ENTRY_SIZE}
      );
    }
  });

  function cancel() {
    clearTimeout(timeoutID);
  }

  function request() {
    timeoutID = setTimeout(frame, 0);
  }

  function frame() {
    if (view && id) {
      for (; offset < view.byteLength; offset += ${ENTRY_SIZE}) {
        var itemTime = view.getFloat32(offset + 8, true);
        var itemId = view.getUint32(offset + 12, true);
        if (itemId === id && Math.abs(itemTime - currentTime) < ${MIN_TIME}) {
          if (sentOffset !== offset) {
            sentOffset = offset;
            postMessage({
              type: "item",
              time: itemTime,
              offset: offset,
              data: {
                averageSpeed: view.getFloat32(offset + 16, true),
                occupancy: view.getFloat32(offset + 20, true),
                load: view.getFloat32(offset + 24, true),
                intensity: view.getFloat32(offset + 28, true)
              }
            });
          }
          break;
        }
      }

      if (offset === view.byteLength) {
        offset = 0;
      }

      request();

    } else {

      cancel();

    }
  }
`;

export const worker = createWorkerFromSource(source);

export default worker;
