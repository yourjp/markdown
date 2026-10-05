import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  const tabs = [
    { id: 'a', name: 'A.md', content: '# A', timestamp: 1 },
    { id: 'b', name: 'B.md', content: '# B', timestamp: 2, isModified: true },
  ];

  it('renders tabs, active styling, and modified indicator', () => {
    const { container } = render(
      <TabBar tabs={tabs} activeTabId="b" onSelectTab={vi.fn()} onCloseTab={vi.fn()} onNewTab={vi.fn()} />,
    );

    expect(screen.getByText('A.md')).toBeInTheDocument();
    expect(screen.getByText('B.md').parentElement).toHaveClass('text-blue-400');
    expect(container.querySelector('[title="수정됨"]')).toBeInTheDocument();
  });

  it('calls select, close, and new-tab callbacks', () => {
    const onSelectTab = vi.fn();
    const onCloseTab = vi.fn();
    const onNewTab = vi.fn();
    render(
      <TabBar tabs={tabs} activeTabId="a" onSelectTab={onSelectTab} onCloseTab={onCloseTab} onNewTab={onNewTab} />,
    );

    fireEvent.click(screen.getByText('B.md'));
    expect(onSelectTab).toHaveBeenCalledWith('b');

    fireEvent.click(screen.getAllByTitle('탭 닫기')[0]);
    expect(onCloseTab).toHaveBeenCalledWith('a', expect.any(Object));

    fireEvent.click(screen.getByTitle('새 문서 탭 열기 (Ctrl+Alt+N)'));
    expect(onNewTab).toHaveBeenCalled();
  });
});
