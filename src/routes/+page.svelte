<script>
	import Waveform from '$lib/Waveform.svelte';
	import Annotations from '$lib/Annotations.svelte';
	import PlayControls from '$lib/PlayControls.svelte';
	import Description from '$lib/Description.svelte';
</script>

<div class="flex flex-col w-screen">
	<section class="flex flex-col items-center border-2 m-4">
		<Waveform />
		<PlayControls />
	</section>
	<section class="border-2 m-4">
		<Annotations></Annotations>
	</section>
	<section class="border-2 m-4">
		<Description></Description>
	</section>
</div>
