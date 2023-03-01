var viewer = null;

function createJpeg(url) {
  // Create the main viewer.
  viewer = new window.MJPEGCANVAS.Viewer({
    divID: "mjpeg",
    host: url,
    width: 750,
    height: 480,
    topic: "/camera/rgb/image_raw"
    //topic : '/wide_stereo/left/image_color'
  });
}

function destroyedJpeg() {
  viewer = null;
  console.log("viewer has been closed");
}

export { createJpeg, destroyedJpeg, viewer };
