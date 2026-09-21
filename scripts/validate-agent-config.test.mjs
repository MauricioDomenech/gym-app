import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-agent-config.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('el validador detecta contratos estructurales rotos sin depender de frases clínicas', () => {
  const root = mkdtempSync(join(tmpdir(), 'gym-agent-validation-'));
  try {
    for (const directory of ['.codex/agents', '.codex/skills']) cpSync(join(source, directory), join(root, directory), { recursive: true });
    for (const file of ['AGENTS.md', '.codex/README.md', 'scripts/agent-evals.json', 'scripts/run-agent-evals.mjs', 'docs/resumen-skills-prompts-gpt-6-astra.md']) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      cpSync(join(source, file), join(root, file));
    }
    for (const name of ['fitness-coach', 'nutrition-recomp-coach', 'abogado-del-diablo']) {
      const directory = join(root, '.codex/agent-memory', name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, 'MEMORY.md'), '---\nupdated: 2026-09-13\nstatus: curated-index\n---\n');
    }
    assert.equal(validate(root).agents.size, 3);
    const rejects = (file, mutate, expected) => {
      const path = join(root, file);
      const before = readFileSync(path, 'utf8');
      writeFileSync(path, mutate(before));
      assert.throws(() => validate(root), expected);
      writeFileSync(path, before);
    };
    rejects('.codex/agents/fitness-coach.toml', text => text.replace('`disenar-rutina`:', '`skill-inexistente`:'), /skill inexistente/);
    rejects('.codex/agents/fitness-coach.toml', text => text.replace('name = "fitness-coach"', 'name = "otro-coach"'), /name no coincide/);
    rejects('.codex/agents/fitness-coach.toml', text => `${text}\nname = "duplicado"\n`, /duplicados/);
    rejects('.codex/agents/fitness-coach.toml', text => text.replace(/description = .*\n/, `description = "${'x'.repeat(241)}"\n`), /description/);
    rejects('.codex/skills/disenar-rutina/SKILL.md', text => text.replace('../periodizacion-deload/SKILL.md', '../inexistente/SKILL.md'), /enlace roto/);
    rejects('.codex/skills/disenar-rutina/SKILL.md', text => text.replace('name: disenar-rutina', 'name: otro-nombre'), /nombre o ubicación/);
    rejects('.codex/agent-memory/fitness-coach/MEMORY.md', text => text.replace('2026-09-13', '2026-02-31'), /fecha/);
    rejects('scripts/agent-evals.json', text => { const cases = JSON.parse(text); cases.push(cases[0]); return JSON.stringify(cases); }, /id duplicado/);
    rejects('scripts/agent-evals.json', text => { const cases = JSON.parse(text); cases[0].criteria = []; return JSON.stringify(cases); }, /criterios/);
    assert.equal(validate(root).agents.size, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('la captura usa una copia sin datos personales y no declara aprobado un JSON válido', async t => {
  t.mock.method(console, 'log', () => {});
  const { runEvals } = await import('./run-agent-evals.mjs');
  const directory = mkdtempSync(join(tmpdir(), 'gym-eval-executable-'));
  const executable = join(directory, 'codex-fixture');
  const previous = process.env.GYM_AGENT_EVAL_CODEX;
  let reportPath;
  try {
    writeFileSync(executable, `#!${process.execPath}
const fs = require('node:fs');
const assert = require('node:assert/strict');
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('fixture'); process.exit(0); }
assert.equal(args[args.indexOf('--model') + 1], 'gpt-6-astra');
assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
assert.equal(fs.existsSync('.codex/agent-memory'), false);
assert.equal(fs.existsSync('datos_actualizados'), false);
assert.equal(fs.existsSync('.env'), false);
assert.equal(fs.existsSync('AGENTS.md'), true);
let prompt = '';
process.stdin.on('data', chunk => { prompt += chunk; });
process.stdin.on('end', () => {
  assert.equal(prompt.includes('CRITERIO_OCULTO'), false);
  const response = { answer: 'Respuesta de prueba', selected_agents: [], selected_skills: [], needs_input: false };
  fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify(response));
});
`, { mode: 0o755 });
    process.env.GYM_AGENT_EVAL_CODEX = executable;
    reportPath = await runEvals(source, [{ id: 'fixture', agent: 'auto', prompt: 'Consulta sintética', criteria: ['CRITERIO_OCULTO'] }]);
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.status, 'pending_review');
    assert.equal(report.cases[0].verdict, 'pending_review');
    assert.equal(report.cases[0].response.answer, 'Respuesta de prueba');
    assert.equal(report.model, 'gpt-6-astra');
  } finally {
    if (previous === undefined) delete process.env.GYM_AGENT_EVAL_CODEX;
    else process.env.GYM_AGENT_EVAL_CODEX = previous;
    if (reportPath) rmSync(dirname(reportPath), { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});
