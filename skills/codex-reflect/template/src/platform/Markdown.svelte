<script lang="ts">
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';

  let { content, compact = false }: { content: string; compact?: boolean } = $props();
  const html = $derived(DOMPurify.sanitize(marked.parse(content || '', { breaks: true }) as string));
</script>

<div class:compact class="markdown">{@html html}</div>
