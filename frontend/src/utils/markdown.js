export function jsonToPlainText(json) {
  if (!json || !json.content) return '';

  const processNode = (node) => {
    if (!node) return '';

    switch (node.type) {
      case 'doc':
        return node.content.map(processNode).join('');

      case 'paragraph':
        return (node.content ? node.content.map(processNode).join('') : '') + '\n\n';

      case 'text':
        return node.text || '';

      case 'heading':
        return (node.content ? node.content.map(processNode).join('') : '') + '\n\n';

      case 'bulletList':
      case 'orderedList':
        return (node.content ? node.content.map(processNode).join('') : '') + '\n';

      case 'listItem':
        return (node.content ? node.content.map(processNode).join('').trim() : '') + '\n';

      case 'codeBlock':
        return (node.content ? node.content.map(n => n.text).join('') : '') + '\n\n';

      case 'horizontalRule':
        return '\n---\n\n';

      case 'hardBreak':
        return '\n';

      default:
        if (node.content) return node.content.map(processNode).join('');
        return '';
    }
  };

  return processNode(json).trim();
}

export function jsonToMarkdown(json) {
  if (!json || !json.content) return '';

  const processNode = (node, indent = '') => {
    if (!node) return '';

    switch (node.type) {
      case 'doc':
        return node.content.map(n => processNode(n)).join('');

      case 'paragraph':
        const pContent = node.content ? node.content.map(n => processNode(n)).join('') : '';
        return pContent ? `${pContent}\n\n` : '\n';

      case 'text':
        let text = node.text || '';
        if (node.marks) {
          // Sort marks to ensure consistent output (e.g., bold then italic)
          const sortedMarks = [...node.marks].sort((a, b) => a.type.localeCompare(b.type));
          sortedMarks.forEach(mark => {
            if (mark.type === 'bold') text = `**${text}**`;
            if (mark.type === 'italic') text = `*${text}*`;
            if (mark.type === 'underline') text = `<u>${text}</u>`;
            if (mark.type === 'strike') text = `~~${text}~~`;
            if (mark.type === 'code') text = `\`${text}\``;
          });
        }
        return text;

      case 'heading':
        const level = node.attrs?.level || 1;
        const hContent = node.content ? node.content.map(n => processNode(n)).join('') : '';
        return `${'#'.repeat(level)} ${hContent}\n\n`;

      case 'bulletList':
        return (node.content ? node.content.map(n => processNode(n, indent)).join('') : '') + '\n';

      case 'orderedList':
        return (node.content ? node.content.map((n, i) => {
          // Pass index to listItem if we wanted to support 1. 2. 3.
          // But Tiptap's listItem doesn't know its index easily here
          return processNode(n, indent);
        }).join('') : '') + '\n';

      case 'listItem':
        const liContent = node.content ? node.content.map(n => {
          // If child is a paragraph, we want to avoid the extra newlines
          if (n.type === 'paragraph') {
            return n.content ? n.content.map(cn => processNode(cn)).join('') : '';
          }
          return processNode(n, indent + '  ');
        }).join('').trim() : '';
        return `${indent}* ${liContent}\n`;

      case 'codeBlock':
        const codeContent = node.content ? node.content.map(n => n.text).join('') : '';
        const language = node.attrs?.language || '';
        return `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`;

      case 'horizontalRule':
        return '---\n\n';

      case 'hardBreak':
        return '\n';

      case 'blockquote':
        const bContent = node.content ? node.content.map(n => processNode(n, indent + '> ')).join('').trim() : '';
        return `> ${bContent}\n\n`;

      default:
        if (node.content) return node.content.map(n => processNode(n, indent)).join('');
        return '';
    }
  };

  return processNode(json).trim();
}
