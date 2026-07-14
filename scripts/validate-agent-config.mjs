import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const agentDir = join(root, '.codex', 'agents');
const skillDir = join(root, '.codex', 'skills');
const legacySkillDir = join(root, '.agents', 'skills');
const evalPath = join(root, 'scripts', 'agent-evals.json');

const fail = message => {
  throw new Error(`[agent-config] ${message}`);
};

const files = directory => readdirSync(directory).filter(name =>
  statSync(join(directory, name)).isFile());

const containsSkillFile = directory => existsSync(directory) && readdirSync(directory).some(name => {
  const path = join(directory, name);
  return statSync(path).isDirectory()
    ? existsSync(join(path, 'SKILL.md'))
    : name === 'SKILL.md';
});

const agentFiles = files(agentDir).filter(name => name.endsWith('.toml'));
const expectedAgents = ['abogado-del-diablo.toml', 'fitness-coach.toml', 'nutrition-recomp-coach.toml'];
if (JSON.stringify(agentFiles.sort()) !== JSON.stringify(expectedAgents)) {
  fail(`agentes inesperados: ${agentFiles.join(', ')}`);
}

const agents = new Map();
for (const file of agentFiles) {
  const text = readFileSync(join(agentDir, file), 'utf8');
  const name = text.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  if (!name) fail(`${file} no declara name`);
  if (!text.includes('developer_instructions = """')) fail(`${file} no declara developer_instructions`);
  if (!text.includes('.codex/skills/')) fail(`${file} no enruta a skills repo-locales`);
  if (!text.includes('.codex/agent-memory/')) fail(`${file} no usa la memoria del proyecto`);
  if (text.includes('.Codex/') || text.includes('WebSearch') || text.includes('WebFetch')) {
    fail(`${file} contiene una referencia obsoleta`);
  }
  if (!text.includes('No actualices la memoria automáticamente.')) {
    fail(`${file} permite escribir memoria sin consentimiento explícito`);
  }
  agents.set(name, text);
}

const skillFiles = readdirSync(skillDir)
  .filter(name => statSync(join(skillDir, name)).isDirectory())
  .map(name => join(skillDir, name, 'SKILL.md'));
const skillNames = skillFiles.map(file => {
  const text = readFileSync(file, 'utf8');
  const name = text.match(/^name:\s*([^\n]+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  const description = text.match(/^description:\s*([^\n]+)$/m)?.[1];
  if (!name || !description) fail(`${file} no tiene frontmatter válido`);
  const expectedName = file.split('/').at(-2);
  if (name !== expectedName) fail(`${file} declara name=${name}, esperado=${expectedName}`);
  return name;
});
if (new Set(skillNames).size !== skillNames.length) fail('hay nombres de skills duplicados');
if (containsSkillFile(legacySkillDir)) fail('queda un SKILL.md en .agents/skills');

const evals = JSON.parse(readFileSync(evalPath, 'utf8'));
for (const test of evals) {
  const targets = test.agent === 'all' ? [...agents.keys()] : [test.agent];
  for (const target of targets) {
    const prompt = agents.get(target);
    if (!prompt) fail(`${test.id} apunta a un agente inexistente: ${target}`);
    for (const required of test.required) {
      if (!prompt.includes(required)) fail(`${test.id} no encuentra «${required}» en ${target}`);
    }
  }
}

const safety = {
  'dieta-inversa': ['opción conductual', 'Retorno directo a mantenimiento'],
  'poblaciones-especiales': ['individualizar', 'no imponer un objetivo universal'],
  'entrenar-con-lesiones': ['no diagnostica', 'dolor agudo']
};
for (const [skill, required] of Object.entries(safety)) {
  const text = readFileSync(join(skillDir, skill, 'SKILL.md'), 'utf8');
  for (const phrase of required) if (!text.includes(phrase)) fail(`${skill} no contiene «${phrase}»`);
}

const memoryRoot = join(root, '.codex', 'agent-memory');
for (const directory of readdirSync(memoryRoot)) {
  const memoryPath = join(memoryRoot, directory, 'MEMORY.md');
  if (!existsSync(memoryPath)) fail(`${directory} no tiene MEMORY.md`);
  const text = readFileSync(memoryPath, 'utf8');
  const updated = text.match(/^updated:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1];
  if (!updated || Number.isNaN(Date.parse(`${updated}T00:00:00Z`))) {
    fail(`${memoryPath} no tiene una fecha de revisión ISO válida`);
  }
  if (!/^status:\s*curated-index$/m.test(text)) fail(`${memoryPath} no tiene estado curado`);
  if (text.includes('44 years old') || text.includes('03/05/2026')) {
    fail(`${memoryPath} conserva un snapshot obsoleto en el índice`);
  }
}

console.log(`OK: ${agents.size} agentes, ${skillNames.length} skills y ${evals.length} evaluaciones estáticas`);
