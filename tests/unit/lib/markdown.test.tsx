import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MarkdownPreview } from '@/lib/markdown';

afterEach(() => cleanup());

describe('MarkdownPreview', () => {
  describe('Given standard markdown (heading + list + code)', () => {
    describe('When rendered', () => {
      it('Then heading and code are present in the DOM', () => {
        const md = '# Title\n\n- one\n- two\n\n```js\nconst a = 1;\n```\n';
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('h1')?.textContent).toBe('Title');
        expect(container.querySelectorAll('li')).toHaveLength(2);
        expect(container.querySelector('code')?.textContent).toContain('const a = 1;');
      });
    });
  });

  describe('Given GFM features (table + task list + strikethrough)', () => {
    describe('When rendered', () => {
      it('Then all three render', () => {
        const md = `| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~strike~~\n`;
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('table')).not.toBeNull();
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
        expect(container.querySelector('del')?.textContent).toBe('strike');
      });
    });
  });

  describe('Given a body containing <script>', () => {
    describe('When rendered', () => {
      it('Then no script element appears in the DOM', () => {
        const md = "Hello\n\n<script>alert('xss')</script>\n";
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('script')).toBeNull();
      });
    });
  });

  describe('Given a body with an <iframe>', () => {
    describe('When rendered', () => {
      it('Then no iframe element appears', () => {
        const md = '<iframe src="https://evil.example.com"></iframe>\n';
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('iframe')).toBeNull();
      });
    });
  });

  describe('Given a link with javascript: URL', () => {
    describe('When rendered', () => {
      it('Then the href is stripped or rewritten', () => {
        const md = "[click](javascript:alert('xss'))\n";
        const { container } = render(<MarkdownPreview source={md} />);
        const a = container.querySelector('a');
        // Either stripped to no href OR rewritten to a safe value
        expect(a?.getAttribute('href')?.startsWith('javascript:') ?? false).toBe(false);
      });
    });
  });

  describe('Given a body with an inline onclick attribute', () => {
    describe('When rendered', () => {
      it('Then no element with onclick reaches the DOM', () => {
        // react-markdown v10 strips raw HTML by default, so the <a> is removed
        // entirely; rehype-sanitize would also strip onclick if it were preserved.
        // Either path satisfies "no onclick reaches the DOM".
        const md = '<a href="https://example.com" onclick="alert(1)">x</a>\n';
        const { container } = render(<MarkdownPreview source={md} />);
        expect(container.querySelector('[onclick]')).toBeNull();
      });
    });
  });
});
