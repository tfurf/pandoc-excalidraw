import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const DIST_FILTER = path.join(ROOT, 'dist', 'filter.js');
const TSC_BIN = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const SIMPLE_FIXTURE = path.join(__dirname, 'fixtures', 'simple.excalidraw');

function hasPandoc(): boolean {
  try {
    execFileSync('pandoc', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureBuilt(): void {
  execFileSync(process.execPath, [TSC_BIN, '-p', path.join(ROOT, 'tsconfig.json')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  if (!fs.existsSync(DIST_FILTER)) {
    throw new Error('Build completed but dist/filter.js was not created');
  }
}

const describePandoc = hasPandoc() ? describe : describe.skip;

describePandoc('pandoc end-to-end', () => {
  jest.setTimeout(30000);

  let tempDir: string;

  beforeEach(() => {
    ensureBuilt();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pandoc-excalidraw-e2e-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders .excalidraw image to svg and rewrites output HTML image URL', () => {
    const diagramPath = path.join(tempDir, 'diagram.excalidraw');
    const markdownPath = path.join(tempDir, 'input.md');
    const htmlPath = path.join(tempDir, 'output.html');
    const svgPath = path.join(tempDir, 'diagram.svg');
    const wrapperPath = path.join(tempDir, 'pandoc-excalidraw');

    fs.copyFileSync(SIMPLE_FIXTURE, diagramPath);
    fs.writeFileSync(markdownPath, '![Sample](diagram.excalidraw)\n', 'utf8');

    fs.writeFileSync(
      wrapperPath,
      `#!/usr/bin/env sh\n"${process.execPath}" "${DIST_FILTER}" "$@"\n`,
      'utf8',
    );
    fs.chmodSync(wrapperPath, 0o755);

    execFileSync(
      'pandoc',
      ['--filter', wrapperPath, 'input.md', '-o', 'output.html'],
      { cwd: tempDir, stdio: 'inherit' },
    );

    expect(fs.existsSync(svgPath)).toBe(true);
    expect(fs.statSync(svgPath).size).toBeGreaterThan(0);

    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toContain('diagram.svg');
    expect(html).not.toContain('diagram.excalidraw');
  });
});