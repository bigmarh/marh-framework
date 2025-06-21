/**
 * Utility functions for converting HTML to JSX with Mithril-specific syntax
 */

export interface ConversionOptions {
  /** Convert className to class */
  useMithrilAttributes?: boolean;
  /** Convert React event handlers to Mithril lowercase */
  useMithrilEvents?: boolean;
  /** Add key props to list items automatically */
  addKeys?: boolean;
  /** Preserve comments in the output */
  preserveComments?: boolean;
}

const REACT_TO_MITHRIL_ATTRIBUTES: Record<string, string> = {
  'className': 'class',
  'htmlFor': 'for'
};

const REACT_TO_MITHRIL_EVENTS: Record<string, string> = {
  'onClick': 'onclick',
  'onChange': 'onchange',
  'onInput': 'oninput',
  'onSubmit': 'onsubmit',
  'onFocus': 'onfocus',
  'onBlur': 'onblur',
  'onMouseOver': 'onmouseover',
  'onMouseOut': 'onmouseout',
  'onMouseDown': 'onmousedown',
  'onMouseUp': 'onmouseup',
  'onMouseMove': 'onmousemove',
  'onKeyDown': 'onkeydown',
  'onKeyUp': 'onkeyup',
  'onKeyPress': 'onkeypress',
  'onLoad': 'onload',
  'onError': 'onerror'
};

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Convert HTML string to JSX with Mithril syntax
 */
