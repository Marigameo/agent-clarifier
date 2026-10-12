<!-- Svelte 5 (runes): an event name with a colon, passed through a spread. -->
<script lang="ts">
  let { q, onresult }: { q: unknown; onresult: (d: unknown) => void } = $props();
</script>

<agent-clarifier placement="dock" questionnaire={q} {...{ 'onclarify:submit': (e: CustomEvent) => onresult(e.detail) }}></agent-clarifier>
