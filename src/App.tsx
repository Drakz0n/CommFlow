import { useEffect, useState, useRef } from 'react';
import MainViewport from './pages/MainViewport';
import { ClientProvider } from './contexts/ClientContext';
import { CommissionProvider } from './contexts/CommissionContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { useDataSync } from './hooks/useDataSync';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Development configuration
const DEV_CONFIG = {
  ENABLE_DEVTOOLS_SHORTCUTS: true, // Set to false to block F12, Ctrl+Shift+I, etc.
};

function DataSyncWrapper() {
  /**
   * Manual sync control prevents unnecessary polling overhead.
   * We only sync when the user explicitly needs fresh data.
   */
  const { syncNow } = useDataSync(false);
  
  /**
   * Bootstrap data load on app startup.
   * Essential for offline-first behavior when Tauri starts without network.
   */
  useEffect(() => {
    syncNow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return <MainViewport />;
}

function AppContent() {
  const { settings } = useSettings();

  /**
   * Respect user animation preferences for accessibility.
   * Some users prefer reduced motion for better UX.
   */
  useEffect(() => {
    if (settings.animations) {
      document.body.classList.remove('no-animations');
    } else {
      document.body.classList.add('no-animations');
    }
  }, [settings.animations]);

  return (
    <ClientProvider>
      <CommissionProvider>
        <DevtoolsGuard />
        <CustomContextMenu />
        
        <DataSyncWrapper />
      </CommissionProvider>
    </ClientProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ErrorBoundary>
  );
}

function CustomContextMenu() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [selectionText, setSelectionText] = useState<string>('');
  const [isEditable, setIsEditable] = useState(false);

  // helper clipboard wrappers: use navigator.clipboard only to avoid bundler issues
  const readFromClipboard = async () => {
    try {
      const n = await navigator.clipboard.readText();
      return n ?? '';
    } catch {
      return '';
    }
  };

  const writeToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
     const onContext = async (e: MouseEvent) => {
       const target = e.target as HTMLElement | null;
       if (!target) return;
       const editable = target.closest('input, textarea, [contenteditable="true"]') as HTMLElement | null;

      // Determine selection for non-input elements
      let sel = '';
      if (!editable) {
        sel = window.getSelection()?.toString().trim() || '';
      } else {
        // For inputs/textareas get selection from element
        if ((editable as HTMLInputElement).selectionStart !== undefined) {
          const el = editable as HTMLInputElement | HTMLTextAreaElement;
          const start = (el as any).selectionStart ?? 0;
          const end = (el as any).selectionEnd ?? 0;
          sel = el.value?.substring(start, end).trim() || '';
        } else if (editable.isContentEditable) {
          sel = window.getSelection()?.toString().trim() || '';
        }
      }

      // If editable or there's a selection, show our custom menu
      if (editable || sel) {
        e.preventDefault();
        targetRef.current = editable || target;
        setPos({ x: e.clientX, y: e.clientY });
        setIsEditable(!!editable);
        setSelectionText(sel);
        setVisible(true);
      } else {
        // suppress context menu otherwise
        e.preventDefault();
        setVisible(false);
        targetRef.current = null;
        setSelectionText('');
      }
    };

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    document.addEventListener('contextmenu', onContext, true);
    document.addEventListener('mousedown', onClick, true);

    return () => {
      document.removeEventListener('contextmenu', onContext, true);
      document.removeEventListener('mousedown', onClick, true);
    };
  }, []);

  const doCopy = async () => {
    try {
      if (isEditable && targetRef.current) {
        const el = targetRef.current as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
        if ((el as HTMLInputElement).selectionStart !== undefined) {
          const input = el as HTMLInputElement | HTMLTextAreaElement;
          const start = (input as any).selectionStart ?? 0;
          const end = (input as any).selectionEnd ?? 0;
          const text = input.value.substring(start, end);
          await writeToClipboard(text);
        } else if (el.isContentEditable) {
          const text = window.getSelection()?.toString() || '';
          await writeToClipboard(text);
        }
      } else {
        const text = window.getSelection()?.toString() || '';
        if (text) await writeToClipboard(text);
      }
    } catch {
      // ignore clipboard errors
    }
    setVisible(false);
  };

  const doPaste = async () => {
    if (!isEditable || !targetRef.current) return setVisible(false);
    try {
      const pasteText = await readFromClipboard();
      const el = targetRef.current as HTMLElement;
      // Input/textarea handling
      if ((el as HTMLInputElement).selectionStart !== undefined) {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const start = (input as any).selectionStart ?? input.value.length;
        const end = (input as any).selectionEnd ?? input.value.length;
        const before = input.value.substring(0, start);
        const after = input.value.substring(end);
        input.value = before + pasteText + after;
        // move caret after pasted text
        const pos = start + pasteText.length;
        (input as any).selectionStart = pos;
        (input as any).selectionEnd = pos;
        // dispatch input event so React updates
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (el.isContentEditable) {
        // Insert at caret for contenteditable
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          sel.deleteFromDocument();
          sel.getRangeAt(0).insertNode(document.createTextNode(pasteText));
          // move caret after inserted text
          sel.collapseToEnd();
        }
      }
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const doCut = async () => {
    if (!isEditable || !targetRef.current) return setVisible(false);
    try {
      const el = targetRef.current as HTMLElement;
      if ((el as HTMLInputElement).selectionStart !== undefined) {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const start = (input as any).selectionStart ?? 0;
        const end = (input as any).selectionEnd ?? 0;
        const selected = input.value.substring(start, end);
        if (selected) {
          await writeToClipboard(selected);
          // remove selected text
          const before = input.value.substring(0, start);
          const after = input.value.substring(end);
          input.value = before + after;
          const pos = start;
          (input as any).selectionStart = pos;
          (input as any).selectionEnd = pos;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else if (el.isContentEditable) {
        const sel = window.getSelection();
        const selected = sel?.toString() || '';
        if (selected && sel && sel.rangeCount > 0) {
          await writeToClipboard(selected);
          sel.deleteFromDocument();
          // dispatch input-like event on the contenteditable element
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        background: '#111827',
        color: '#fff',
        borderRadius: 6,
        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
        padding: '6px',
        minWidth: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Copy first */}
      {(selectionText || (!isEditable && window.getSelection()?.toString())) && (
        <button className="cf-btn cf-btn--tertiary" onClick={doCopy} style={{ width: '100%' }}>
          Copy
        </button>
      )}

      {/* Paste next: only shown for editable targets; enable always and read clipboard on click */}
      {isEditable && (
        <button
          className="cf-btn cf-btn--tertiary"
          onClick={doPaste}
          disabled={false} // enable paste and attempt clipboard read on click (pre-read may be blocked)
          style={{ width: '100%' }}
        >
          Paste
        </button>
      )}

      {/* Cut last: only for editable targets when there is a selection */}
      {isEditable && (selectionText || (isEditable && window.getSelection()?.toString())) && (
        <button className="cf-btn cf-btn--tertiary" onClick={doCut} style={{ width: '100%' }}>
          Cut
        </button>
      )}
    </div>
  );
}

function DevtoolsGuard() {
  useEffect(() => {
    // Block common devtools shortcuts based on configuration
    const onKeyDown = (e: KeyboardEvent) => {
      if (!DEV_CONFIG.ENABLE_DEVTOOLS_SHORTCUTS) {
        const key = e.key.toLowerCase();
        if (
          key === 'f12' ||
          (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
          (e.metaKey && e.altKey && key === 'i') // mac variant
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Suppress context menu except for inputs, textareas, contenteditable
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const editable = target.closest('input, textarea, [contenteditable="true"]');
      // Allow default context menu for editable/selectable areas
      if (editable) return;
      // If there is a text selection, you might want to allow copy via keyboard (Ctrl/Cmd+C)
      // Prevent inspect/context menu otherwise
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, []);

  return null;
}

export default App;
