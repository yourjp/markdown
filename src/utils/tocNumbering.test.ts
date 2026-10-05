import { describe, expect, it } from 'vitest';
import { stripHeadingNumbering, generateTocNumbering } from './tocNumbering';
import { HeadingItem } from '../types';

describe('stripHeadingNumbering', () => {
  it('strips decimal and hierarchical numbering', () => {
    expect(stripHeadingNumbering('1. 개발 목표')).toBe('개발 목표');
    expect(stripHeadingNumbering('1.1 파일 열기')).toBe('파일 열기');
    expect(stripHeadingNumbering('1.1. 파일 열기')).toBe('파일 열기');
    expect(stripHeadingNumbering('1.2.3. 세부 기능')).toBe('세부 기능');
    expect(stripHeadingNumbering('1-1. 세부 사항')).toBe('세부 사항');
    expect(stripHeadingNumbering('1) 개요')).toBe('개요');
    expect(stripHeadingNumbering('1.1) 서브 개요')).toBe('서브 개요');
  });

  it('strips bracketed and parenthesized numbering', () => {
    expect(stripHeadingNumbering('(1) 첫번째 항목')).toBe('첫번째 항목');
    expect(stripHeadingNumbering('[1] 첫번째 항목')).toBe('첫번째 항목');
    expect(stripHeadingNumbering('(1.1) 서브 항목')).toBe('서브 항목');
    expect(stripHeadingNumbering('(A) 알파벳 항목')).toBe('알파벳 항목');
    expect(stripHeadingNumbering('[B] 대괄호 알파벳')).toBe('대괄호 알파벳');
    expect(stripHeadingNumbering('(가) 한글 항목')).toBe('한글 항목');
    expect(stripHeadingNumbering('(I) 로마숫자 항목')).toBe('로마숫자 항목');
  });

  it('strips letter numbering', () => {
    expect(stripHeadingNumbering('A. 소개')).toBe('소개');
    expect(stripHeadingNumbering('A) 소개')).toBe('소개');
    expect(stripHeadingNumbering('b. 서브 섹션')).toBe('서브 섹션');
    expect(stripHeadingNumbering('C: 결론')).toBe('결론');
    expect(stripHeadingNumbering('D - 기타')).toBe('기타');
  });

  it('strips Roman numerals', () => {
    expect(stripHeadingNumbering('I. 서론')).toBe('서론');
    expect(stripHeadingNumbering('II. 본론')).toBe('본론');
    expect(stripHeadingNumbering('III. 분석')).toBe('분석');
    expect(stripHeadingNumbering('IV. 결론')).toBe('결론');
    expect(stripHeadingNumbering('iv) 소결론')).toBe('소결론');
  });

  it('strips Korean chapter/section headers and Hangul ordinals', () => {
    expect(stripHeadingNumbering('제1장 총칙')).toBe('총칙');
    expect(stripHeadingNumbering('제 1 장: 총칙')).toBe('총칙');
    expect(stripHeadingNumbering('제1절 정의')).toBe('정의');
    expect(stripHeadingNumbering('제 1 조 목적')).toBe('목적');
    expect(stripHeadingNumbering('가. 첫째')).toBe('첫째');
    expect(stripHeadingNumbering('나) 둘째')).toBe('둘째');
    expect(stripHeadingNumbering('일. 서두')).toBe('서두');
  });

  it('strips circled numbers and special bullet characters', () => {
    expect(stripHeadingNumbering('① 기본 설정')).toBe('기본 설정');
    expect(stripHeadingNumbering('② 세부 설정')).toBe('세부 설정');
    expect(stripHeadingNumbering('⑴ 첫번째')).toBe('첫번째');
    expect(stripHeadingNumbering('❶ 강조 번호')).toBe('강조 번호');
  });

  it('strips keywords like Step, Phase, Chapter, Section', () => {
    expect(stripHeadingNumbering('Step 1. 환경 설정')).toBe('환경 설정');
    expect(stripHeadingNumbering('Phase 1: 기획 단계')).toBe('기획 단계');
    expect(stripHeadingNumbering('Chapter 1. 시작하기')).toBe('시작하기');
    expect(stripHeadingNumbering('Section 1 - 아키텍처')).toBe('아키텍처');
  });

  it('preserves regular titles and normal words', () => {
    expect(stripHeadingNumbering('2024년 결산')).toBe('2024년 결산');
    expect(stripHeadingNumbering('3D 그래픽 엔진')).toBe('3D 그래픽 엔진');
    expect(stripHeadingNumbering('4K 해상도 지원')).toBe('4K 해상도 지원');
    expect(stripHeadingNumbering('C++ 프로그래밍')).toBe('C++ 프로그래밍');
    expect(stripHeadingNumbering('AI 도입 전략')).toBe('AI 도입 전략');
    expect(stripHeadingNumbering('100가지 팁')).toBe('100가지 팁');
    expect(stripHeadingNumbering('API 연동')).toBe('API 연동');
    expect(stripHeadingNumbering('About this project')).toBe('About this project');
  });
});