export function htmlToJsx(
  html: string, 
  options: ConversionOptions = {}
): string {
  const opts = {
    useMithrilAttributes: true,
    useMithrilEvents: true,
    addKeys: true,
    preserveComments: false,
    ...options
  };

  let jsx = html;

  // Convert void elements to self-closing
  VOID_ELEMENTS.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
    jsx = jsx.replace(regex, `<${tag}$1 />`);
  });

  // Convert unquoted attributes to quoted
  jsx = jsx.replace(/(\w+)=([^"\s>]+)/g, '$1="$2"');

  // Convert React attributes to Mithril if enabled
  if (opts.useMithrilAttributes) {
    Object.entries(REACT_TO_MITHRIL_ATTRIBUTES).forEach(([react, mithril]) => {
      const regex = new RegExp(`\\b${react}=`, 'g');
      jsx = jsx.replace(regex, `${mithril}=`);
    });
  }

  // Convert React events to Mithril if enabled
  if (opts.useMithrilEvents) {
    Object.entries(REACT_TO_MITHRIL_EVENTS).forEach(([react, mithril]) => {
      const regex = new RegExp(`\\b${react}=`, 'g');
      jsx = jsx.replace(regex, `${mithril}=`);
    });
  }

  // Remove comments if not preserving them
  if (!opts.preserveComments) {
    jsx = jsx.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Clean up extra whitespace
  jsx = jsx.replace(/\s+/g, ' ').trim();

  return jsx;
}

/**
 * Convert React JSX to Mithril JSX
 */
export function reactToMithrilJsx(reactJsx: string): string {
  return htmlToJsx(reactJsx, {
    useMithrilAttributes: true,
    useMithrilEvents: true,
    addKeys: false, // Assume keys are already present in React JSX
    preserveComments: true
  });
}

/**
 * Generate JSX component template
 */
export function generateJsxComponent(
  componentName: string,
  props: string[] = [],
  hasState: boolean = false
): string {
  const propsInterface = props.length > 0 
    ? `interface ${componentName}Props {\n  ${props.join(';\n  ')};\n}\n\n`
    : '';

  const propsType = props.length > 0 ? `<${componentName}Props>` : '';
  const stateType = hasState ? ', State' : '';

  return `${propsInterface}export const ${componentName}: MarhComponent${propsType}${stateType} = {
  ${hasState ? 'oninit() {\n    // Initialize state\n  },\n\n  ' : ''}view(${props.length > 0 ? '{ attrs }' : ''}) {
    return (
      <div class="${componentName.toLowerCase()}">
        <h1>Hello from ${componentName}</h1>
        ${props.length > 0 ? `<p>Props: {JSON.stringify(attrs)}</p>` : ''}
      </div>
    );
  }
};`;
}

/**
 * Add key props to JSX elements that appear to be in lists
 */
export function addKeysToJsxList(jsx: string, keyExpression: string = 'item.id'): string {
  // Look for .map() calls and add key props
  const mapRegex = /\.map\s*\(\s*([^)]+)\s*=>\s*\(/g;
  
  return jsx.replace(mapRegex, (match, itemVar) => {
    // Extract the item variable name
    const itemName = itemVar.trim().split(',')[0].replace(/[()]/g, '');
    const keyExpr = keyExpression.replace('item', itemName);
    
    return match + `key={${keyExpr}} `;
  });
}

/**
 * Validate JSX for common Mithril-specific issues
 */
export interface ValidationIssue {
  type: 'warning' | 'error';
  message: string;
  line?: number;
  suggestion?: string;
}

export function validateMithrilJsx(jsx: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for React-style className
  if (jsx.includes('className=')) {
    issues.push({
      type: 'warning',
      message: 'Use "class" instead of "className" in Mithril JSX',
      suggestion: 'Replace className= with class='
    });
  }

  // Check for React-style event handlers
  const reactEvents = jsx.match(/on[A-Z]\w+=/g);
  if (reactEvents) {
    issues.push({
      type: 'warning',
      message: 'Use lowercase event handlers in Mithril JSX',
      suggestion: 'Example: onClick → onclick, onSubmit → onsubmit'
    });
  }

  // Check for missing keys in .map()
  const hasMap = jsx.includes('.map(');
  const hasKey = jsx.includes('key=');
  if (hasMap && !hasKey) {
    issues.push({
      type: 'error',
      message: 'Missing key props in list items',
      suggestion: 'Add key={item.id} or similar to JSX elements in .map()'
    });
  }

  // Check for void elements without self-closing
  VOID_ELEMENTS.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*(?<!/)>(?!\\s*</${tag}>)`, 'i');
    if (regex.test(jsx)) {
      issues.push({
        type: 'warning',
        message: `Void element <${tag}> should be self-closing`,
        suggestion: `Use <${tag} /> instead of <${tag}>`
      });
    }
  });

  return issues;
}

/**
 * Format JSX with proper indentation
 */
export function formatJsx(jsx: string, indentSize: number = 2): string {
  const lines = jsx.split('\n');
  let indentLevel = 0;
  const formatted: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Decrease indent for closing tags
    if (line.startsWith('</') || line.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add the line with proper indentation
    formatted.push(' '.repeat(indentLevel * indentSize) + line);

    // Increase indent for opening tags (but not self-closing)
    if (line.startsWith('<') && !line.includes('/>') && !line.startsWith('</')) {
      indentLevel++;
    } else if (line.includes('{') && !line.includes('}')) {
      indentLevel++;
    }
  }

  return formatted.join('\n');
}

/**
 * Common JSX patterns for Mithril
 */
export const jsxPatterns = {
  conditionalRender: (condition: string, content: string) => 
    `{${condition} && (${content})}`,
    
  ternaryRender: (condition: string, trueContent: string, falseContent: string) =>
    `{${condition} ? (${trueContent}) : (${falseContent})}`,
    
  listRender: (array: string, itemVar: string, content: string, keyExpr: string = `${itemVar}.id`) =>
    `{${array}.map(${itemVar} => (<div key={${keyExpr}}>${content}</div>))}`,
    
  fragment: (content: string) => `<>${content}</>`,
  
  eventHandler: (event: string, handler: string) => `${event.toLowerCase()}={${handler}}`,
  
  formInput: (type: string, value: string, onChange: string) =>
    `<input type="${type}" value={${value}} oninput={${onChange}} />`
};

// Export everything as a single utility object
export const JsxUtils = {
  htmlToJsx,
  reactToMithrilJsx,
  generateJsxComponent,
  addKeysToJsxList,
  validateMithrilJsx,
  formatJsx,
  patterns: jsxPatterns
};

export default JsxUtils;