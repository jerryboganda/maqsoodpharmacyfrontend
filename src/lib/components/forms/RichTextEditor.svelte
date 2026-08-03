<script lang="ts">
  import { onMount } from 'svelte'
  import { Editor } from '@tiptap/core'
  import Placeholder from '@tiptap/extension-placeholder'
  import StarterKit from '@tiptap/starter-kit'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'

  let editorElement: HTMLDivElement
  let editor: Editor | null = null
  let html = '<h2>Write a clear update</h2><p>Use the editor to compose rich Adminex content with the same local, client-side behavior.</p>'

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Start writing...' }),
      ],
      content: html,
      onUpdate: ({ editor: currentEditor }) => {
        html = currentEditor.getHTML()
      },
    })

    return () => editor?.destroy()
  })

  function run(command: 'bold' | 'italic' | 'strike' | 'bulletList' | 'orderedList'): void {
    if (!editor) return
    const chain = editor.chain().focus()
    if (command === 'bold') chain.toggleBold().run()
    if (command === 'italic') chain.toggleItalic().run()
    if (command === 'strike') chain.toggleStrike().run()
    if (command === 'bulletList') chain.toggleBulletList().run()
    if (command === 'orderedList') chain.toggleOrderedList().run()
  }

  function setHeading(level: 1 | 2 | 3): void {
    editor?.chain().focus().toggleHeading({ level }).run()
  }
</script>

<div class="overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700">
  <div class="flex flex-wrap items-center gap-1 border-b border-surface-200 bg-surface-50 p-2 dark:border-surface-700 dark:bg-surface-800/70" aria-label="Editor toolbar">
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-sm font-bold text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" aria-label="Bold" on:click={() => run('bold')}>B</button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-sm italic text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" aria-label="Italic" on:click={() => run('italic')}>I</button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-sm line-through text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" aria-label="Strike" on:click={() => run('strike')}>S</button>
    <span class="mx-1 h-5 w-px bg-surface-200 dark:bg-surface-700"></span>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" on:click={() => setHeading(1)}>H1</button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" on:click={() => setHeading(2)}>H2</button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" on:click={() => setHeading(3)}>H3</button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" aria-label="Bullet list" on:click={() => run('bulletList')}><Icon icon={Icons.list} className="h-4 w-4" /></button>
    <button type="button" class="rounded-lg px-2.5 py-1.5 text-secondary-700 hover:bg-white dark:text-secondary-200 dark:hover:bg-surface-700" aria-label="Numbered list" on:click={() => run('orderedList')}><Icon icon={Icons.listNumbers} className="h-4 w-4" /></button>
  </div>
  <div bind:this={editorElement} class="prose prose-sm min-h-[280px] max-w-none bg-white p-5 text-secondary-800 outline-none dark:bg-surface-900 dark:text-secondary-200"></div>
</div>

<p class="mt-3 text-xs text-secondary-400">Changes are kept in the current client session and follow the original mock-data behavior.</p>
