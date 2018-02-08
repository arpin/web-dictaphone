
// Visualizes a getUserMedia stream in real time
var VisualizeMediaStream = function (audioCtx, stream, canvas, canvasCtx)
{
    //let audioCtx = new(window.AudioContext || webkitAudioContext)();
    var source = audioCtx.createMediaStreamSource(stream);

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    //analyser.connect(audioCtx.destination);

    draw();

    function draw()
    {
        let WIDTH = canvas.width;
        let HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 255, 0)';

        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for (var i = 0; i < bufferLength; i++)
        {
            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT / 2;
            if (i === 0)
            {
                canvasCtx.moveTo(x, y);
            }
            else
            {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
};

(function() {
	var types = [
		// These should be supported:
		"video/webm",
		"video/webm;codecs=vp8",
		"video/webm;codecs=vp9",
		"video/webm;codecs=vp8.0",
		"video/webm;codecs=vp9.0",
		"video/webm;codecs=h264",
		"video/webm;codecs=H264",
		"video/webm;codecs=avc1",
		"video/webm;codecs=vp8,opus",
		"video/WEBM;codecs=VP8,OPUS",
		"video/webm;codecs=vp9,opus",
		"video/webm;codecs=vp8,vp9,opus",
		"video/webm;codecs=h264,opus",
		"video/webm;codecs=h264,vp9,opus",
		"video/x-matroska;codecs=avc1",
		"audio/webm",
		"audio/webm;codecs=opus",
		
		// The most likely are not... :(
		"video/mpeg",
		"video/webm;codecs=h265",
		"audio/ogg",
		"video/ogg",
		"application/ogg",
		// PCM audio
		"audio/wave",
		"audio/wav",
		"audio/x-wav",
		"audio/x-pn-wav",
	];
	for (var i in types) { 
		console.log( "MediaRecorder support for " + types[i] + ": " + (MediaRecorder.isTypeSupported(types[i]) ? "yes" : "no")); 
	}
})();

if (navigator.mediaDevices.getUserMedia)
{
    var config = {
        audio: true
    };
    navigator.mediaDevices.getUserMedia(config).then(
		function (stream)
		{
			// Visualize MediaStream
			let canvas = document.querySelector('.visualizer');
			let canvasCtx = canvas.getContext("2d");
			let audioCtx = new(window.AudioContext || webkitAudioContext)();
			VisualizeMediaStream(audioCtx, stream, canvas, canvasCtx);

			let mainSection = document.querySelector('.main-controls');
			let soundClips = document.querySelector('.sound-clips');
			
			// Use media recorder to record clips from the MediaStream
			let mediaRecorder = new MediaRecorder(stream);
			let chunks = [];

			let start = function ()
			{
				if (mediaRecorder.state == 'recording') {
					return;
				}
				console.log("recording");
				mediaRecorder.start();
			};
			
			let stop = function ()
			{
				if (mediaRecorder.state != 'recording') {
					return;
				}
				console.log("stopping");
				mediaRecorder.stop();
				// mediaRecorder.requestData();
			};

			document.addEventListener('keydown', (e) => {
				// 32 == space
				if (e.keyCode == 32) {
					start();
				}
			});
			
			document.addEventListener('keyup', (e) => {
				if (e.keyCode == 32) {
					stop();
				}
			});
			
			mediaRecorder.ondataavailable = function (e)
			{
				// e.data contains the recorded Blob
				chunks.push(e.data);
			};
			
			mediaRecorder.onstop = function (e)
			{
				console.log(chunks);
				if (chunks.length == 0)
					return;
				let blob = new Blob(chunks, {
					type: chunks[0].type
				});
				if (blob.size != 0) {
					console.log(blob);
					var audio = document.createElement('audio');
					audio.setAttribute('controls', '');
					audio.controls = true;
					audio.src = window.URL.createObjectURL(blob);
					soundClips.appendChild(audio);
				}
				chunks = [];
			};
			
			window.onresize = function ()
			{
				canvas.width = mainSection.offsetWidth;
			};
			window.onresize();
		},
        function (err)
		{
			// not allowing the use of microphone will lead here
			console.log('getUserMedia error: ' + err);
		}
    );
}
else
{
    console.log('getUserMedia is not supported on your browser!');
}
