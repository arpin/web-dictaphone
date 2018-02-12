
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

function downsampleBuffer(buffer, sampleRate) {
	if (16000 === sampleRate) {
		return buffer;
	}
	var sampleRateRatio = sampleRate / 16000;
	var newLength = Math.round(buffer.length / sampleRateRatio);
	var result = new Float32Array(newLength);
	var offsetResult = 0;
	var offsetBuffer = 0;
	while (offsetResult < result.length) {
		var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
		var accum = 0,
		count = 0;
		for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
			accum += buffer[i];
			count++;
		}
		result[offsetResult] = accum / count;
		offsetResult++;
		offsetBuffer = nextOffsetBuffer;
	}
	return result;
}


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
			console.log("sample rate: " + audioCtx.sampleRate, audioCtx);
			VisualizeMediaStream(audioCtx, stream, canvas, canvasCtx);

			let source = audioCtx.createMediaStreamSource(stream);
			let samplesPerChunk = 1024;
			let processor = audioCtx.createScriptProcessor(samplesPerChunk, 1, 1);
			source.connect(processor);
			processor.connect(audioCtx.destination);

			let mainSection = document.querySelector('.main-controls');
			let soundClips = document.querySelector('.sound-clips');
			
			let recording = false;
			let processRecording = false;

			let chunks = [];
			
			
			processor.onaudioprocess = function(e) {
				if (recording) {
					var inputData = e.inputBuffer.getChannelData(0);
					chunks.push(inputData);
				}
				else if (processRecording) {
					processRecording = false;
					console.log(chunks);
					let singlearray = new Float32Array(samplesPerChunk*chunks.length);
					let k = 0;
					for (let i = 0; i < chunks.length; i++) {
						for (let j = 0; j < chunks[i].length; j++) {
							singlearray[k] = chunks[i][j];
							k++;
						}
					}
					console.log(singlearray);
					let downsampled = downsampleBuffer(singlearray, audioCtx.sampleRate);
					console.log(downsampled);
					
					let errors = 0;
					k = 0;
					for (let i = 0; i < chunks.length; i++) {
						for (let j = 0; j < chunks[i].length; j++) {
							if (chunks[i][j] < singlearray[k]-0.0000001 || chunks[i][j] > singlearray[k]+0.0000001) { errors++; }
							k++;
						}
					}
					console.log("errors: " + errors);
					
					let blob = new Blob(chunks, {
						type: 'application/octet-stream'
						//type: 'audio/wav'
					});
					if (blob.size != 0) {
						console.log(blob);
						let audio = document.createElement('audio');
						audio.setAttribute('controls', '');
						audio.controls = true;
						audio.src = window.URL.createObjectURL(blob);
						soundClips.appendChild(audio);
					}
					chunks = [];
				}
			};

			let start = function ()
			{
				if (recording) {
					return;
				}
				console.log("recording");
				recording = true;
			};
			
			let stop = function ()
			{
				if (!recording) {
					return;
				}
				console.log("stopping");
				recording = false;
				processRecording = true;
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
