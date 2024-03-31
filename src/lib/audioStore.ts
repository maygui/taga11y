import { writable, derived, get } from 'svelte/store';
import WaveSurfer from 'wavesurfer.js';

import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
//import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js'


// Create a writable store with an initial value of null
export const audioPlayer = writable<{ wavesurfer: WaveSurfer } | null>(null);
export const audioAnnotations = writable<{ wsRegions: RegionsPlugin } | null>(null);

let refreshInterval: number | undefined;

export const initializeAudioPlayer = (element: HTMLElement) => {
    const wavesurfer = WaveSurfer.create({
        container: element,
        waveColor: '#BF74C9',
        progressColor: "purple",
        backend: 'MediaElement'
    });

    // Initialize the Zoom plugin
    wavesurfer.registerPlugin(
        ZoomPlugin.create({
            // the amount of zoom per wheel step, e.g. 0.5 means a 50% magnification per scroll
            scale: 0.1,
            deltaThreshold: 5,
            // Optionally, specify the maximum pixels-per-second factor while zooming
            maxZoom: 400,
        }),
    )
    // Update the store with the Wavesurfer instance
    audioPlayer.set({ wavesurfer });

    // Initialize the Regions plugin
    const wsRegions = wavesurfer.registerPlugin(RegionsPlugin.create())
    audioAnnotations.set({ wsRegions });

    // Initialize the Spectrogram plugin
    /*
    wavesurfer.registerPlugin(
        Spectrogram.create({
            labels: true,
            height: 200,
            splitChannels: true,
        }),
    )*/


    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        const player = get(audioPlayer);
        if (player) {
            audioPlayer.set(player); // Trigger reactivity by updating the store
        }
    }, 10);
};

export const loadAudio = (url: string) => {
    audioPlayer.update(player => {
        player?.wavesurfer.load(url);
        return player;
    });
};

export const loadBlob = (blob: Blob) => {
    audioPlayer.update(player => {
        player?.wavesurfer.loadBlob(blob);
        return player;
    });
};


export const playAudio = () => {
    audioPlayer.update(player => {
        player?.wavesurfer.play();
        return player;
    });
};

export const pauseAudio = () => {
    audioPlayer.update(player => {
        player?.wavesurfer.pause();
        return player;
    });
};

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)
const clamp01 = (num: any) => clamp(num, 0, 0.99999)

export const seekAudioTo = (time: number) => {
    audioPlayer.update(player => {
        if (player) {
            player.wavesurfer.seekTo(clamp01(time / player.wavesurfer.getDuration()));
        }
        return player;
    });
};

export const getPlaybackRate = () => {
    let currentRate = 1; // Default rate
    audioPlayer.update(player => {
        if (player) {
            currentRate = player.wavesurfer.getPlaybackRate();
        }
        return player;
    });
    return currentRate;
};

export const adjustPlaybackRate = (rate: number) => {
    audioPlayer.update(player => {
        if (player) {
            const currentTime = player.wavesurfer.getCurrentTime();
            const currentRate = player.wavesurfer.getPlaybackRate();
            player.wavesurfer.setPlaybackRate(currentRate * rate);
            player.wavesurfer.seekTo(currentTime / player.wavesurfer.getDuration());
        }
        return player;
    });
};

export const togglePlayPause = () => {
    audioPlayer.update(player => {
        if (player) {
            if (player.wavesurfer.isPlaying()) {
                player.wavesurfer.pause();
            } else {
                player.wavesurfer.play();
            }
        }
        return player;
    });
};

export const volume = writable(100); // Store for volume (percentage)

export const setPlaybackSpeed = (rate: number) => {
    audioPlayer.update(player => {
        if (player) {
            const currentTime = player.wavesurfer.getCurrentTime();
            player.wavesurfer.setPlaybackRate(rate);
            player.wavesurfer.seekTo(currentTime / player.wavesurfer.getDuration());
        }
        return player;
    });
};

export const adjustVolume = (change: number) => {
    volume.update(currentVolume => {
        let newVolume = Math.max(0, Math.min(100, currentVolume + change * 100));
        audioPlayer.update(player => {
            if (player) {
                player.wavesurfer.setVolume(newVolume / 100);
            }
            return player;
        });
        return newVolume;
    });
};

export const currentTime = derived(audioPlayer, $audioPlayer =>
    $audioPlayer ? $audioPlayer.wavesurfer.getCurrentTime() : 0
);

export const duration = derived(audioPlayer, $audioPlayer =>
    $audioPlayer ? $audioPlayer.wavesurfer.getDuration() : 0
);

// Don't forget to clear the interval when the audio player is no longer needed
export const destroyAudioPlayer = () => {
    clearInterval(refreshInterval);
};