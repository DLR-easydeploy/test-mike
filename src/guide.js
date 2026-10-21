function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function inlineMarkdown(value) {
  return value.replace(/`([^`]+)`|\[([^\]]+)\]\((ai-docs\/[a-z0-9-]+\.md)\)|[&<>"']/g,
    (match, code, label, documentPath) => {
      if (code !== undefined) return `<code>${escapeHtml(code)}</code>`;
      if (documentPath !== undefined) {
        return `<a href="/${documentPath}">${escapeHtml(label)}</a>`;
      }
      return escapeHtml(match);
    });
}

// Render the Markdown used by AGENTS.md without dependencies or embedded HTML.
function renderMarkdown(lines) {
  const html = [];
  let block = [];
  let listType = '';
  let code = null;

  function flush() {
    if (block.length) {
      html.push(listType
        ? `<${listType}>${block.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`
        : `<p>${inlineMarkdown(block.join(' '))}</p>`);
    }
    block = [];
    listType = '';
  }

  for (const line of lines) {
    if (/^```/.test(line)) {
      flush();
      if (code === null) {
        code = [];
      } else {
        html.push(`<pre tabindex="0"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      }
    } else if (code !== null) {
      code.push(line);
    } else if (!line.trim()) {
      flush();
    } else if (/^#{3,6} /.test(line)) {
      flush();
      html.push(`<h4>${inlineMarkdown(line.replace(/^#+ /, ''))}</h4>`);
    } else {
      const item = line.match(/^(-|\d+\.) (.*)$/);
      if (item) {
        const type = item[1] === '-' ? 'ul' : 'ol';
        if (listType !== type) flush();
        listType = type;
        block.push(item[2]);
      } else if (listType && /^\s+/.test(line)) {
        block[block.length - 1] += ' ' + line.trim();
      } else {
        if (listType) flush();
        block.push(line.trim());
      }
    }
  }
  flush();
  if (code !== null) html.push(`<pre tabindex="0"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return html.join('\n');
}

function renderGuide(markdown) {
  let title = 'Project instructions';
  const intro = [];
  const sections = [];
  let lines = intro;
  let inCode = false;

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) inCode = !inCode;
    if (!inCode && /^# /.test(line)) {
      title = line.slice(2);
    } else if (!inCode && /^## /.test(line)) {
      lines = [];
      sections.push({ title: line.slice(3), lines });
    } else {
      lines.push(line);
    }
  }

  return {
    title,
    intro: renderMarkdown(intro),
    sections: sections.map(section => ({
      title: section.title,
      html: renderMarkdown(section.lines),
    })),
  };
}

module.exports = { renderGuide };
