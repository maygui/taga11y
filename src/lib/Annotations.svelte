<script lang="ts">
	import { currentTime, pauseAudio } from '$lib/audioStore';
	import { audioAnnotations } from '$lib/audioStore';

	import { derived } from 'svelte/store';
	import Mousetrap from 'mousetrap';

	// Initialize annotations as a reactive variabl
	const annotations = derived(audioAnnotations, ($wsRegions) => {
		// Get regions or an empty array if not available
		const regions = $wsRegions?.wsRegions.getRegions() || [];
		// Sort the regions by the 'start' property
		regions.sort((a, b) => a.start - b.start);
		return regions;
	});

	let lastPlayedAnnotationTime: number | null = null;

	const pop = new Audio('/pop.mp3');
	const pap = new Audio('/pap.mp3');

	// Function to play the annotation sound
	function playStartAnnotationSound() {
		pop.play().catch((e) => console.error('Error playing annotation sound:', e));
	}

	function playStopAnnotationSound() {
		pap.play().catch((e) => console.error('Error playing annotation sound:', e));
	}
	// Subscription to currentTime
	let unsubscribeCurrentTime = currentTime.subscribe(($currentTime) => {
		$annotations.forEach((annotation) => {
			// Check if currentTime is at the start of an annotation
			if ($currentTime >= annotation.start && $currentTime < annotation.start + 0.05) {
				// Avoid replaying if we've just played the sound for this annotation
				if (lastPlayedAnnotationTime !== annotation.start) {
					playStartAnnotationSound();
					lastPlayedAnnotationTime = annotation.start;
				}
			}
			// Check if currentTime is at the start of an annotation
			if ($currentTime >= annotation.end && $currentTime < annotation.end + 0.05) {
				// Avoid replaying if we've just played the sound for this annotation
				if (lastPlayedAnnotationTime !== annotation.end) {
					playStopAnnotationSound();
					lastPlayedAnnotationTime = annotation.end;
				}
			}
		});
	});

	function formatTimeMillis(seconds: number) {
		const pad = (num: number, size: number) => num.toString().padStart(size, '0');
		const minutes = Math.floor(seconds / 60);
		const secondsLeft = Math.floor(seconds % 60);
		const totalMilliseconds = seconds * 1000; // convert seconds to milliseconds
		const milliseconds = Math.floor(totalMilliseconds % 1000); // milliseconds left after removing full seconds
		return `${pad(minutes, 2)}:${pad(secondsLeft, 2)}:${pad(milliseconds, 3)}`;
	}
	function formatTimeNoMillis(seconds: number) {
		const pad = (num: number, size: number) => num.toString().padStart(size, '0');
		const minutes = Math.floor(seconds / 60);
		const secondsLeft = Math.floor(seconds % 60);
		return `${pad(minutes, 2)}:${pad(secondsLeft, 2)}`;
	}

	// Function to add a new annotation
	const addEvent = (name: string) => {
		audioAnnotations.update((wsRegions) => {
			// Check if wsRegions is not null or undefined
			if (wsRegions && wsRegions.wsRegions) {
				let annotation = wsRegions.wsRegions.addRegion({
					start: $currentTime,
					content: name,
					drag: false,
					resize: false
				});
			}
			return wsRegions;
		});
	};

	// Function to add a new timestamp annotation
	const addTimestamp = (name, start, end) => {
		audioAnnotations.update((wsRegions) => {
			// Check if wsRegions is not null or undefined
			if (wsRegions && wsRegions.wsRegions) {
				let annotation = wsRegions.wsRegions.addRegion({
					start: start, // Start time of the annotation
					end: end, // End time of the annotation
					content: name, // Name or content of the annotation
					drag: false, // Allow dragging
					resize: false // Allow resizing
				});
			}
			return wsRegions;
		});
	};

	const removeAnnotation = (annotationToRemove) => {
		audioAnnotations.update((wsRegions) => {
			// Check if wsRegions and wsRegions.wsRegions exist
			if (wsRegions && wsRegions.wsRegions) {
				// Find the annotation in the list and remove it
				const regions = wsRegions.wsRegions.getRegions();
				const regionIndex = regions.findIndex((region) => region === annotationToRemove);
				if (regionIndex !== -1) {
					let regionToRemove = regions[regionIndex];

					let text = 'removed ' + regionToRemove.content?.textContent;
					speak(text, 1);
					regions[regionIndex].remove(); // Call remove on the specific annotation
				}
			}
			return wsRegions;
		});
	};

	const speak = (text: string | undefined, volume: number = 0.5) => {
		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel(); // Cancel current speech
		}
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.volume = volume; // Set the volume here
		utterance.rate = 1.7;
		window.speechSynthesis.speak(utterance);
	};

	let partialTimestamp: null | number = null;

	// Bind the 'e' key to the addEvent function
	Mousetrap.bind('e', (e) => {
		let name = 'Event ' + formatTimeMillis($currentTime);
		let text = 'set annotation ' + name;
		speak(text, 1);
		addEvent(name);
		e.preventDefault();
	});
	// Bind the 's' key to the addTimestamp function
	Mousetrap.bind('s', (e) => {
		// TODO
		// we have an array outside called let partialTimestamp = null
		// if we press a and partialTimestamp is null do this:
		// - add currentTime to partialTimestamp
		// - speak "partial timestamp at [$currentTime]"
		// if partialTiestamp is not null do this:
		// - set start and end to either $currentTime or partialTimestamp, depending on which is first
		// - then say "timestamp from [start] to [end]"
		// - call a function addTimestamp with the name "Timestamp [start] - [end]"

		if (partialTimestamp === null) {
			partialTimestamp = $currentTime;
			let spokenTimestamp = formatTimeNoMillis($currentTime);
			speak(`Partial timestamp at` + spokenTimestamp);
		} else {
			let start, end;
			if (partialTimestamp < $currentTime) {
				start = partialTimestamp;
				end = $currentTime;
			} else {
				start = $currentTime;
				end = partialTimestamp;
			}
			let formattedStart = formatTimeMillis(start);
			let formattedEnd = formatTimeMillis(end);

			let spokenStart = formatTimeNoMillis(start);
			let spokenEnd = formatTimeNoMillis(end);
			speak(`Timestamp from ${spokenStart}] to ${spokenEnd}`);
			addTimestamp(`Timestamp [${formattedStart}] - [${formattedEnd}]`, start, end);
			partialTimestamp = null; // Reset partialTimestamp for next use
		}
	});
</script>

<div class="flex flex-col p-4">
	<div class="text-xl font-semibold mb-2">{$annotations.length} Annotations</div>
	<div class="flex flex-col">
		{#each $annotations as annotation}
			<div class="flex flex-row">
				<button class="m-2" on:click={() => annotation.play()}
					>{annotation.content?.textContent}</button
				>
				<button class="m-2" on:click={() => removeAnnotation(annotation)}> remove </button>
			</div>
		{/each}
	</div>

	<div class="flex flex-col mt-4">
		{#if partialTimestamp !== null}
			Partial timestamp: {formatTimeMillis(partialTimestamp)}
		{/if}
	</div>
</div>
