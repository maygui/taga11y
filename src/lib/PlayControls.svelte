<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		playAudio,
		seekAudioTo,
		adjustPlaybackRate,
		togglePlayPause,
		getPlaybackRate,
		pauseAudio
	} from '$lib/audioStore';
	import { currentTime, duration } from '$lib/audioStore';
	import { setPlaybackSpeed, adjustVolume } from '$lib/audioStore';
	import { derived } from 'svelte/store';
	import { audioPlayer, audioAnnotations } from '$lib/audioStore';

	import Mousetrap from 'mousetrap';

	const isPlaying = derived(
		audioPlayer,
		($audioPlayer) => $audioPlayer?.wavesurfer.isPlaying() || false
	);

	const formattedTime = derived([currentTime, duration], ([$currentTime, $duration]) => {
		return {
			current: formatTime($currentTime),
			total: formatTime($duration)
		};
	});

	function formatTime(seconds: number) {
		const pad = (num: number, size: number) => num.toString().padStart(size, '0');
		const minutes = Math.floor(seconds / 60);
		const secondsLeft = Math.floor(seconds % 60);
		return `${pad(minutes, 2)}:${pad(secondsLeft, 2)}`;
	}

	function formatTimeSpeak(seconds: number) {
		const minutes = Math.floor(seconds / 60);
		const secondsLeft = Math.floor(seconds % 60);

		return `${secondsLeft} seconds ${minutes} minutes`;
	}

	$: playback_speed_factor = 1.2;
	let seekByGridSteps = 1; // Default seek amount in seconds

	$: sec_per_grid = 1;
	// represents the grid size in seconds
	// seeking should always happen on the grid
	// seeking should always jump 1 grid step per default
	// playback speed should be either normal or grid size specific (so 1 grid step per second). Default to the second
	// shift space should play at normal speed, space should play at grid speed

	function seek_on_grid(grid_steps: number) {
		const rate = getPlaybackRate();
		const current_grid_point = Math.floor($currentTime / sec_per_grid);
		const offset_in_grid = $currentTime / sec_per_grid - current_grid_point;
		const is_in_thresh = offset_in_grid < 0.2; // if it is within 10%
		// grid_step == -1 means go to this floored grid_point, +1 means go to the next. 0 means nothing I guess
		let new_grid_point;
		if (grid_steps < 0 && !is_in_thresh) {
			new_grid_point = current_grid_point + grid_steps + 1;
		} else {
			new_grid_point = current_grid_point + grid_steps;
		}
		const newTime = new_grid_point * sec_per_grid;

		seekAudioTo(newTime);
	}

	$: if (sec_per_grid != undefined) {
		setPlaybackSpeed(sec_per_grid);
	}

	const speak = (text: string | undefined, volume: number = 0.5) => {
		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel(); // Cancel current speech
		}
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.volume = volume; // Set the volume here
		utterance.rate = 1.7; // Set the volume here
		window.speechSynthesis.speak(utterance);
	};

	onMount(() => {
		Mousetrap.bind('space', () => {
			togglePlayPause();
			// Update message based on the new state
			const message = $isPlaying ? 'Play' : 'Pause';
			speak(message, 0.5);
			return false;
		});

		Mousetrap.bind(
			'h',
			() => {
				pauseAudio(); // Called on keydown
				return false;
			},
			'keydown'
		);

		Mousetrap.bind(
			'h',
			() => {
				playAudio(); // Called on keyup
				return false;
			},
			'keyup'
		);

		Mousetrap.bind(']', () => {
			if (sec_per_grid > 4) {
				return false;
			}
			sec_per_grid = sec_per_grid * 2;
			setPlaybackSpeed(sec_per_grid);
			let gridSpeak = 'grid size is ' + sec_per_grid;
			speak(gridSpeak);
			return false;
		});

		Mousetrap.bind('[', () => {
			if (sec_per_grid < 0.15) {
				return false;
			}
			sec_per_grid = sec_per_grid / 2;
			setPlaybackSpeed(sec_per_grid);
			let gridSpeak = 'grid size is ' + sec_per_grid;
			speak(gridSpeak);
			return false;
		});
		Mousetrap.bind('=', () => {
			sec_per_grid = 1.0;
			setPlaybackSpeed(sec_per_grid);
			let gridSpeak = 'grid size is ' + sec_per_grid;
			speak(gridSpeak);
			return false;
		});
		Mousetrap.bind([',', '.'], (e, combo) => {
			seek_on_grid(combo === '.' ? seekByGridSteps : -seekByGridSteps);
			playAudio();
			return false;
		});
		Mousetrap.bind('shift+,', (e, combo) => {
			seekAudioTo(0);
			const message = 'Audio at beginning';
			speak(message);
			playAudio();
			return false;
		});
		Mousetrap.bind('shift+.', (e, combo) => {
			seekAudioTo(100000000000000000);
			const message = 'Audio at end';
			speak(message);
			playAudio();
			return false;
		});
		/*
		Mousetrap.bind('shift+up', () => {
			seekByGridSteps *= 2; // Increase seek amount
			return false;
		});

		Mousetrap.bind('shift+down', () => {
			seekByGridSteps /= 2; // Decrease seek amount but not below 1
			return false;
		});
*/
		Mousetrap.bind('c', () => {
			let currentTimeSpeak = formatTimeSpeak($currentTime);
			speak(currentTimeSpeak, 1.0);
			return false;
		});

		Mousetrap.bind('g', () => {
			let gridSpeak = 'grid size is ' + sec_per_grid;
			speak(gridSpeak, 1.0);
			return false;
		});

		Mousetrap.bind('h', () => {
			// todo
			// if the key is pressed down, pause the audio, if it is release then play it again
			return false;
		});
	});
	function adjustPlaybackSpeed(rate: number) {
		adjustPlaybackRate(rate);
	}
</script>

<div class="p-4">
	<button
		class="bg-[#375BAB] hover:bg-[#4e74c6] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
		on:click={togglePlayPause}
	>
		{$isPlaying ? 'Pause' : 'Play'}
	</button>

	<div aria-hidden="true">
		<span>{$formattedTime.current}</span> / <span>{$formattedTime.total}</span>
	</div>
	<div class="playback-info" aria-hidden="true">
		<span>
			{sec_per_grid.toFixed(2)} sec / grid step
		</span>
	</div>
</div>
