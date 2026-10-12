<!-- Svelte 5 (runes): the on<event> attribute form, as for any DOM event. -->
<script lang="ts">
  let { q, onresult }: { q: unknown; onresult: (d: unknown) => void } = $props();
</script>

<!-- svelte-ignore attribute_illegal_colon -->
<agent-clarifier placement="dock" questionnaire={q} onclarify:submit={(e: CustomEvent) => onresult(e.detail)}></agent-clarifier>
