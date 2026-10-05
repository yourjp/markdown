import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownSource } from './MarkdownSource';

describe('MarkdownSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces textarea changes before calling onChange', () => {
    const onChange = vi.fn();
    render(<MarkdownSource markdown="old" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new markdown' } });

    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(150));
    expect(onChange).toHaveBeenCalledWith('new markdown');
  });

  it('flushes the latest value on blur', () => {
    const onChange = vi.fn();
    render(<MarkdownSource markdown="old" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'changed' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith('changed');
  });

  it('inserts two spaces when Tab is pressed', () => {
    const onChange = vi.fn();
    render(<MarkdownSource markdown="ab" onChange={onChange} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(1, 1);
    fireEvent.keyDown(textarea, { key: 'Tab' });

    expect(textarea.value).toBe('a  b');
    act(() => vi.advanceTimersByTime(150));
    expect(onChange).toHaveBeenCalledWith('a  b');
  });

  it('renders line numbers and source heading anchors', () => {
    const { container } = render(<MarkdownSource markdown={'# Title\nbody\n## Next'} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelector('#source-heading-title')).toBeInTheDocument();
    expect(container.querySelector('#source-heading-next')).toBeInTheDocument();
  });

  it('renders bookmark icon in line gutter for bookmarked lines', () => {
    const bookmarks = [
      { id: 'bm-1', title: '소스 책갈피', lineIndex: 1, snippet: 'body', createdAt: Date.now() },
    ];

    render(
      <MarkdownSource
        markdown={'# Title\nbody\n## Next'}
        bookmarks={bookmarks}
      />
    );

    expect(screen.getByTitle(/책갈피: 소스 책갈피 \(L2\)/)).toBeInTheDocument();
  });
});
