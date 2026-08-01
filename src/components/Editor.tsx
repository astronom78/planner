import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import './editor.css'

interface EditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  small?: boolean
}

export default function Editor({ content, onChange, placeholder, small }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'rich-editor' + (small ? ' small' : ''),
        'data-placeholder': placeholder ?? 'Напишите заметку…',
      },
    },
  })

  const btn = (label: string, title: string, active: boolean, action: () => void) => (
    <button
      key={label}
      type="button"
      title={title}
      className={'tb-btn' + (active ? ' active' : '')}
      onMouseDown={(e) => {
        e.preventDefault()
        action()
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="editor-wrap">
      <div className="toolbar">
        {btn('Ж', 'Жирный', editor?.isActive('bold') ?? false, () => editor?.chain().focus().toggleBold().run())}
        {btn('К', 'Курсив', editor?.isActive('italic') ?? false, () => editor?.chain().focus().toggleItalic().run())}
        {btn('H1', 'Заголовок', editor?.isActive('heading', { level: 2 }) ?? false, () =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {btn('•', 'Список', editor?.isActive('bulletList') ?? false, () =>
          editor?.chain().focus().toggleBulletList().run(),
        )}
        {btn('1.', 'Нумерованный список', editor?.isActive('orderedList') ?? false, () =>
          editor?.chain().focus().toggleOrderedList().run(),
        )}
        {btn('⌫', 'Убрать форматирование', false, () => editor?.chain().focus().unsetAllMarks().clearNodes().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