describe('generateTocNumbering', () => {
  it('does not number single top H1, numbers multi-child subheadings with A./1)/a., and single children with •', () => {
    const headings: HeadingItem[] = [
      { id: 'doc-title', title: 'Main Document Title', level: 1 },
      { id: 'sec-1', title: 'First Section', level: 2 },
      { id: 'sub-1-1', title: 'Subsection A', level: 3 },
      { id: 'sub-1-1-1', title: 'Detail 1)', level: 4 },
      { id: 'sub-1-1-2', title: 'Detail 2)', level: 4 },
      { id: 'sub-1-1-2-1', title: 'Sub-detail a.', level: 5 },
      { id: 'sub-1-1-2-2', title: 'Sub-detail b.', level: 5 },
      { id: 'sub-1-2', title: 'Subsection B', level: 3 },
      { id: 'sec-2', title: 'Second Section', level: 2 },
      { id: 'sub-2-1', title: 'Single Subsection', level: 3 },
      { id: 'sub-2-1-1', title: 'Single Detail', level: 4 },
      { id: 'sub-2-1-1-1', title: 'Single Leaf', level: 5 },
    ];

    expect(generateTocNumbering(headings)).toEqual([
      '',
      '1.',
      'A.',
      '1)',
      '2)',
      'a.',
      'b.',
      'B.',
      '2.',
      '•',
      '•',
      '•',
    ]);
  });

  it('numbers H1s hierarchically when multiple H1s exist, using • for single children', () => {
    const headings: HeadingItem[] = [
      { id: 'part-1', title: 'Part 1', level: 1 },
      { id: 'p1-s1', title: 'Section 1', level: 2 },
      { id: 'p1-s1-1', title: 'Detail A', level: 3 },
      { id: 'p1-s1-1-1', title: 'Deep item 1)', level: 4 },
      { id: 'p1-s1-1-1-a', title: 'Deep letter item a.', level: 5 },
      { id: 'p1-s1-1-1-b', title: 'Deep letter item b.', level: 5 },
      { id: 'p1-s1-1-2', title: 'Deep item 2)', level: 4 },
      { id: 'part-2', title: 'Part 2', level: 1 },
      { id: 'p2-s1', title: 'Section 1', level: 2 },
    ];

    expect(generateTocNumbering(headings)).toEqual([
      '1.',
      '•',
      '•',
      '1)',
      'a.',
      'b.',
      '2)',
      '2.',
      '•',
    ]);
  });

  it('marks single child subheadings with bullet • when parent only has one child', () => {
    const headings: HeadingItem[] = [
      { id: 'sec-1', title: 'Project Overview', level: 2 },
      { id: 'sub-1', title: 'Background', level: 3 }, // single child -> •
      { id: 'sec-2', title: 'Development Plan', level: 2 },
      { id: 'sub-2-1', title: 'Frontend', level: 3 }, // sibling 1 -> A.
      { id: 'sub-2-2', title: 'Backend', level: 3 }, // sibling 2 -> B.
    ];

    expect(generateTocNumbering(headings)).toEqual([
      '1.',
      '•',
      '2.',
      'A.',
      'B.',
    ]);
  });

  it('numbers single H1 when there are no subheadings', () => {
    const headings: HeadingItem[] = [
      { id: 'single', title: 'Single Heading', level: 1 },
    ];

    expect(generateTocNumbering(headings)).toEqual(['1.']);
  });

  it('numbers multiple H1-only documents', () => {
    const headings: HeadingItem[] = [
      { id: 'h1-1', title: 'Chapter 1', level: 1 },
      { id: 'h1-2', title: 'Chapter 2', level: 1 },
      { id: 'h1-3', title: 'Chapter 3', level: 1 },
    ];

    expect(generateTocNumbering(headings)).toEqual(['1.', '2.', '3.']);
  });

  it('handles documents starting from H2 without H1 and applies bullet to single child', () => {
    const headings: HeadingItem[] = [
      { id: '1', title: 'Section 1', level: 2 },
      { id: '2', title: 'Subsection A', level: 3 },
      { id: '3', title: 'Detail 1)', level: 4 },
      { id: '4', title: 'Detail 2)', level: 4 },
      { id: '5', title: 'Sub-item a.', level: 5 },
      { id: '6', title: 'Section 2', level: 2 },
    ];

    expect(generateTocNumbering(headings)).toEqual(['1.', '•', '1)', '2)', '•', '2.']);
  });

  it('handles empty headings array', () => {
    expect(generateTocNumbering([])).toEqual([]);
  });
});
