import type { UIElements } from './ui';

/**
 * Attempt to extract the Instagram item_id from a clicked message DOM element.
 * Instagram may store this in data attributes or in the React fiber tree.
 * Returns null if extraction fails.
 */
function extractItemId(element: HTMLElement): string | null {
  // Walk up from clicked element to find the message container
  let el: HTMLElement | null = element;
  while (el && el !== document.body) {
    // Check data attributes
    if (el.dataset.itemId) return el.dataset.itemId;
    if (el.dataset.messageId) return el.dataset.messageId;

    // Check React fiber internals (Instagram uses React)
    const fiberKey = Object.keys(el).find((key) => key.startsWith('__reactFiber$'));
    if (fiberKey) {
      let fiber = (el as any)[fiberKey];
      // Walk up the fiber tree looking for message props
      let depth = 0;
      while (fiber && depth < 15) {
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props) {
          if (props.itemId) return String(props.itemId);
          if (props.item_id) return String(props.item_id);
          if (props.message?.item_id) return String(props.message.item_id);
          if (props.messageId) return String(props.messageId);
        }
        fiber = fiber.return;
        depth++;
      }
    }

    el = el.parentElement;
  }
  return null;
}

/**
 * Extract a text preview from the clicked message element.
 */
function extractPreview(element: HTMLElement): string {
  const text = element.textContent?.trim() || '';
  if (text.length > 50) return text.substring(0, 50) + '...';
  return text || '[media]';
}

/**
 * Enter pick mode: highlight messages on hover, capture click.
 * Returns a cleanup function to exit pick mode.
 */
export function enterPickMode(
  uiElements: UIElements,
  onPicked: (itemId: string, preview: string) => void,
  onFail: () => void,
): () => void {
  document.body.classList.add('uninsta-pick-mode');
  uiElements.btnPick.textContent = 'Click a message...';
  uiElements.btnPick.disabled = true;

  function handleClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const itemId = extractItemId(target);

    if (itemId) {
      const preview = extractPreview(target);
      onPicked(itemId, preview);
    } else {
      onFail();
    }

    cleanup();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      cleanup();
      onFail();
    }
  }

  // Use capture phase to intercept before Instagram's own handlers
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);

  function cleanup(): void {
    document.body.classList.remove('uninsta-pick-mode');
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown, true);
    uiElements.btnPick.textContent = 'Pick message';
    uiElements.btnPick.disabled = false;
  }

  return cleanup;
}
