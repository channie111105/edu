import React from 'react';

const WINDOWS_1252_CODEPOINT_TO_BYTE = new Map<number, number>([
  [0x20AC, 0x80],
  [0x201A, 0x82],
  [0x0192, 0x83],
  [0x201E, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02C6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8A],
  [0x2039, 0x8B],
  [0x0152, 0x8C],
  [0x017D, 0x8E],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02DC, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9A],
  [0x203A, 0x9B],
  [0x0153, 0x9C],
  [0x017E, 0x9E],
  [0x0178, 0x9F],
]);

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

const decodeUnicodeEscapeLiterals = (value: string): string => {
  if (!value || !value.includes('\\u')) return value;

  let current = value;
  for (let index = 0; index < 2; index += 1) {
    const decoded = current.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? match : String.fromCharCode(code);
    });

    if (decoded === current) break;
    current = decoded;
  }

  return current;
};

const toWindows1252Bytes = (value: string): Uint8Array | null => {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return null;

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mappedByte = WINDOWS_1252_CODEPOINT_TO_BYTE.get(codePoint);
    if (mappedByte === undefined) return null;
    bytes.push(mappedByte);
  }

  return Uint8Array.from(bytes);
};

const tryDecodeWindows1252Utf8 = (value: string): string | null => {
  if (!value) return null;

  const bytes = toWindows1252Bytes(value);
  if (!bytes) return null;

  try {
    return UTF8_DECODER.decode(bytes);
  } catch {
    return null;
  }
};

export const decodeMojibakeText = (value?: string): string => {
  let current = decodeUnicodeEscapeLiterals(value || '');

  for (let index = 0; index < 3; index += 1) {
    const cp1252Decoded = tryDecodeWindows1252Utf8(current);
    if (cp1252Decoded && cp1252Decoded !== current) {
      current = decodeUnicodeEscapeLiterals(cp1252Decoded);
      continue;
    }

    try {
      const decoded = decodeURIComponent(escape(current));
      if (!decoded || decoded === current) break;
      current = decodeUnicodeEscapeLiterals(decoded);
    } catch {
      break;
    }
  }

  return current;
};

const decodeValue = (value: unknown): unknown => {
  if (typeof value === 'string') return decodeMojibakeText(value);
  if (Array.isArray(value)) return value.map((item) => decodeValue(item));
  if (React.isValidElement(value)) return decodeMojibakeReactNode(value);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, decodeValue(nestedValue)])
    );
  }
  return value;
};

export const decodeMojibakeReactNode = (node: React.ReactNode): React.ReactNode => {
  if (typeof node === 'string') return decodeMojibakeText(node);
  if (Array.isArray(node)) return node.map((child) => decodeMojibakeReactNode(child));
  if (!React.isValidElement(node)) return node;

  const element = node as React.ReactElement<any>;
  const nextProps: Record<string, unknown> = {};

  Object.entries(element.props || {}).forEach(([key, value]) => {
    if (key === 'children') {
      nextProps.children = React.Children.map(value as React.ReactNode, (child) => decodeMojibakeReactNode(child));
      return;
    }

    nextProps[key] = decodeValue(value);
  });

  return React.cloneElement(element, nextProps);
};
