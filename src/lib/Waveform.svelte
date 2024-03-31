<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { initializeAudioPlayer, loadAudio, loadBlob, destroyAudioPlayer } from './audioStore';

	let waveformContainer: HTMLElement;
	let isRecording = false;
	let mediaRecorder: MediaRecorder;
	let audioChunks: BlobPart[] = [];

	onMount(() => {
		initializeAudioPlayer(waveformContainer);

		setupRecorder();
		loadAudio('/BabyElephantWalk60.wav'); // Automatically load audio on mount
	});

	onDestroy(() => {
		destroyAudioPlayer();
	});

	async function setupRecorder() {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream);

		mediaRecorder.ondataavailable = (event) => {
			audioChunks.push(event.data);
		};

		mediaRecorder.onstop = () => {
			const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
			loadBlob(audioBlob);
			audioChunks = [];
		};
	}

	function toggleRecording() {
		if (isRecording) {
			mediaRecorder.stop();
		} else {
			audioChunks = [];
			mediaRecorder.start();
		}
		isRecording = !isRecording;
	}

	function handleLoadStaticFile() {
		loadAudio('/BabyElephantWalk60.wav'); // Update with the path to your static file
	}

	function handleFileUpload(event) {
		const files = event.target.files;
		if (files.length > 0) {
			const file = files[0];
			const url = URL.createObjectURL(file);
			loadAudio(url); // Load the uploaded file
		}
	}
</script>

<div class="w-full p-4">
	<div class="text-xl font-semibold">Timeline</div>
	{#if false}
		<button on:click={handleLoadStaticFile}>Load Audio</button>
	{/if}
	<!-- Upload button -->
	<div class="flex flex-row space-x-4 m-2">
		<input type="file" id="upload" accept="audio/wav" on:change={handleFileUpload} hidden />
		<label
			for="upload"
			class="cursor-pointer bg-[#375BAB] hover:bg-[#4e74c6] text-white font-bold py-2 px-4 rounded"
			style="--tw-hover:bg-opacity: 0.9;"
		>
			Upload .wav File
		</label>

		<button
			class="bg-[#375BAB] hover:bg-[#4e74c6] text-white font-bold py-2 px-4 rounded"
			style="background-color: #375BAB; --tw-hover:bg-opacity: 0.9;"
			on:click={handleLoadStaticFile}>Load Example Audio</button
		>
		<button
			class="{isRecording
				? 'bg-[#375BAB] hover:bg-[#4e74c6]'
				: 'bg-[#375BAB] hover:bg-[#4e74c6]'} text-white font-bold py-2 px-4 rounded"
			on:click={toggleRecording}
		>
			{isRecording ? 'Stop Recording' : 'Record Audio'}
		</button>
	</div>

	<div class="relative">
		<div bind:this={waveformContainer} aria-hidden="true"></div>
	</div>
</div>
