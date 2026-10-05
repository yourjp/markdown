import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('restores a saved theme and applies its root class', () => {
    localStorage.setItem('theme', 'sepia');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('sepia');
    expect(document.documentElement).toHaveClass('sepia');
    expect(localStorage.getItem('theme')).toBe('sepia');
  });

  it('cycles light to sepia to dark to light', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('sepia');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement).not.toHaveClass('sepia');
  });
});
