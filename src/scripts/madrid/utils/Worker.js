import {ENTRY_SIZE,MIN_TIME} from "madrid/constants";

function createWorkerFromSource(source) {
  const blob = new Blob([source], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

export const worker = createWorkerFromSource(`
  var buffer;
  var id;
  var time;
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
      time = e.data.time;
    } else if (e.data.type === "id" && buffer) {
      id = e.data.id;
      if (timeoutID !== null) {
        cancel();
      }
      request();
    }
  });

  function cancel() {
    postMessage("debug! cancel");
    clearTimeout(timeoutID);
  }

  function request() {
    timeoutID = setTimeout(frame, 0);
  }

  function frame() {
    if (view && id) {
      for (; offset < view.byteLength; offset += ${ENTRY_SIZE}) {
        var currentTime = view.getFloat32(offset + 8, true);
        var currentId = view.getUint32(offset + 12, true);
        if (currentId === id && Math.abs(currentTime - time) < ${MIN_TIME} && offset !== sentOffset) {
          sentOffset = offset;
          postMessage({
            type: "item",
            offset: offset,
            data: {
              averageSpeed: view.getFloat32(offset + 16, true),
              occupancy: view.getFloat32(offset + 20, true),
              load: view.getFloat32(offset + 24, true),
              intensity: view.getFloat32(offset + 28, true)
            }
          });
          break;
        }
      }

      if (offset === buffer.length) {
        offset = 0;
      }
      request();
    } else {
      cancel();
    }
  }
`);

export default worker;
