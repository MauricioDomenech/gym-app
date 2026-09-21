import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fail = message => { throw new Error(`[agent-config] ${message}`); };
const read = path => readFileSync(path, 'utf8');
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? files(path) : [path];
});
const descriptionLimit = 240; // Presupuesto editorial local, no límite de Codex.

function description(value, file) {
  if (!value?.trim() || value.length > descriptionLimit || /[\r\n<>]/.test(value)) {
    fail(`${file}: description debe tener 1–${descriptionLimit} caracteres en una línea`);
  }
}

// Comprueba el formato simple de estos perfiles; no pretende interpretar todo TOML.
export function readAgent(text, file) {
  const name = text.match(/^name = ("[^\n]+")$/m);
  const desc = text.match(/^description = ("[^\n]+")$/m);
  const body = text.match(/^developer_instructions = """\n([\s\S]*?)\n"""$/m);
  if (!name || !desc || !body || !body[1].trim()) fail(`${file}: perfil incompleto`);
  const rest = text.replace(name[0], '').replace(desc[0], '').replace(body[0], '').trim();
  if (rest || body[1].includes('"""')) fail(`${file}: campos duplicados o formato no admitido`);
  const result = { name: JSON.parse(name[1]), description: JSON.parse(desc[1]), instructions: body[1] };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.name)) fail(`${file}: name inválido`);
  description(result.description, file);
  return result;
}

export function validate(root) {
  const agentDir = join(root, '.codex/agents');
  const skillDir = join(root, '.codex/skills');
  const expected = ['abogado-del-diablo', 'fitness-coach', 'nutrition-recomp-coach'];
  const agentFiles = readdirSync(agentDir).filter(name => name.endsWith('.toml')).sort();
  if (JSON.stringify(agentFiles) !== JSON.stringify(expected.map(name => `${name}.toml`))) {
    fail('faltan perfiles o hay agentes inesperados');
  }
  const agents = new Map(agentFiles.map(file => {
    const agent = readAgent(read(join(agentDir, file)), file);
    if (file !== `${agent.name}.toml`) fail(`${file}: name no coincide con el archivo`);
    return [agent.name, agent];
  }));
  const markdown = files(skillDir).filter(path => path.endsWith('.md'));
  const skillFiles = markdown.filter(path => path.endsWith('/SKILL.md'));
  const skills = new Set();
  for (const file of skillFiles) {
    const text = read(file);
    const frontmatter = text.match(/^---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ("[^\n]+")\n---\n/);
    if (!frontmatter || !text.slice(frontmatter[0].length).trim()) fail(`${file}: skill incompleta`);
    const name = frontmatter[1];
    if (file !== join(skillDir, name, 'SKILL.md') || skills.has(name)) fail(`${file}: nombre o ubicación incorrectos`);
    description(JSON.parse(frontmatter[2]), file);
    skills.add(name);
  }
  if (!skills.size) fail('no hay skills');
  const legacy = join(root, '.agents/skills');
  if (existsSync(legacy) && files(legacy).some(file => file.endsWith('/SKILL.md'))) {
    fail('quedan skills duplicadas en .agents/skills');
  }
  for (const [name, agent] of agents) {
    const routes = [...agent.instructions.matchAll(/^- `([a-z0-9-]+)`:/gm)].map(match => match[1]);
    if (!routes.length) fail(`${name}: sin rutas de skills`);
    for (const skill of routes) if (!skills.has(skill)) fail(`${name}: skill inexistente ${skill}`);
    const memory = `.codex/agent-memory/${name}/MEMORY.md`;
    if (!agent.instructions.includes(memory) || !existsSync(join(root, memory))) fail(`${name}: referencia de memoria inválida`);
  }
  for (const file of [...markdown, join(root, 'AGENTS.md'), join(root, '.codex/README.md')]) {
    for (const [, target] of read(file).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^(https?:|#)/.test(target)) continue;
      const path = resolve(dirname(file), target.split('#')[0]);
      if (!existsSync(path) || !statSync(path).isFile()) fail(`${relative(root, file)}: enlace roto ${target}`);
    }
  }
  for (const name of expected) {
    const memory = join(root, '.codex/agent-memory', name, 'MEMORY.md');
    const text = read(memory);
    const updated = text.match(/^updated:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1];
    const date = new Date(`${updated}T00:00:00Z`);
    if (!updated || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== updated) {
      fail(`${memory}: fecha de revisión inválida`);
    }
    if (!/^status:\s*curated-index$/m.test(text)) fail(`${memory}: falta estado curated-index`);
  }
  const cases = JSON.parse(read(join(root, 'scripts/agent-evals.json')));
  if (!Array.isArray(cases) || !cases.length) fail('faltan casos de comportamiento');
  const ids = new Set();
  for (const test of cases) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(test.id) || ids.has(test.id)) fail(`id duplicado o inválido: ${test.id}`);
    ids.add(test.id);
    if (test.agent !== 'auto' && !agents.has(test.agent)) fail(`${test.id}: agente inexistente`);
    if (typeof test.prompt !== 'string' || !test.prompt.trim()) fail(`${test.id}: falta prompt`);
    if (!Array.isArray(test.criteria) || !test.criteria.length || test.criteria.some(item => typeof item !== 'string' || !item.trim())) {
      fail(`${test.id}: faltan criterios observables`);
    }
  }
  return { agents, skills, cases };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const args = process.argv.slice(2);
    if (args.some(arg => !['--cases', '--behavioral'].includes(arg)) || args.length > 1) fail('usa --cases o --behavioral');
    const result = validate(root);
    console.log(`OK estructural: ${result.agents.size} agentes, ${result.skills.size} skills, referencias y ${result.cases.length} casos definidos.`);
    if (args.includes('--cases')) console.log(JSON.stringify(result.cases, null, 2));
    else if (args.includes('--behavioral')) {
      const { runEvals } = await import('./run-agent-evals.mjs');
      await runEvals(root, result.cases);
    } else console.log('No se ha evaluado el comportamiento ni la seguridad semántica. Ejecuta --behavioral para capturar respuestas y revísalas con sus criterios.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
