<!-- Svelte 5: the legacy on: directive (still supported, deprecated in runes mode). -->
<script lang="ts">
  let { q, onresult }: { q: unknown; onresult: (d: unknown) => void } = $props();
</script>

<!-- svelte-ignore event_directive_deprecated -->
<agent-clarifier placement="dock" questionnaire={q} on:clarify:submit={(e: CustomEvent) => onresult(e.detail)}></agent-clarifier>
